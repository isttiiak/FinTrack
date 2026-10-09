import { describe, expect, it } from 'vitest'
import {
  allocationByCategory, annualisedReturn, cumulativeSeries, daysBetween, investmentPosition, maturitySchedule, returnSummary, xirr,
} from './investmentAnalytics'
import type { Investment } from '@/types/investment.types'

function inv(over: Partial<Investment>): Investment {
  return {
    id: 'i', user_id: 'u', name: 'X', category: null, company_name: null, committed_amount: null,
    start_date: null, end_date: null, market_value: null, doc_link: null, notes: null, created_at: '',
    payments: [], returns: [], ...over,
  }
}
const pay = (payment_date: string, amount: number) =>
  ({ id: payment_date, investment_id: 'i', user_id: 'u', amount, payment_date, payment_method: null, account: null, notes: null, created_at: '' })
const ret = (return_date: string, amount: number) =>
  ({ id: return_date, investment_id: 'i', user_id: 'u', amount, return_date, return_type: null, payment_method: null, account: null, notes: null, created_at: '' })

describe('daysBetween', () => {
  it('counts whole days across months and DST', () => {
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
    expect(daysBetween('2026-10-08', '2026-10-01')).toBe(-7)
  })
})

describe('xirr', () => {
  it('is 10% for 100 in, 110 back a year later', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 110 }])).toBeCloseTo(0.1, 4)
  })

  it('weights money by how long it was invested', () => {
    // Same 20% profit over two years is ~9.5% a year, not 20%
    expect(xirr([{ date: '2024-01-01', amount: -100 }, { date: '2026-01-01', amount: 120 }])).toBeCloseTo(0.0954, 3)
  })

  it('handles losses', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 80 }])).toBeCloseTo(-0.2, 4)
  })

  it('handles several installments and returns', () => {
    const r = xirr([
      { date: '2025-01-01', amount: -1000 }, { date: '2025-07-01', amount: -1000 },
      { date: '2025-12-31', amount: 300 }, { date: '2026-06-30', amount: 2000 },
    ])
    expect(r).not.toBeNull()
    expect(r!).toBeGreaterThan(0.1)
    expect(r!).toBeLessThan(0.25)
  })

  it('returns null when every flow has the same sign', () => {
    expect(xirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: -10 }])).toBeNull()
  })
})

describe('annualisedReturn', () => {
  it('falls back to committed amount on the start date when no payments are logged', () => {
    const fd = inv({ committed_amount: 100000, start_date: '2025-10-08', returns: [ret('2026-10-08', 9000)], market_value: 100000 })
    expect(annualisedReturn(fd, '2026-10-08')).toBeCloseTo(0.09, 3)
  })

  it('refuses to annualise less than three months of history', () => {
    const short = inv({ payments: [pay('2026-09-01', 100)], returns: [ret('2026-10-01', 10)] })
    expect(annualisedReturn(short, '2026-10-08')).toBeNull()
  })
})

describe('allocationByCategory', () => {
  it('uses current value: entered valuation, else at cost', () => {
    const out = allocationByCategory([
      inv({ category: 'Stocks', market_value: 500, payments: [pay('2026-01-01', 400)] }),
      inv({ category: 'Stocks', payments: [pay('2026-01-01', 300)], committed_amount: 1000 }),
      inv({ category: 'Fixed Deposit', committed_amount: 2000 }),
      inv({ category: null, committed_amount: 0 }),
    ])
    expect(out).toEqual([{ name: 'Fixed Deposit', value: 2000 }, { name: 'Stocks', value: 800 }])
  })
})

describe('maturitySchedule', () => {
  it('sorts by end date and flags matured / soon / later', () => {
    const out = maturitySchedule([
      inv({ id: 'a', end_date: '2027-06-01' }),
      inv({ id: 'b', end_date: '2026-10-20' }),
      inv({ id: 'c', end_date: '2026-09-01' }),
      inv({ id: 'd' }),
    ], '2026-10-08')
    expect(out.map((m) => [m.investment.id, m.status, m.daysLeft])).toEqual([
      ['c', 'matured', -37], ['b', 'soon', 12], ['a', 'later', 236],
    ])
  })
})

describe('cumulativeSeries', () => {
  it('keeps running totals per date', () => {
    const out = cumulativeSeries(inv({
      payments: [pay('2026-01-01', 100), pay('2026-03-01', 50)],
      returns: [ret('2026-03-01', 20), ret('2026-02-01', 5)],
    }))
    expect(out).toEqual([
      { date: '2026-01-01', paid: 100, returned: 0 },
      { date: '2026-02-01', paid: 100, returned: 5 },
      { date: '2026-03-01', paid: 150, returned: 25 },
    ])
  })
})

describe('investmentPosition', () => {
  it('counts returns plus current value against what was paid in', () => {
    // demo DSE: 150k in, 11.2k back, now worth 172k → +33.2k, +22.1%
    const p = investmentPosition(inv({ committed_amount: 150000, payments: [pay('2026-03-22', 150000)], returns: [ret('2026-07-10', 3200), ret('2026-09-08', 8000)], market_value: 172000 }))
    expect(p).toMatchObject({ invested: 150000, returned: 11200, currentValue: 172000, valueIsEstimate: false, profit: 33200 })
    expect(p.roi).toBeCloseTo(0.2213, 3)
  })

  it('values an un-valued investment at cost, so an unmatured FD is not a loss', () => {
    const p = investmentPosition(inv({ committed_amount: 300000, payments: [pay('2026-04-11', 300000)] }))
    expect(p).toMatchObject({ invested: 300000, currentValue: 300000, valueIsEstimate: true, profit: 0, roi: 0 })
  })

  it('does not count returned capital twice when valued at cost', () => {
    const matured = inv({ payments: [pay('2025-10-01', 100000)], returns: [
      { ...ret('2026-10-01', 100000), return_type: 'Capital Return' as const },
      { ...ret('2026-10-01', 9000), return_type: 'Profit' as const },
    ] })
    expect(investmentPosition(matured)).toMatchObject({ currentValue: 0, profit: 9000 })
  })

  it('uses only installments actually paid, not the full commitment', () => {
    const p = investmentPosition(inv({ committed_amount: 1000000, payments: [pay('2026-01-01', 400000)], market_value: 450000 }))
    expect(p).toMatchObject({ invested: 400000, profit: 50000 })
  })

  it('falls back to the committed amount when no installments were logged', () => {
    expect(investmentPosition(inv({ committed_amount: 50000, market_value: 60000 })).profit).toBe(10000)
  })
})

describe('returnSummary', () => {
  it('matches the position ROI and adds the yearly rate', () => {
    const stocks = inv({ payments: [pay('2026-03-22', 150000)], returns: [ret('2026-07-10', 3200), ret('2026-09-08', 8000)], market_value: 172000 })
    const out = returnSummary(stocks, '2026-10-08')
    expect(out.total).toBeCloseTo(0.2213, 3)
    expect(out.annual).toBeGreaterThan(0.3)
  })

  it('reports an unmatured FD as 0%, valued at cost', () => {
    const fd = inv({ payments: [pay('2026-04-11', 300000)] })
    expect(returnSummary(fd, '2026-10-08')).toMatchObject({ total: 0, note: 'Valued at cost' })
  })
})
