import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'
import { DEMO_MEMBER_ID } from '@/lib/demoHousehold'
import type {
  Household, HouseholdDetail, HouseholdMember, HouseholdSettlement, SharedExpense, SharedExpenseInput,
} from '@/types/household.types'

// Demo mode households run in memory via useDemoStore; invite joining still
// requires a signed-in account.

export function useHouseholds() {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['households', userId, isDemo],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<Household[]> => {
      if (isDemo) return Object.values(useDemoStore.getState().households).map((d) => d.household)
      const { data, error } = await supabase.from('households').select('*').order('created_at')
      if (error) throw error
      return (data ?? []) as Household[]
    },
  })
}

export function useHouseholdDetail(householdId: string | null) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['household', userId, isDemo, householdId],
    enabled: !!householdId && (isDemo || !!userId),
    queryFn: async (): Promise<HouseholdDetail | null> => {
      if (isDemo) return useDemoStore.getState().households[householdId!] ?? null

      const id = householdId!
      const [household, members, expenses, settlements] = await Promise.all([
        supabase.from('households').select('*').eq('id', id).single(),
        supabase.from('household_members').select('*').eq('household_id', id).order('created_at'),
        fetchAllRows<SharedExpense>((f, t) =>
          supabase
            .from('shared_expenses')
            .select('*, splits:shared_expense_splits(member_id, share)')
            .eq('household_id', id)
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id')
            .range(f, t),
        ),
        fetchAllRows<HouseholdSettlement>((f, t) =>
          supabase
            .from('household_settlements')
            .select('*')
            .eq('household_id', id)
            .order('settled_on', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id')
            .range(f, t),
        ),
      ])
      if (household.error) throw household.error
      if (members.error) throw members.error

      // numeric columns are safest coerced explicitly
      return {
        household: household.data as Household,
        members: (members.data ?? []) as HouseholdMember[],
        expenses: expenses.map((e) => ({
          ...e,
          amount: Number(e.amount),
          splits: (e.splits ?? []).map((s) => ({ member_id: s.member_id, share: Number(s.share) })),
        })),
        settlements: settlements.map((s) => ({ ...s, amount: Number(s.amount) })),
      }
    },
  })
}

// The member row that is the signed-in user, if any.
export function useMyMemberId(members: HouseholdMember[] | undefined): string | null {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  if (isDemo) return DEMO_MEMBER_ID
  return members?.find((m) => m.user_id === userId)?.id ?? null
}

// True when the tables don't exist yet — a self-hosted instance that hasn't
// run migration 012. Lets the page explain that instead of a bare error.
export function isHouseholdSchemaMissing(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message ?? ''
  return /households|household_members|schema cache/i.test(msg) && /could not find|does not exist|schema cache/i.test(msg)
}

// Household data is small and tightly coupled (balances depend on every
// expense and settlement), so any write refreshes the whole household view.
function refresh(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['households'] })
  qc.invalidateQueries({ queryKey: ['household'] })
}

function friendly(err: { message?: string; code?: string }): string {
  // FK RESTRICT: a member who appears in expenses/settlements can't be removed
  if (err.code === '23503') return 'That person appears in existing expenses or payments, so they can’t be removed.'
  return err.message ?? 'Something went wrong'
}

function useMutationBase<TVars, TResult = unknown>(
  fn: (vars: TVars, ctx: { userId: string | undefined }) => Promise<TResult>,
  success: string | null,
  demoFn?: (vars: TVars) => Promise<TResult> | TResult,
) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (vars: TVars) => {
      if (useDemoStore.getState().isDemo) {
        if (demoFn) return await demoFn(vars)
        guardDemo()
      }
      return fn(vars, { userId })
    },
    onSuccess: () => {
      refresh(qc)
      if (success) addToast({ type: 'success', message: success })
    },
    onError: (err: Error & { code?: string }) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: friendly(err) })
    },
  })
}

export function useCreateHousehold() {
  return useMutationBase(
    async (v: { name: string; currency: string }) => {
      const { data, error } = await supabase.rpc('create_household', { p_name: v.name, p_currency: v.currency })
      if (error) throw error
      return data as string
    },
    'Household created',
    (v) => useDemoStore.getState().createHousehold(v),
  )
}

