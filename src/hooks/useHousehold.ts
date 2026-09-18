import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'
import { DEMO_HOUSEHOLD, DEMO_MEMBER_ID } from '@/lib/demoHousehold'
import type {
  Household, HouseholdDetail, HouseholdMember, HouseholdSettlement, SharedExpense, SharedExpenseInput,
} from '@/types/household.types'

// Households are read-only in demo mode (mutations hit useDemoGuard).

export function useHouseholds() {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['households', userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<Household[]> => {
      if (isDemo) return [DEMO_HOUSEHOLD.household]
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
    queryKey: ['household', userId, householdId],
    enabled: !!householdId && (isDemo || !!userId),
    queryFn: async (): Promise<HouseholdDetail> => {
      if (isDemo) return DEMO_HOUSEHOLD

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

function useMutationBase<TVars>(
  fn: (vars: TVars, ctx: { userId: string | undefined }) => Promise<unknown>,
  success: string | null,
) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (vars: TVars) => {
      guardDemo()
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
  )
}

export function useDeleteSharedExpense() {
  return useMutationBase(
    async (v: { id: string; household_id: string }) => {
      const { error } = await supabase.from('shared_expenses').delete().eq('id', v.id)
      if (error) throw error
    },
    'Expense deleted',
  )
}

export function useAddSettlement() {
  return useMutationBase(
    async (v: Omit<HouseholdSettlement, 'id' | 'created_by' | 'created_at'>, { userId }) => {
      const { error } = await supabase.from('household_settlements').insert({ ...v, created_by: userId })
      if (error) throw error
    },
    'Payment recorded',
  )
}

export function useDeleteSettlement() {
  return useMutationBase(
    async (v: { id: string; household_id: string }) => {
      const { error } = await supabase.from('household_settlements').delete().eq('id', v.id)
      if (error) throw error
    },
    'Payment removed',
  )
}

export function useAddMember() {
  return useMutationBase(
    async (v: { household_id: string; name: string }) => {
      const { error } = await supabase.from('household_members').insert({ household_id: v.household_id, name: v.name.trim() })
      if (error) throw error
    },
    'Member added',
  )
}

export function useRemoveMember() {
  return useMutationBase(
    async (v: { id: string; household_id: string }) => {
      const { error } = await supabase.from('household_members').delete().eq('id', v.id)
      if (error) throw error
    },
    'Member removed',
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
  )
}

export function useDeleteHousehold() {
  return useMutationBase(
    async (v: { household_id: string }) => {
      const { error } = await supabase.from('households').delete().eq('id', v.household_id)
      if (error) throw error
    },
    'Household deleted',
  )
}
