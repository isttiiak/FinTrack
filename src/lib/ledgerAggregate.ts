import { round2 } from '@/lib/utils'
import type { PersonLedger, LedgerPayment } from '@/types/ledger.types'
import type { LedgerStatus } from '@/lib/constants'

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
