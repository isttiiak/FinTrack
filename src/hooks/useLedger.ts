import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import { useDemoGuard, DemoBlockedError } from '@/hooks/useDemoGuard'
import { round2 } from '@/lib/utils'
import type { Person, PersonLedger, LedgerPayment, PersonWithLedgers } from '@/types/ledger.types'
import type { LedgerStatus } from '@/lib/constants'

// ── Aggregation ──────────────────────────────────────────────────────────
// Payments are no longer bound to one specific lend/debt entry — they
// attach to (person, ledger_type) and reduce that type's aggregate pool.
// This mirrors a running-balance mental model: "how much does this
// person currently owe me / do I owe them", not "which loan is this
// payment for".
interface TypeAggregate {
  total: number
  paid: number
  remaining: number
  overpaid: number
  count: number
  status: LedgerStatus | null
}

function aggregateForType(entries: PersonLedger[], payments: LedgerPayment[]): TypeAggregate {
  if (entries.length === 0 && payments.length === 0) {
    return { total: 0, paid: 0, remaining: 0, overpaid: 0, count: entries.length, status: null }
  }
  const total = round2(entries.reduce((s, e) => s + e.total_amount, 0))
  const paid = round2(payments.reduce((s, p) => s + p.amount, 0))
  const remaining = round2(Math.max(0, total - paid))
  const overpaid = round2(Math.max(0, paid - total))
  const status: LedgerStatus | null = entries.length === 0
    ? null
    : remaining === 0 ? 'Settled' : paid > 0 ? 'Partial' : 'Pending'
  return { total, paid, remaining, overpaid, count: entries.length, status }
}

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
  const demoPersons = useDemoStore((s) => s.persons)
  const demoLedgers = useDemoStore((s) => s.ledgers)
  const demoPayments = useDemoStore((s) => s.payments)

  return useQuery({
    queryKey: ['persons', userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<PersonWithLedgers[]> => {
      if (isDemo) {
        return demoPersons.map((p) => enrichPerson(
          p,
          demoLedgers.filter((l) => l.person_id === p.id),
          demoPayments.filter((pay) => pay.person_id === p.id),
        ))
      }

      const { data: persons, error: pErr } = await supabase
        .from('persons')
        .select('*')
        .eq('user_id', userId!)
        .order('name')
      if (pErr) throw pErr

      const { data: rawLedgers, error: lErr } = await supabase
        .from('person_ledger')
        .select('*')
        .eq('user_id', userId!)
        .order('start_date', { ascending: false })
      if (lErr) throw lErr

      const { data: rawPayments, error: payErr } = await supabase
        .from('ledger_payments')
        .select('*')
        .eq('user_id', userId!)
      if (payErr) throw payErr

      return (persons ?? []).map((p) => enrichPerson(
        p,
        (rawLedgers ?? []).filter((l) => l.person_id === p.id),
        (rawPayments ?? []).filter((pay) => pay.person_id === p.id),
      ))
    },
  })
}

// ── usePerson (single) ───────────────────────────────────────────────────
export function usePerson(personId: string) {
  const userId = useAuthStore((s) => s.user?.id)
  const isDemo = useDemoStore((s) => s.isDemo)
  const demoPersons = useDemoStore((s) => s.persons)
  const demoLedgers = useDemoStore((s) => s.ledgers)
  const demoPayments = useDemoStore((s) => s.payments)

  return useQuery({
    queryKey: ['person', personId, userId],
    enabled: isDemo || !!userId,
    queryFn: async (): Promise<PersonWithLedgers | null> => {
      if (isDemo) {
        const person = demoPersons.find((p) => p.id === personId)
        if (!person) return null
        return enrichPerson(
          person,
          demoLedgers.filter((l) => l.person_id === personId),
          demoPayments.filter((pay) => pay.person_id === personId),
        )
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
        .select('*')
        .eq('person_id', personId)
        .eq('user_id', userId!)
        .order('start_date', { ascending: false })
      if (lErr) throw lErr

      const { data: rawPayments, error: payErr } = await supabase
        .from('ledger_payments')
        .select('*')
        .eq('person_id', personId)
        .eq('user_id', userId!)
      if (payErr) throw payErr

      return enrichPerson(person, rawLedgers ?? [], rawPayments ?? [])
    },
  })
}

// ── Person mutations ─────────────────────────────────────────────────────
export function useCreatePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (data: Pick<Person, 'name' | 'relationship' | 'phone' | 'notes'>) => {
      guardDemo()
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
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdatePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Person> & { id: string }) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeletePerson() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
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
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

// ── Ledger entry mutations ────────────────────────────────────────────────
export function useCreateLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (data: Omit<PersonLedger, 'id' | 'user_id' | 'created_at' | 'person'>) => {
      guardDemo()
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
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdateLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PersonLedger> & { id: string }) => {
      guardDemo()
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
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeleteLedgerEntry() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
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
      if (err instanceof DemoBlockedError) return
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
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (data: Omit<LedgerPayment, 'id' | 'user_id' | 'created_at'>) => {
      guardDemo()
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
    onError: (err: Error) => {
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useUpdatePayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; amount?: number; payment_date?: string; notes?: string | null }) => {
      guardDemo()
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
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const addToast = useUIStore((s) => s.addToast)
  const guardDemo = useDemoGuard()

  return useMutation({
    mutationFn: async (id: string) => {
      guardDemo()
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
      if (err instanceof DemoBlockedError) return
      addToast({ type: 'error', message: err.message })
    },
  })
}
