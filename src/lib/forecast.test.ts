import { describe, it, expect } from 'vitest'
import { forecastMonth, type ForecastRule, type ForecastTxn } from '@/lib/forecast'

const exp = (txn_date: string, amount: number, category_id: string | null = 'food'): ForecastTxn => ({
  type: 'Expense', amount, txn_date, category_id,
})

describe('forecastMonth', () => {
  // 10 Sep 2026 — 30-day month, 10 days elapsed, 20 left
  const today = new Date(2026, 8, 10)

  it('extrapolates the daily run-rate over the remaining days', () => {
    const f = forecastMonth({ today, txns: [exp('2026-09-03', 1000), exp('2026-09-09', 1000)], rules: [], budgets: [] })
    expect(f.spent).toBe(2000)
    expect(f.dailyRate).toBe(200)
    expect(f.projected).toBe(6000) // 2000 + 200 * 20
    expect(f.daysLeft).toBe(20)
  })

  it('ignores income, other months and future-dated rows', () => {
    const f = forecastMonth({
      today,
      txns: [
        { type: 'Income', amount: 9999, txn_date: '2026-09-02', category_id: 'salary' },
        exp('2026-08-31', 500),
        exp('2026-09-20', 500),
        exp('2026-09-05', 100),
      ],
      rules: [],
      budgets: [],
    })
    expect(f.spent).toBe(100)
  })

  it('does not extrapolate recurring spend, and adds upcoming occurrences exactly', () => {
    // Rent 5000 on the 1st (already paid), plus 1000 of ordinary spending.
    const rent: ForecastRule = {
      cadence: 'Monthly', start_date: '2026-01-01', end_date: null,
      type: 'Expense', amount: 5000, category_id: 'rent', is_active: true,
    }
    // Weekly 300 subscription, Thursdays from 2026-09-03: 3rd,10th done; 17th,24th ahead.
    const sub: ForecastRule = {
      cadence: 'Weekly', start_date: '2026-09-03', end_date: null,
      type: 'Expense', amount: 300, category_id: 'subs', is_active: true,
    }
    const f = forecastMonth({
      today,
      txns: [exp('2026-09-01', 5000, 'rent'), exp('2026-09-03', 300, 'subs'), exp('2026-09-10', 300, 'subs'), exp('2026-09-04', 1000, 'food')],
      rules: [rent, sub],
      budgets: [],
    })
    expect(f.upcomingRecurring).toBe(600)
    // discretionary = food 1000 only → 100/day * 20 = 2000
    expect(f.projected).toBe(5000 + 600 + 1000 + 2000 + 600)
  })

  it('skips inactive rules', () => {
    const rule: ForecastRule = {
      cadence: 'Weekly', start_date: '2026-09-03', end_date: null,
      type: 'Expense', amount: 300, category_id: 'subs', is_active: false,
    }
    expect(forecastMonth({ today, txns: [], rules: [rule], budgets: [] }).upcomingRecurring).toBe(0)
  })

  it('reports the projected overspend against budgets and when a budget runs out', () => {
    const f = forecastMonth({
      today,
      txns: [exp('2026-09-05', 2000)],
      rules: [],
      budgets: [{ category_id: 'food', monthly_limit: 3000 }],
    })
    const food = f.categories.find((c) => c.category_id === 'food')!
    expect(food.projected).toBe(6000)
    expect(food.projectedOver).toBe(3000)
    expect(f.budgetDelta).toBe(3000)
    // 200/day: 1000 left → 5 more days → day 15
    expect(food.runsOutDay).toBe(15)
  })

  it('has no run-out day for an unbudgeted category or one already over', () => {
    const f = forecastMonth({
      today,
      txns: [exp('2026-09-05', 4000), exp('2026-09-06', 100, 'misc')],
      rules: [],
      budgets: [{ category_id: 'food', monthly_limit: 3000 }],
    })
    expect(f.categories.find((c) => c.category_id === 'food')!.runsOutDay).toBeNull()
    expect(f.categories.find((c) => c.category_id === 'misc')!.runsOutDay).toBeNull()
  })

  it('flags low confidence early in the month and handles the last day', () => {
    expect(forecastMonth({ today: new Date(2026, 8, 2), txns: [], rules: [], budgets: [] }).lowConfidence).toBe(true)
    const last = forecastMonth({ today: new Date(2026, 8, 30), txns: [exp('2026-09-10', 3000)], rules: [], budgets: [] })
    expect(last.daysLeft).toBe(0)
    expect(last.projected).toBe(3000)
  })
})
