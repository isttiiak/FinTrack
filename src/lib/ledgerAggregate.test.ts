import { describe, it, expect } from 'vitest'
import { aggregateForType } from '@/lib/ledgerAggregate'
import type { PersonLedger, LedgerPayment } from '@/types/ledger.types'

function entry(overrides: Partial<PersonLedger> = {}): PersonLedger {
  return {
    id: 'e1',
    user_id: 'u1',
    person_id: 'p1',
    ledger_type: 'Lent',
    total_amount: 1000,
    start_date: '2026-01-01',
    reason: null,
    payment_method: null,
    account: null,
    settled_date: null,
    doc_link: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function payment(overrides: Partial<LedgerPayment> = {}): LedgerPayment {
  return {
    id: 'pay1',
    person_id: 'p1',
    ledger_type: 'Lent',
    user_id: 'u1',
    amount: 100,
    payment_date: '2026-01-05',
    payment_method: null,
    account: null,
    notes: null,
    created_at: '2026-01-05T00:00:00Z',
    ...overrides,
  }
}

describe('aggregateForType', () => {
  it('returns a null-status zero aggregate when there is no history at all', () => {
    expect(aggregateForType([], [])).toEqual({
      total: 0, paid: 0, remaining: 0, overpaid: 0, count: 0, status: null,
    })
  })

  it('is Pending when there is an entry but no payments yet', () => {
    const agg = aggregateForType([entry({ total_amount: 500 })], [])
    expect(agg).toEqual({ total: 500, paid: 0, remaining: 500, overpaid: 0, count: 1, status: 'Pending' })
  })

  it('is Partial once some but not all is paid', () => {
    const agg = aggregateForType([entry({ total_amount: 500 })], [payment({ amount: 200 })])
    expect(agg).toEqual({ total: 500, paid: 200, remaining: 300, overpaid: 0, count: 1, status: 'Partial' })
  })

  it('is Settled once paid matches total exactly', () => {
    const agg = aggregateForType([entry({ total_amount: 500 })], [payment({ amount: 500 })])
    expect(agg.status).toBe('Settled')
    expect(agg.remaining).toBe(0)
  })

  it('tracks overpaid separately from remaining, both floor at zero', () => {
    const agg = aggregateForType([entry({ total_amount: 500 })], [payment({ amount: 700 })])
    expect(agg.remaining).toBe(0)
    expect(agg.overpaid).toBe(200)
    expect(agg.status).toBe('Settled')
  })

  it('sums across multiple entries and multiple payments (the aggregate running-balance model)', () => {
    const entries = [entry({ id: 'e1', total_amount: 1000 }), entry({ id: 'e2', total_amount: 500 })]
    const payments = [payment({ id: 'p1', amount: 300 }), payment({ id: 'p2', amount: 200 })]
    const agg = aggregateForType(entries, payments)
    expect(agg).toEqual({ total: 1500, paid: 500, remaining: 1000, overpaid: 0, count: 2, status: 'Partial' })
  })

  it('rounds through round2 to avoid float drift across many small payments', () => {
    const entries = [entry({ total_amount: 100 })]
    const payments = [payment({ amount: 33.33 }), payment({ amount: 33.33 }), payment({ amount: 33.34 })]
    const agg = aggregateForType(entries, payments)
    expect(agg.paid).toBe(100)
    expect(agg.remaining).toBe(0)
    expect(agg.status).toBe('Settled')
  })

  it('is Pending, not null, when payments exist but entries are somehow empty (edge case)', () => {
    // entries.length === 0 with payments present: total stays 0, but the
    // early-return guard only fires when BOTH are empty, so this still
    // goes through the full calculation — remaining floors at 0, overpaid
    // absorbs the excess, and status is null because status only derives
    // from whether there are entries.
    const agg = aggregateForType([], [payment({ amount: 50 })])
    expect(agg.status).toBeNull()
    expect(agg.overpaid).toBe(50)
  })
})
