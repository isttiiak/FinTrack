import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'
import type { Investment, InvestmentReturn, InvestmentPayment } from '@/types/investment.types'
import { toastWithUndo } from '@/lib/undo'
import { investmentPosition } from '@/lib/investmentAnalytics'

function enrich(inv: Investment & { investment_returns?: InvestmentReturn[]; investment_payments?: InvestmentPayment[] }): Investment {
  const returns: InvestmentReturn[] = inv.investment_returns ?? []
  const payments: InvestmentPayment[] = inv.investment_payments ?? []
  const total_returned = returns.reduce((s, r) => s + r.amount, 0)
  const total_paid = payments.reduce((s, p) => s + p.amount, 0)
  const { investment_returns: _r, investment_payments: _p, ...rest } = inv
  const base = { ...rest, returns, payments, total_returned, total_paid }
  // P&L counts what you put in, what came back AND what it's worth now —
  // see investmentPosition. (It used to be returned − committed, which read
  // as a near-total loss for anything that hadn't paid out in cash yet.)
  const pos = investmentPosition(base)
  return {
    ...base,
    invested: pos.invested,
    current_value: pos.currentValue,
    value_is_estimate: pos.valueIsEstimate,
    profit_loss: pos.invested > 0 ? pos.profit : undefined,
    roi_percent: pos.roi != null ? pos.roi * 100 : undefined,
  }
}

export function useInvestments() {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoInvestments = useDemoStore((s) => s.investments)
  const demoReturns = useDemoStore((s) => s.investmentReturns)
  const demoPayments = useDemoStore((s) => s.investmentPayments)

  return useQuery({
    queryKey: ['investments', userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<Investment[]> => {
      if (isDemo) {
        return demoInvestments.map((inv) => enrich({
          ...inv,
          investment_returns: demoReturns.filter((r) => r.investment_id === inv.id),
          investment_payments: demoPayments.filter((p) => p.investment_id === inv.id),
        }))
      }

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
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (data: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'returns' | 'total_returned' | 'roi_percent' | 'profit_loss' | 'invested' | 'current_value' | 'value_is_estimate'>) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdateInvestment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Investment> & { id: string }) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteInvestment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useCreateReturn() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (data: Omit<InvestmentReturn, 'id' | 'user_id' | 'created_at'>) => {
      guardDemo()
      const { data: row, error } = await supabase
        .from('investment_returns')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row as InvestmentReturn
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      toastWithUndo(addToast, 'Return logged', async () => {
        const { error } = await supabase.from('investment_returns').delete().eq('id', created.id).eq('user_id', userId!)
        if (error) throw error
        qc.invalidateQueries({ queryKey: ['investments'] })
      }, 'Return removed')
    },
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useCreateInvestmentPayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (data: { investment_id: string; amount: number; payment_date: string; payment_method?: string | null; account?: string | null; notes: string | null }) => {
      guardDemo()
      const { data: row, error } = await supabase
        .from('investment_payments')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row as InvestmentPayment
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['investments'] })
      toastWithUndo(addToast, 'Payment logged', async () => {
        const { error } = await supabase.from('investment_payments').delete().eq('id', created.id).eq('user_id', userId!)
        if (error) throw error
        qc.invalidateQueries({ queryKey: ['investments'] })
      }, 'Payment removed')
    },
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdateInvestmentPayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Omit<InvestmentPayment, 'id' | 'user_id' | 'created_at' | 'investment_id'>> & { id: string }) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdateReturn() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InvestmentReturn> & { id: string }) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteInvestmentPayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteReturn() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}
