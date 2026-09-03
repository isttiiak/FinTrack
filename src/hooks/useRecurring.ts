import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'
import { getDueOccurrences } from '@/lib/recurring'
import type { RecurringRule, RecurringRuleFormData } from '@/types/recurring.types'
import type { Transaction } from '@/types/expense.types'

export function useRecurringRules() {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoRules = useDemoStore((s) => s.recurringRules)

  return useQuery({
    queryKey: ['recurring_rules', userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<RecurringRule[]> => {
      if (isDemo) return demoRules

      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*, category:categories(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as RecurringRule[]
    },
  })
}

export function useCreateRecurringRule() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    // last_materialized_date defaults to null (never materialized) unless the
    // caller already knows the first occurrence exists as a transaction —
    // see ExpenseForm's "Make recurring" toggle, which passes the just-saved
    // transaction's own date so it isn't immediately re-materialized.
    mutationFn: async (data: RecurringRuleFormData & { last_materialized_date?: string | null }) => {
      guardDemo()
      const { last_materialized_date, ...rule } = data
      const { data: row, error } = await supabase
        .from('recurring_rules')
        .insert({
          ...rule,
          description: rule.description ?? null,
          end_date: rule.end_date ?? null,
          payment_method: rule.payment_method ?? null,
          account: rule.account ?? null,
          last_materialized_date: last_materialized_date ?? null,
          user_id: userId!,
        })
        .select('*, category:categories(*)')
        .single()
      if (error) throw error
      return row
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['recurring_rules'] })
      // "Make recurring" on ExpenseForm creates the rule silently alongside
      // the transaction's own save toast — a second toast would be noise.
      if (!variables.last_materialized_date) {
        addToast({ type: 'success', message: 'Recurring rule added' })
      }
    },
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdateRecurringRule() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringRule> & { id: string }) => {
      guardDemo()
      const { data: row, error } = await supabase
        .from('recurring_rules')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId!)
        .select('*, category:categories(*)')
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring_rules'] })
    },
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteRecurringRule() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
      const { error } = await supabase
        .from('recurring_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring_rules'] })
      addToast({ type: 'success', message: 'Recurring rule deleted' })
    },
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

interface MaterializeResult {
  count: number
  undo: () => Promise<void>
}

// Not a useMutation — this runs once on app open (DashboardPage), not from a
// form, and its "undo" needs to revert two different tables together
// (delete the generated transactions, roll back each rule's
// last_materialized_date), which doesn't fit react-query's single-mutation
// shape.
export function useMaterializeRecurring() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  async function materialize(): Promise<MaterializeResult | null> {
    // Demo mode's recurring rules are static seed data with no real table to
    // write to — every other mutation in demo mode is already read-only via
    // useDemoGuard, materialization is the same story, just triggered
    // automatically instead of from a button.
    if (isDemo || !userId) return null

    const { data: rules, error: rulesErr } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    if (rulesErr || !rules?.length) return null

    const today = new Date()
    const inserts: Omit<Transaction, 'id' | 'created_at' | 'category'>[] = []
    const ruleUpdates: { id: string; previous: string | null; next: string }[] = []

    for (const rule of rules as RecurringRule[]) {
      const due = getDueOccurrences(rule, today)
      if (due.length === 0) continue
      for (const txn_date of due) {
        inserts.push({
          user_id: userId,
          category_id: rule.category_id,
          txn_date,
          type: rule.type,
          amount: rule.amount,
          description: rule.description,
          payment_method: rule.payment_method,
          account: rule.account,
        })
      }
      ruleUpdates.push({ id: rule.id, previous: rule.last_materialized_date, next: due[due.length - 1] })
    }

    if (inserts.length === 0) return null

    const { data: created, error: insertErr } = await supabase
      .from('transactions')
      .insert(inserts)
      .select('id')
    if (insertErr || !created) return null

    await Promise.all(
      ruleUpdates.map(({ id, next }) =>
        supabase.from('recurring_rules').update({ last_materialized_date: next }).eq('id', id),
      ),
    )

    qc.invalidateQueries({ queryKey: ['expenses'] })
    qc.invalidateQueries({ queryKey: ['recurring_rules'] })

    const createdIds = created.map((t) => t.id as string)

    return {
      count: createdIds.length,
      undo: async () => {
        await supabase.from('transactions').delete().in('id', createdIds)
        await Promise.all(
          ruleUpdates.map(({ id, previous }) =>
            supabase.from('recurring_rules').update({ last_materialized_date: previous }).eq('id', id),
          ),
        )
        qc.invalidateQueries({ queryKey: ['expenses'] })
        qc.invalidateQueries({ queryKey: ['recurring_rules'] })
      },
    }
  }

  return { materialize }
}
