import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, fetchAllRows } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { aggregateForType } from '@/lib/ledgerAggregate'
import type { Person, PersonLedger, LedgerPayment, PersonWithLedgers } from '@/types/ledger.types'
import { toastWithUndo } from '@/lib/undo'

function enrichPerson(
  person: Person,
  pLedgers: PersonLedger[],
  pPayments: LedgerPayment[],
): PersonWithLedgers {
  const lentEntries = pLedgers.filter((l) => l.ledger_type === 'Lent')
  const debtEntries = pLedgers.filter((l) => l.ledger_type === 'Debt')
  const lentPayments = pPayments.filter((p) => p.ledger_type === 'Lent')
  const debtPayments = pPayments.filter((p) => p.ledger_type === 'Debt')

  const lentAgg = aggregateForType(lentEntries, lentPayments)
  const debtAgg = aggregateForType(debtEntries, debtPayments)

  return {
    ...person,
    ledgers: pLedgers,
    payments: pPayments,
    total_lent: lentAgg.total,
    total_debt: debtAgg.total,
    total_outstanding_lent: lentAgg.remaining,
    total_outstanding_debt: debtAgg.remaining,
    lent_count: lentAgg.count,
    debt_count: debtAgg.count,
    lent_status: lentAgg.status,
    debt_status: debtAgg.status,
    overpaid_lent: lentAgg.overpaid,
    overpaid_debt: debtAgg.overpaid,
  }
}

// ── usePersons ───────────────────────────────────────────────────────────
export function usePersons() {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['persons', userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<PersonWithLedgers[]> => {
      if (isDemo) {
        const { persons, ledgers, payments } = useDemoStore.getState()
        return persons.map((p) => enrichPerson(
          p,
          ledgers.filter((l) => l.person_id === p.id),
          payments.filter((pay) => pay.person_id === p.id),
        ))
      }

      // PostgREST caps responses at 1,000 rows by default — page through
      // every one of these with fetchAllRows, or a long-running account's
      // person_ledger/ledger_payments truncates and every outstanding
      // balance in the app silently computes too high. See TODO.md §3.1.
      // Each needs an explicit, fully-tiebroken .order() — pagination across
      // multiple .range() calls isn't guaranteed stable otherwise.
      const persons = await fetchAllRows<Person>((f, t) =>
        supabase.from('persons').select('*').eq('user_id', userId!).order('name').order('id').range(f, t),
      )

      const rawLedgers = await fetchAllRows<PersonLedger>((f, t) =>
        supabase.from('person_ledger').select('*').eq('user_id', userId!)
          .order('start_date', { ascending: false }).order('id').range(f, t),
      )

      const rawPayments = await fetchAllRows<LedgerPayment>((f, t) =>
        supabase.from('ledger_payments').select('*').eq('user_id', userId!).order('id').range(f, t),
      )

      return persons.map((p) => enrichPerson(
        p,
        rawLedgers.filter((l) => l.person_id === p.id),
        rawPayments.filter((pay) => pay.person_id === p.id),
      ))
    },
  })
}

