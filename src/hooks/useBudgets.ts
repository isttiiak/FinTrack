import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '@/lib/supabase'
import { carryoverAmount, previousMonthRange } from '@/lib/budgetRollover'
import { round2, toISODateString } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'
import type { BudgetLimit } from '@/types/expense.types'

export type BudgetWithLimit = BudgetLimit & { carryover: number; effective_limit: number }

// Budgets for one month ('YYYY-MM', default: this month), each with the
// limit that applies to it: base limit plus any rollover from the month
// before (lib/budgetRollover.ts). Every screen that compares spending with
// a budget should read effective_limit, not monthly_limit.
export function useBudgets(month: string = toISODateString(new Date()).slice(0, 7)) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['budgets', userId, month],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<BudgetWithLimit[]> => {
      if (isDemo) return []
      const { data, error } = await supabase
        .from('budget_limits')
        .select('*, category:categories(*)')
        .eq('user_id', userId!)
      if (error) throw error
      const budgets = (data ?? []) as BudgetLimit[]

      const monthStart = `${month}-01`
      const rolling = budgets.filter((b) => b.rollover && b.created_at.slice(0, 10) < monthStart)
      const lastMonthSpent = new Map<string, number>()
      if (rolling.length > 0) {
        const { from, to } = previousMonthRange(month)
        const rows = await fetchAllRows<{ category_id: string; amount: number }>((f, t) =>
          supabase
            .from('transactions')
            .select('category_id, amount')
            .eq('user_id', userId!)
            .eq('type', 'Expense')
            .in('category_id', rolling.map((b) => b.category_id))
            .gte('txn_date', from)
            .lte('txn_date', to)
            .order('id')
            .range(f, t),
        )
        for (const r of rows) lastMonthSpent.set(r.category_id, (lastMonthSpent.get(r.category_id) ?? 0) + Number(r.amount))
      }

      return budgets.map((b) => {
        const carryover = carryoverAmount({
          rollover: b.rollover,
          monthlyLimit: b.monthly_limit,
          lastMonthSpent: lastMonthSpent.get(b.category_id) ?? 0,
          createdAt: b.created_at,
          monthStart,
        })
        return { ...b, carryover, effective_limit: round2(b.monthly_limit + carryover) }
      })
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ category_id, monthly_limit, rollover }: { category_id: string; monthly_limit: number; rollover?: boolean }) => {
      guardDemo()
      // rollover only sent when set, so saving a plain budget still works on a
      // database that hasn't run 017_budget_rollover.sql yet
      const row = { user_id: userId!, category_id, monthly_limit, ...(rollover !== undefined && { rollover }) }
      const { data, error } = await supabase
        .from('budget_limits')
        .upsert(row, { onConflict: 'user_id,category_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
      const { error } = await supabase
        .from('budget_limits')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}
