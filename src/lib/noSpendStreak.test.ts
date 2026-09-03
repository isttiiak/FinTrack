import { describe, it, expect } from 'vitest'
import { computeNoSpendStreak } from '@/lib/noSpendStreak'
import { toISODateString } from '@/lib/utils'
import type { Transaction } from '@/types/expense.types'

function txn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    user_id: 'u1',
    category_id: null,
    txn_date: '2026-01-01',
    type: 'Expense',
    amount: 100,
    description: null,
    payment_method: null,
    account: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function daysAgo(today: Date, n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return toISODateString(d)
}

describe('computeNoSpendStreak', () => {
  it('counts zero when there is an expense today (today itself never counts as a completed no-spend day)', () => {
    const today = new Date(2026, 8, 4)
    const transactions = [txn({ txn_date: toISODateString(today) })]
    expect(computeNoSpendStreak(transactions, today)).toBe(0)
  })

  it('counts back full completed days since the last expense', () => {
    const today = new Date(2026, 8, 4)
    // Last expense was 3 days ago -> 2 completed no-spend days (yesterday, day-before), not today.
    const transactions = [txn({ txn_date: daysAgo(today, 3) })]
    expect(computeNoSpendStreak(transactions, today)).toBe(2)
  })

  it('only Expense-type transactions break the streak — Income does not', () => {
    const today = new Date(2026, 8, 4)
    const transactions = [
      txn({ txn_date: daysAgo(today, 3), type: 'Expense' }),
      txn({ txn_date: daysAgo(today, 1), type: 'Income', amount: 5000 }),
    ]
    // Same as the expense-only case above: the Income entry yesterday must not count as spend.
    expect(computeNoSpendStreak(transactions, today)).toBe(2)
  })

  it('with no transactions at all, still reports today as an in-progress no-spend day (existing behavior)', () => {
    // earliest defaults to today itself when there's no history, which caps
    // maxDays at 2 — so this returns 1, not 0. Documented as existing
    // behavior rather than changed here; not in TODO.md's list of known bugs.
    const today = new Date(2026, 8, 4)
    expect(computeNoSpendStreak([], today)).toBe(1)
  })

  it('stops counting at the earliest known transaction rather than running forever', () => {
    const today = new Date(2026, 8, 4)
    // Only expense on record is 10 days ago; streak should be capped near that,
    // not blow past the earliest known data point.
    const transactions = [txn({ txn_date: daysAgo(today, 10) })]
    const streak = computeNoSpendStreak(transactions, today)
    expect(streak).toBe(9)
  })
})