// ── usePerson (single) ───────────────────────────────────────────────────
export function usePerson(personId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)

  return useQuery({
    queryKey: ['person', personId, userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<PersonWithLedgers | null> => {
      if (isDemo) {
        const { persons, ledgers, payments } = useDemoStore.getState()
        const person = persons.find((p) => p.id === personId)
        if (!person) return null
        return enrichPerson(
          person,
          ledgers.filter((l) => l.person_id === personId),
          payments.filter((pay) => pay.person_id === personId),
        )
      }

      const { data: person, error: pErr } = await supabase
        .from('persons')
        .select('*')
        .eq('id', personId)
        .eq('user_id', userId!)
        .maybeSingle()
      if (pErr) throw pErr
      if (!person) return null

      // Same 1,000-row cap as usePersons() above — a single person with a
      // long enough history could still exceed it. See TODO.md §3.1.
      const rawLedgers = await fetchAllRows<PersonLedger>((f, t) =>
        supabase.from('person_ledger').select('*').eq('person_id', personId).eq('user_id', userId!)
          .order('start_date', { ascending: false }).order('id').range(f, t),
      )

      const rawPayments = await fetchAllRows<LedgerPayment>((f, t) =>
        supabase.from('ledger_payments').select('*').eq('person_id', personId).eq('user_id', userId!)
          .order('id').range(f, t),
      )

      return enrichPerson(person, rawLedgers, rawPayments)
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
      if (useDemoStore.getState().isDemo) {
        const created: Person = {
          ...data,
          id: `demo-person-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          user_id: 'demo',
          created_at: new Date().toISOString(),
        }
        useDemoStore.getState().addPerson(created)
        return created
      }
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
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdatePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Person> & { id: string }) => {
      if (useDemoStore.getState().isDemo) {
        const updated = useDemoStore.getState().updatePerson(id, data)
        if (!updated) throw new Error('Person not found')
        return updated
      }
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
      qc.invalidateQueries({ queryKey: ['person'] })
      addToast({ type: 'success', message: 'Person updated' })
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      if (useDemoStore.getState().isDemo) {
        useDemoStore.getState().removePerson(id)
        return
      }
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
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

// ── Ledger entry mutations ────────────────────────────────────────────────
export function useCreateLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: Omit<PersonLedger, 'id' | 'user_id' | 'created_at' | 'person'>) => {
      if (useDemoStore.getState().isDemo) {
        const person = useDemoStore.getState().persons.find((p) => p.id === data.person_id)
        const created: PersonLedger = {
          ...data,
          id: `demo-ledger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          user_id: 'demo',
          created_at: new Date().toISOString(),
          person,
        }
        useDemoStore.getState().addLedger(created)
        return created
      }
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
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdateLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PersonLedger> & { id: string }) => {
      if (useDemoStore.getState().isDemo) {
        const updated = useDemoStore.getState().updateLedger(id, data)
        if (!updated) throw new Error('Entry not found')
        return updated
      }
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
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      if (useDemoStore.getState().isDemo) {
        useDemoStore.getState().removeLedger(id)
        return
      }
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
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

// ── Payment mutations ────────────────────────────────────────────────────
// Payments attach to (person_id, ledger_type) — the person's aggregate
// balance for that direction — not to one specific person_ledger row.
export function useCreatePayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (data: Omit<LedgerPayment, 'id' | 'user_id' | 'created_at'>) => {
      if (useDemoStore.getState().isDemo) {
        const created: LedgerPayment = {
          ...data,
          id: `demo-pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          user_id: 'demo',
          created_at: new Date().toISOString(),
        }
        useDemoStore.getState().addPayment(created)
        return created
      }
      const { data: row, error } = await supabase
        .from('ledger_payments')
        .insert({ ...data, user_id: userId! })
        .select()
        .single()
      if (error) throw error
      return row as LedgerPayment
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      qc.invalidateQueries({ queryKey: ['person'] })
      toastWithUndo(addToast, 'Payment logged', async () => {
        if (useDemoStore.getState().isDemo) {
          useDemoStore.getState().removePayment(created.id)
        } else {
          const { error } = await supabase.from('ledger_payments').delete().eq('id', created.id).eq('user_id', userId!)
          if (error) throw error
        }
        qc.invalidateQueries({ queryKey: ['persons'] })
        qc.invalidateQueries({ queryKey: ['person'] })
      }, 'Payment removed')
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdatePayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Omit<LedgerPayment, 'id' | 'user_id' | 'created_at'>> & { id: string }) => {
      if (useDemoStore.getState().isDemo) {
        const updated = useDemoStore.getState().updatePayment(id, data)
        if (!updated) throw new Error('Payment not found')
        return updated
      }
      const { data: row, error } = await supabase
        .from('ledger_payments')
        .update(data)
        .eq('id', id)
        .eq('user_id', userId!)
        .select()
        .single()
      if (error) throw error
      return row as LedgerPayment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['persons'] })
      qc.invalidateQueries({ queryKey: ['person'] })
      addToast({ type: 'success', message: 'Payment updated' })
    },
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)

  return useMutation({
    mutationFn: async (id: string) => {
      if (useDemoStore.getState().isDemo) {
        useDemoStore.getState().removePayment(id)
        return
      }
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
    onError: (err: Error) => {
      addToast({ type: 'error', message: err.message })
    },
  })
}
