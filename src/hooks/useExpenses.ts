import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import type { Transaction, TransactionFilters } from '@/types/expense.types'
import { getCurrentMonthRange } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'

export function useExpenses(filters?: TransactionFilters) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoTransactions = useDemoStore((s) => s.transactions)

  const { from, to } = filters ?? getCurrentMonthRange()

  return useQuery({
    queryKey: ['expenses', userId, filters],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<Transaction[]> => {
      if (isDemo) {
        let txns = demoTransactions
        if (from) txns = txns.filter((t) => t.txn_date >= from)
        if (to)   txns = txns.filter((t) => t.txn_date <= to)
        if (filters?.type && filters.type !== 'All') txns = txns.filter((t) => t.type === filters.type)
        if (filters?.category_ids?.length) txns = txns.filter((t) => t.category_id && filters.category_ids!.includes(t.category_id))
        if (filters?.payment_method && filters.payment_method !== 'All') txns = txns.filter((t) => t.payment_method === filters.payment_method)
        return [...txns].sort((a, b) => b.txn_date.localeCompare(a.txn_date))
      }

      let query = supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', userId!)
        .order('txn_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (from) query = query.gte('txn_date', from)
      if (to)   query = query.lte('txn_date', to)
      if (filters?.type && filters.type !== 'All') query = query.eq('type', filters.type)
      if (filters?.category_ids?.length) query = query.in('category_id', filters.category_ids)
      if (filters?.payment_method && filters.payment_method !== 'All') query = query.eq('payment_method', filters.payment_method)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as Transaction[]
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoCategories = useDemoStore((s) => s.categories)
  const addDemoTransaction = useDemoStore((s) => s.addTransaction)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (txn: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'category'>) => {
      if (isDemo) {
        // The one demo-mode mutation that actually persists (in-memory) —
        // see the comment on demoStore's addTransaction for why.
        const created: Transaction = {
          ...txn,
          id: `demo-${Date.now()}`,
          user_id: 'demo',
          created_at: new Date().toISOString(),
          category: demoCategories.find((c) => c.id === txn.category_id) ?? null,
        }
        addDemoTransaction(created)
        return created
      }
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...txn, user_id: userId! })
        .select('*, category:categories(*)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      addToast({ type: 'success', message: 'Transaction saved' })
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...txn }: Partial<Transaction> & { id: string }) => {
      guardDemo()
      const { data, error } = await supabase
        .from('transactions')
        .update(txn)
        .eq('id', id)
        .eq('user_id', userId!)
        .select('*, category:categories(*)')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      addToast({ type: 'success', message: 'Transaction updated' })
    },
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}
