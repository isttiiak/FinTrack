import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import type { Transaction, TransactionFilters } from '@/types/expense.types'
import { resolveDateRange } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'
import { toastWithUndo } from '@/lib/undo'

export function useExpenses(filters?: TransactionFilters) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  const { from, to } = resolveDateRange(filters)

  return useQuery({
    queryKey: ['expenses', userId, filters, from, to],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<Transaction[]> => {
      if (isDemo) {
        // Read the store at fetch time, not from this render's closure — a
        // refetch fired right after a demo add/remove (e.g. Undo) would
        // otherwise still see the old list.
        let txns = useDemoStore.getState().transactions
        if (from) txns = txns.filter((t) => t.txn_date >= from)
        if (to)   txns = txns.filter((t) => t.txn_date <= to)
        if (filters?.type && filters.type !== 'All') txns = txns.filter((t) => t.type === filters.type)
        if (filters?.category_ids?.length) txns = txns.filter((t) => t.category_id && filters.category_ids!.includes(t.category_id))
        if (filters?.payment_method && filters.payment_method !== 'All') txns = txns.filter((t) => t.payment_method === filters.payment_method)
        if (filters?.min_amount !== undefined) txns = txns.filter((t) => t.amount >= filters.min_amount!)
        if (filters?.max_amount !== undefined) txns = txns.filter((t) => t.amount <= filters.max_amount!)
        if (filters?.search?.trim()) {
          const q = filters.search.trim().toLowerCase()
          txns = txns.filter((t) => t.description?.toLowerCase().includes(q))
        }
        return [...txns].sort((a, b) => b.txn_date.localeCompare(a.txn_date))
      }

      let query = supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('user_id', userId!)
        .order('txn_date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id') // stable tiebreaker — needed so paginated .range() calls can't skip/duplicate rows that tie on the columns above

      if (from) query = query.gte('txn_date', from)
      if (to)   query = query.lte('txn_date', to)
      if (filters?.type && filters.type !== 'All') query = query.eq('type', filters.type)
      if (filters?.category_ids?.length) query = query.in('category_id', filters.category_ids)
      if (filters?.payment_method && filters.payment_method !== 'All') query = query.eq('payment_method', filters.payment_method)
      if (filters?.min_amount !== undefined) query = query.gte('amount', filters.min_amount)
      if (filters?.max_amount !== undefined) query = query.lte('amount', filters.max_amount)
      if (filters?.search?.trim()) query = query.ilike('description', `%${filters.search.trim()}%`)

      // PostgREST caps responses at 1,000 rows by default — page through it
      // rather than awaiting `query` directly, or a long-history "all time"
      // fetch (Dashboard/AIHub/AnalyticsPage all call this hook that way)
      // silently truncates. See TODO.md §3.1.
      return await fetchAllRows<Transaction>((f, t) => query.range(f, t))
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoCategories = useDemoStore((s) => s.categories)
  const addDemoTransaction = useDemoStore((s) => s.addTransaction)
  const removeDemoTransaction = useDemoStore((s) => s.removeTransaction)
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
    onSuccess: (created: Transaction) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      toastWithUndo(addToast, 'Transaction saved', async () => {
        if (isDemo) {
          removeDemoTransaction(created.id)
        } else {
          const { error } = await supabase.from('transactions').delete().eq('id', created.id).eq('user_id', userId!)
          if (error) throw error
        }
        qc.invalidateQueries({ queryKey: ['expenses'] })
      }, 'Transaction removed')
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
    // Snapshot the row from the cache first, so the success toast can offer
    // to put the old values back
    onMutate: ({ id }: Partial<Transaction> & { id: string }) => {
      for (const [, rows] of qc.getQueriesData<Transaction[]>({ queryKey: ['expenses'] })) {
        const found = rows?.find((t) => t.id === id)
        if (found) return { previous: found }
      }
      return { previous: undefined as Transaction | undefined }
    },
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
    onSuccess: (_row, _vars, ctx) => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      const prev = ctx?.previous
      if (!prev) { addToast({ type: 'success', message: 'Transaction updated' }); return }
      toastWithUndo(addToast, 'Transaction updated', async () => {
        const { error } = await supabase
          .from('transactions')
          .update({
            type: prev.type, amount: prev.amount, category_id: prev.category_id, description: prev.description,
            txn_date: prev.txn_date, payment_method: prev.payment_method, account: prev.account,
          })
          .eq('id', prev.id)
          .eq('user_id', userId!)
        if (error) throw error
        qc.invalidateQueries({ queryKey: ['expenses'] })
      }, 'Change undone')
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
