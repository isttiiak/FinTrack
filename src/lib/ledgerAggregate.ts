import { round2 } from '@/lib/utils'
import type { PersonLedger, LedgerPayment, PersonWithLedgers } from '@/types/ledger.types'
import type { LedgerStatus, LedgerType } from '@/lib/constants'

// Payments are no longer bound to one specific lend/debt entry — they
// attach to (person, ledger_type) and reduce that type's aggregate pool.
// This mirrors a running-balance mental model: "how much does this
// person currently owe me / do I owe them", not "which loan is this
// payment for".
export interface TypeAggregate {
  total: number
  paid: number
  remaining: number
  overpaid: number
  count: number
  status: LedgerStatus | null
}

export function aggregateForType(entries: PersonLedger[], payments: LedgerPayment[]): TypeAggregate {
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

export interface LedgerHistoryRow {
  key: string
  personId: string
  personName: string
  ledgerType: LedgerType
  date: string
  kind: 'entry' | 'payment'
  amount: number
  runningBalance: number
  reason: string | null
  paymentMethod: string | null
  notes: string | null
  sourceId: string
  seq: number
}

// Chronological timeline per (person, type) with a running balance, then
// returned newest-first with a `seq` tiebreaker so same-day payments stay
// ordered above the entry they settled.
export function buildLedgerHistory(persons: Pick<PersonWithLedgers, 'id' | 'name' | 'ledgers' | 'payments'>[]): LedgerHistoryRow[] {
  const rows: LedgerHistoryRow[] = []
  for (const person of persons) {
    for (const type of ['Lent', 'Debt'] as const) {
      const entries = person.ledgers.filter((l) => l.ledger_type === type)
      const payments = person.payments.filter((p) => p.ledger_type === type)
      if (entries.length === 0 && payments.length === 0) continue

      const events = [
        ...entries.map((e) => ({
          date: e.start_date, kind: 'entry' as const, amount: e.total_amount, sourceId: e.id,
          reason: e.reason, paymentMethod: e.payment_method, notes: e.notes,
        })),
        ...payments.map((p) => ({
          date: p.payment_date, kind: 'payment' as const, amount: p.amount, sourceId: p.id,
          reason: null as string | null, paymentMethod: p.payment_method, notes: p.notes,
        })),
      ].sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date)
        if (dateCmp !== 0) return dateCmp
        if (a.kind === b.kind) return 0
        return a.kind === 'entry' ? -1 : 1
      })

      let rawBalance = 0
      events.forEach((ev, seq) => {
        rawBalance = round2(rawBalance + (ev.kind === 'entry' ? ev.amount : -ev.amount))
        rows.push({
          key: `${person.id}-${type}-${ev.kind}-${ev.sourceId}`,
          personId: person.id,
          personName: person.name,
          ledgerType: type,
          date: ev.date,
          kind: ev.kind,
          amount: ev.amount,
          runningBalance: Math.max(0, rawBalance),
          reason: ev.reason,
          paymentMethod: ev.paymentMethod,
          notes: ev.notes,
          sourceId: ev.sourceId,
          seq,
        })
      })
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.seq - a.seq)
}
