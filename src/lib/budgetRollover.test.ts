import { describe, expect, it } from 'vitest'
import { carryoverAmount, previousMonthRange } from './budgetRollover'

const base = { rollover: true, monthlyLimit: 5000, createdAt: '2026-08-15T10:00:00Z', monthStart: '2026-10-01' }

describe('carryoverAmount', () => {
  it('carries last month’s unspent part of the base limit', () => {
    expect(carryoverAmount({ ...base, lastMonthSpent: 4500 })).toBe(500)
  })
  it('never goes negative after an overspend', () => {
    expect(carryoverAmount({ ...base, lastMonthSpent: 6200 })).toBe(0)
  })
  it('is zero unless switched on', () => {
    expect(carryoverAmount({ ...base, rollover: false, lastMonthSpent: 0 })).toBe(0)
    expect(carryoverAmount({ ...base, rollover: undefined, lastMonthSpent: 0 })).toBe(0)
  })
  it('is zero for a budget created this month', () => {
    expect(carryoverAmount({ ...base, createdAt: '2026-10-03T08:00:00Z', lastMonthSpent: 0 })).toBe(0)
  })
})

describe('previousMonthRange', () => {
  it('handles normal months, January and leap February', () => {
    expect(previousMonthRange('2026-10')).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(previousMonthRange('2026-01')).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(previousMonthRange('2028-03')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })
})
