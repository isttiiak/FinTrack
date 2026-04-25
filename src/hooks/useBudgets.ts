import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import type { BudgetLimit } from '@/types/expense.types'

export function useBudgets() {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['budgets', userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<BudgetLimit[]> => {
      if (isDemo) return []
      const { data, error } = await supabase
        .from('budget_limits')
        .select('*, category:categories(*)')
        .eq('user_id', userId!)
      if (error) throw error
      return (data ?? []) as BudgetLimit[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  return useMutation({
    mutationFn: async ({ category_id, monthly_limit }: { category_id: string; monthly_limit: number }) => {
      const { data, error } = await supabase
        .from('budget_limits')
        .upsert({ user_id: userId!, category_id, monthly_limit }, { onConflict: 'user_id,category_id' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_limits')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })
}
