import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import type { Investment, InvestmentReturn, InvestmentPayment } from '@/types/investment.types'

function enrich(inv: Investment & { investment_returns?: InvestmentReturn[]; investment_payments?: InvestmentPayment[] }): Investment {
  const returns: InvestmentReturn[] = inv.investment_returns ?? []
  const payments: InvestmentPayment[] = inv.investment_payments ?? []
  const total_returned = returns.reduce((s, r) => s + r.amount, 0)
  const total_paid = payments.reduce((s, p) => s + p.amount, 0)
  const committed = inv.committed_amount ?? 0
  const profit_loss = committed > 0 ? total_returned - committed : undefined
  const roi_percent = committed > 0 ? ((total_returned - committed) / committed) * 100 : undefined
  const { investment_returns: _r, investment_payments: _p, ...rest } = inv
  return { ...rest, returns, payments, total_returned, total_paid, profit_loss, roi_percent }
}

export function useInvestments() {
  const userId = useAuthStore((s) => s.user?.id)

  return useQuery({
    queryKey: ['investments', userId],
    enabled: !!userId,
    queryFn: async (): Promise<Investment[]> => {
      const { data, error } = await supabase
        .from('investments')
        .select('*, investment_returns(*), investment_payments(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(enrich)
    },
  })
}

export function useCreateInvestment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'returns' | 'total_returned' | 'roi_percent' | 'profit_loss'>) => {
      const { data: row, error } = await supabase
        .from('investments')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Investment added' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useUpdateInvestment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Investment> & { id: string }) => {
      const { data: row, error } = await supabase
        .from('investments')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId!)
        .select()
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Investment updated' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useDeleteInvestment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Investment deleted' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useCreateReturn() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: Omit<InvestmentReturn, 'id' | 'user_id' | 'created_at'>) => {
      const { data: row, error } = await supabase
        .from('investment_returns')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row as InvestmentReturn
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Return logged' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useCreateInvestmentPayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: { investment_id: string; amount: number; payment_date: string; payment_method?: string | null; account?: string | null; notes: string | null }) => {
      const { data: row, error } = await supabase
        .from('investment_payments')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Payment logged' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useUpdateInvestmentPayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; amount?: number; payment_date?: string; notes?: string | null }) => {
      const { data: row, error } = await supabase
        .from('investment_payments')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId!)
        .select()
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Payment updated' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useUpdateReturn() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InvestmentReturn> & { id: string }) => {
      const { data: row, error } = await supabase
        .from('investment_returns')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId!)
        .select()
        .single()
      if (error) throw error
      return row as InvestmentReturn
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Return updated' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useDeleteInvestmentPayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investment_payments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Payment deleted' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useDeleteReturn() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('investment_returns')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      addToast({ type: 'success', message: 'Return deleted' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}
