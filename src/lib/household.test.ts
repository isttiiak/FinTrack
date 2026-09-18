import { describe, it, expect } from 'vitest'
import { splitEqual, computeBalances, suggestSettlements, positionOn, formatMoney } from '@/lib/household'

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100

describe('splitEqual', () => {
  it('always sums to the amount, giving leftover cents to the first people', () => {
    expect(splitEqual(100, 3)).toEqual([33.34, 33.33, 33.33])
    expect(sum(splitEqual(100, 3))).toBe(100)
    expect(splitEqual(10, 4)).toEqual([2.5, 2.5, 2.5, 2.5])
    expect(sum(splitEqual(0.05, 3))).toBe(0.05)
  })

  it('handles a single person and no one', () => {
    expect(splitEqual(42.5, 1)).toEqual([42.5])
    expect(splitEqual(10, 0)).toEqual([])
  })
})

describe('computeBalances', () => {
  const ids = ['a', 'b', 'c']

  it('credits the payer and debits each share; balances sum to zero', () => {
    const b = computeBalances(ids, [
      { paid_by: 'a', amount: 90, splits: [{ member_id: 'a', share: 30 }, { member_id: 'b', share: 30 }, { member_id: 'c', share: 30 }] },
    ], [])
    expect(b.get('a')).toBe(60)
    expect(b.get('b')).toBe(-30)
    expect(b.get('c')).toBe(-30)
  })

  it('nets opposing expenses and applies settlements', () => {
    const expenses = [
      { paid_by: 'a', amount: 100, splits: [{ member_id: 'a', share: 50 }, { member_id: 'b', share: 50 }] },
      { paid_by: 'b', amount: 40, splits: [{ member_id: 'a', share: 20 }, { member_id: 'b', share: 20 }] },
    ]
    // b owes a 50, a owes b 20 → b owes a 30
    const before = computeBalances(['a', 'b'], expenses, [])
    expect(before.get('a')).toBe(30)
    expect(before.get('b')).toBe(-30)
    const after = computeBalances(['a', 'b'], expenses, [{ from_member: 'b', to_member: 'a', amount: 30 }])
    expect(after.get('a')).toBe(0)
    expect(after.get('b')).toBe(0)
  })

  it('does not drift over many fractional shares', () => {
    const many = Array.from({ length: 200 }, () => ({
      paid_by: 'a', amount: 10, splits: splitEqual(10, 3).map((share, i) => ({ member_id: ids[i], share })),
    }))
    const b = computeBalances(ids, many, [])
    expect(sum([...b.values()])).toBe(0)
  })
})

describe('suggestSettlements', () => {
  it('clears everyone with the fewest payments', () => {
    const balances = new Map([['a', 60], ['b', -30], ['c', -30]])
    const t = suggestSettlements(balances)
    expect(t).toHaveLength(2)
    expect(t.every((x) => x.to === 'a')).toBe(true)
    expect(sum(t.map((x) => x.amount))).toBe(60)
  })

  it('returns nothing when already square', () => {
    expect(suggestSettlements(new Map([['a', 0], ['b', 0]]))).toEqual([])
  })

  it('applying the suggestions zeroes every balance', () => {
    const balances = new Map([['a', 70.5], ['b', -20.25], ['c', -40.25], ['d', -10]])
    const transfers = suggestSettlements(balances)
    const net = computeBalances(
      [...balances.keys()],
      [],
      transfers.map((x) => ({ from_member: x.from, to_member: x.to, amount: x.amount })),
    )
    for (const [id, b] of balances) expect(Math.round((b + (net.get(id) ?? 0)) * 100)).toBe(0)
  })
})

describe('positionOn', () => {
  const e = { paid_by: 'a', amount: 90, splits: [{ member_id: 'a', share: 30 }, { member_id: 'b', share: 60 }] }
  it('shows what others owe the payer', () => expect(positionOn(e, 'a')).toEqual({ kind: 'lent', amount: 60 }))
  it('shows what a participant owes', () => expect(positionOn(e, 'b')).toEqual({ kind: 'borrowed', amount: 60 }))
  it('is none for outsiders and self-only expenses', () => {
    expect(positionOn(e, 'z')).toEqual({ kind: 'none' })
    expect(positionOn({ paid_by: 'a', amount: 5, splits: [{ member_id: 'a', share: 5 }] }, 'a')).toEqual({ kind: 'none' })
    expect(positionOn(e, null)).toEqual({ kind: 'none' })
  })
})

describe('formatMoney', () => {
  it('shows cents only when there are some', () => {
    expect(formatMoney(64.5, 'GBP')).toBe('£64.50')
    expect(formatMoney(900, 'GBP')).toBe('£900')
    expect(formatMoney(33.34, 'USD')).toBe('$33.34')
  })
  it('keeps the taka sign for BDT', () => {
    expect(formatMoney(1250.5, 'BDT')).toBe('৳1,250.50')
  })
})