export function useJoinHousehold() {
  return useMutationBase(
    async (v: { code: string; memberId?: string | null }) => {
      const { data, error } = await supabase.rpc('join_household', { p_invite_code: v.code, p_member_id: v.memberId ?? null })
      if (error) throw error
      return data as string
    },
    'Joined household',
  )
}

// Looks up an invite code: the household's name plus any named placeholders
// the joiner could claim. A plain function (not a hook) — it's a one-off call
// from the join form, not cached state.
export async function lookupInvite(code: string): Promise<{ name: string; members: { id: string; name: string }[] }> {
  const { data, error } = await supabase.rpc('household_claimables', { p_invite_code: code.trim() })
  if (error) throw error
  return data as { name: string; members: { id: string; name: string }[] }
}

export function useSaveSharedExpense() {
  return useMutationBase(
    async (v: SharedExpenseInput) => {
      const { data, error } = await supabase.rpc('save_shared_expense', {
        p_expense_id: v.id ?? null,
        p_household_id: v.household_id,
        p_paid_by: v.paid_by,
        p_amount: v.amount,
        p_description: v.description,
        p_category: v.category,
        p_date: v.expense_date,
        p_notes: v.notes,
        p_splits: v.splits,
      })
      if (error) throw error
      return data as string
    },
    'Expense saved',
    (v) => useDemoStore.getState().saveSharedExpense(v),
  )
}

export function useDeleteSharedExpense() {
  return useMutationBase(
    async (v: { id: string; household_id: string }) => {
      const { error } = await supabase.from('shared_expenses').delete().eq('id', v.id)
      if (error) throw error
    },
    'Expense deleted',
    (v) => useDemoStore.getState().deleteSharedExpense({ id: v.id, householdId: v.household_id }),
  )
}

export function useAddSettlement() {
  return useMutationBase(
    async (v: Omit<HouseholdSettlement, 'id' | 'created_by' | 'created_at'> & { id?: string }, { userId }) => {
      if (v.id) {
        const { id, ...fields } = v
        const { error } = await supabase.from('household_settlements').update(fields).eq('id', id)
        if (error) throw error
        return
      }
      const { error } = await supabase.from('household_settlements').insert({ ...v, created_by: userId })
      if (error) throw error
    },
    'Payment saved',
    (v) => useDemoStore.getState().saveSettlement(v),
  )
}

export function useDeleteSettlement() {
  return useMutationBase(
    async (v: { id: string; household_id: string }) => {
      const { error } = await supabase.from('household_settlements').delete().eq('id', v.id)
      if (error) throw error
    },
    'Payment removed',
    (v) => useDemoStore.getState().deleteSettlement({ id: v.id, householdId: v.household_id }),
  )
}

export function useAddMember() {
  return useMutationBase(
    async (v: { household_id: string; name: string }) => {
      const { error } = await supabase.from('household_members').insert({ household_id: v.household_id, name: v.name.trim() })
      if (error) throw error
    },
    'Member added',
    (v) => useDemoStore.getState().addHouseholdMember({ householdId: v.household_id, name: v.name }),
  )
}

export function useRemoveMember() {
  return useMutationBase(
    async (v: { id: string; household_id: string }) => {
      const { error } = await supabase.from('household_members').delete().eq('id', v.id)
      if (error) throw error
    },
    'Member removed',
    (v) => useDemoStore.getState().removeHouseholdMember({ id: v.id, householdId: v.household_id }),
  )
}

export function useRotateInviteCode() {
  return useMutationBase(
    async (v: { household_id: string }) => {
      const code = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      const { error } = await supabase.from('households').update({ invite_code: code }).eq('id', v.household_id)
      if (error) throw error
    },
    'Invite code replaced — the old one no longer works',
    (v) => { useDemoStore.getState().rotateHouseholdInviteCode(v.household_id) },
  )
}

export function useDeleteHousehold() {
  return useMutationBase(
    async (v: { household_id: string }) => {
      const { error } = await supabase.from('households').delete().eq('id', v.household_id)
      if (error) throw error
    },
    'Household deleted',
    (v) => useDemoStore.getState().deleteHousehold(v.household_id),
  )
}
