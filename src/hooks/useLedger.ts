import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import type { Person, PersonLedger, LedgerPayment, PersonWithLedgers } from '@/types/ledger.types'

// ── Status helper ────────────────────────────────────────────────────────
function computeEnriched(
  entry: Omit<PersonLedger, 'paid_amount' | 'remaining' | 'status'>,
  payments: LedgerPayment[],
): PersonLedger {
  const paid = payments.reduce((s, p) => s + p.amount, 0)
  const remaining = Math.max(0, entry.total_amount - paid)
  return {
    ...entry,
    payments,
    paid_amount: paid,
    remaining,
    status: remaining === 0 ? 'Settled' : paid > 0 ? 'Partial' : 'Pending',
  }
}

// ── usePersons ───────────────────────────────────────────────────────────
export function usePersons() {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoPersons = useDemoStore((s) => s.persons)
  const demoLedgers = useDemoStore((s) => s.ledgers)

  return useQuery({
    queryKey: ['persons', userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<PersonWithLedgers[]> => {
      if (isDemo) {
        return demoPersons.map((p) => {
          const pLedgers = demoLedgers.filter((l) => l.person_id === p.id)
          const lent = pLedgers.filter((l) => l.ledger_type === 'Lent')
          const debt = pLedgers.filter((l) => l.ledger_type === 'Debt')
          return {
            ...p,
            ledgers: pLedgers,
            total_lent: lent.reduce((s, l) => s + l.total_amount, 0),
            total_debt: debt.reduce((s, l) => s + l.total_amount, 0),
            total_outstanding_lent: lent
              .filter((l) => l.status !== 'Settled')
              .reduce((s, l) => s + (l.remaining ?? l.total_amount), 0),
            total_outstanding_debt: debt
              .filter((l) => l.status !== 'Settled')
              .reduce((s, l) => s + (l.remaining ?? l.total_amount), 0),
          }
        })
      }

      const { data: persons, error: pErr } = await supabase
        .from('persons')
        .select('*')
        .eq('user_id', userId!)
        .order('name')
      if (pErr) throw pErr

      const { data: rawLedgers, error: lErr } = await supabase
        .from('person_ledger')
        .select('*, ledger_payments(*)')
        .eq('user_id', userId!)
        .order('start_date', { ascending: false })
      if (lErr) throw lErr

      return (persons ?? []).map((p) => {
        const pLedgers: PersonLedger[] = (rawLedgers ?? [])
          .filter((l) => l.person_id === p.id)
          .map((l) => {
            const payments: LedgerPayment[] = l.ledger_payments ?? []
            return computeEnriched(l, payments)
          })

        const lent = pLedgers.filter((l) => l.ledger_type === 'Lent')
        const debt = pLedgers.filter((l) => l.ledger_type === 'Debt')

        return {
          ...p,
          ledgers: pLedgers,
          total_lent: lent.reduce((s, l) => s + l.total_amount, 0),
          total_debt: debt.reduce((s, l) => s + l.total_amount, 0),
          total_outstanding_lent: lent
            .filter((l) => l.status !== 'Settled')
            .reduce((s, l) => s + (l.remaining ?? 0), 0),
          total_outstanding_debt: debt
            .filter((l) => l.status !== 'Settled')
            .reduce((s, l) => s + (l.remaining ?? 0), 0),
        }
      })
    },
  })
}

// ── usePerson (single) ───────────────────────────────────────────────────
export function usePerson(personId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoPersons = useDemoStore((s) => s.persons)
  const demoLedgers = useDemoStore((s) => s.ledgers)

  return useQuery({
    queryKey: ['person', personId, userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<PersonWithLedgers | null> => {
      if (isDemo) {
        const person = demoPersons.find((p) => p.id === personId)
        if (!person) return null
        const pLedgers = demoLedgers.filter((l) => l.person_id === personId)
        const lent = pLedgers.filter((l) => l.ledger_type === 'Lent')
        const debt = pLedgers.filter((l) => l.ledger_type === 'Debt')
        return {
          ...person,
          ledgers: pLedgers,
          total_lent: lent.reduce((s, l) => s + l.total_amount, 0),
          total_debt: debt.reduce((s, l) => s + l.total_amount, 0),
          total_outstanding_lent: lent
            .filter((l) => l.status !== 'Settled')
            .reduce((s, l) => s + (l.remaining ?? l.total_amount), 0),
          total_outstanding_debt: debt
            .filter((l) => l.status !== 'Settled')
            .reduce((s, l) => s + (l.remaining ?? l.total_amount), 0),
        }
      }

      const { data: person, error: pErr } = await supabase
        .from('persons')
        .select('*')
        .eq('id', personId)
        .eq('user_id', userId!)
        .single()
      if (pErr) throw pErr

      const { data: rawLedgers, error: lErr } = await supabase
        .from('person_ledger')
        .select('*, ledger_payments(*)')
        .eq('person_id', personId)
        .eq('user_id', userId!)
        .order('start_date', { ascending: false })
      if (lErr) throw lErr

      const pLedgers: PersonLedger[] = (rawLedgers ?? []).map((l) => {
        const payments: LedgerPayment[] = l.ledger_payments ?? []
        return computeEnriched(l, payments)
      })

      const lent = pLedgers.filter((l) => l.ledger_type === 'Lent')
      const debt = pLedgers.filter((l) => l.ledger_type === 'Debt')

      return {
        ...person,
        ledgers: pLedgers,
        total_lent: lent.reduce((s, l) => s + l.total_amount, 0),
        total_debt: debt.reduce((s, l) => s + l.total_amount, 0),
        total_outstanding_lent: lent
          .filter((l) => l.status !== 'Settled')
          .reduce((s, l) => s + (l.remaining ?? 0), 0),
        total_outstanding_debt: debt
          .filter((l) => l.status !== 'Settled')
          .reduce((s, l) => s + (l.remaining ?? 0), 0),
      }
    },
  })
}

// ── Person mutations ─────────────────────────────────────────────────────
export function useCreatePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: Pick<Person, 'name' | 'relationship' | 'phone' | 'notes'>) => {
      const { data: row, error } = await supabase
        .from('persons')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row as Person
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      addToast({ type: 'success', message: 'Person added' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useUpdatePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Person> & { id: string }) => {
      const { data: row, error } = await supabase
        .from('persons')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId!)
        .select()
        .single()
      if (error) throw error
      return row as Person
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      addToast({ type: 'success', message: 'Person updated' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('persons')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      addToast({ type: 'success', message: 'Person removed' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

// ── Ledger entry mutations ────────────────────────────────────────────────
export function useCreateLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: Omit<PersonLedger, 'id' | 'user_id' | 'created_at' | 'person' | 'payments' | 'paid_amount' | 'remaining' | 'status'>) => {
      const { data: row, error } = await supabase
        .from('person_ledger')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      qc.invalidateQueries({ queryKey: ['person'] })
      addToast({ type: 'success', message: 'Entry added' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useUpdateLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PersonLedger> & { id: string }) => {
      const { data: row, error } = await supabase
        .from('person_ledger')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId!)
        .select()
        .single()
      if (error) throw error
      return row
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      qc.invalidateQueries({ queryKey: ['person'] })
      addToast({ type: 'success', message: 'Entry updated' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useDeleteLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('person_ledger')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      qc.invalidateQueries({ queryKey: ['person'] })
      addToast({ type: 'success', message: 'Entry deleted' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

// ── Payment mutations ────────────────────────────────────────────────────
export function useCreatePayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: Omit<LedgerPayment, 'id' | 'user_id' | 'created_at'>) => {
      const { data: row, error } = await supabase
        .from('ledger_payments')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row as LedgerPayment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      qc.invalidateQueries({ queryKey: ['person'] })
      addToast({ type: 'success', message: 'Payment logged' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ledger_payments')
        .delete()
        .eq('id', id)
        .eq('user_id', userId!)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      qc.invalidateQueries({ queryKey: ['person'] })
      addToast({ type: 'success', message: 'Payment removed' })
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  })
}
