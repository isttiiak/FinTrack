import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useRecurringRules } from '@/hooks/useRecurring'
import { useCategories } from '@/hooks/useCategories'
import { forecastMonth } from '@/lib/forecast'
import { formatCurrency } from '@/lib/utils'
import { staggerItem } from '@/lib/animations'
import type { Transaction, BudgetLimit } from '@/types/expense.types'
import './SpendingForecast.css'

interface SpendingForecastProps {
  transactions: Transaction[]
  budgets: BudgetLimit[]
}

// End-of-month projection + per-category budget burn-down for the current
// month. See lib/forecast.ts for the method.
export default function SpendingForecast({ transactions, budgets }: SpendingForecastProps) {
  const { data: rules = [] } = useRecurringRules()
  const { data: categories = [] } = useCategories()

  const forecast = useMemo(
    () => forecastMonth({ today: new Date(), txns: transactions, rules, budgets }),
    [transactions, rules, budgets],
  )

  const nameOf = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id: string | null) => (id ? map.get(id) ?? 'Unknown' : 'Uncategorised')
  }, [categories])

  const budgeted = forecast.categories.filter((c) => c.limit !== null)
  const rows = (budgeted.length > 0 ? budgeted : forecast.categories.slice(0, 5)).slice(0, 8)
  const hasBudget = forecast.totalBudget > 0

  return (
    <motion.div className="analytics-card analytics-card-wide sf-card" variants={staggerItem}>
      <h3 className="analytics-card-title">
        <TrendingUp size={14} className="sf-title-icon" /> Month-end forecast
      </h3>

      <p className="sf-headline">
        At this pace you&apos;ll spend <strong>{formatCurrency(Math.round(forecast.projected))}</strong> by the{' '}
        {ordinal(forecast.daysInMonth)}
        {hasBudget && (
          <>
            {' — '}
            {forecast.budgetDelta > 0 ? (
              <span className="sf-over">{formatCurrency(Math.round(forecast.budgetDelta))} over budget</span>
            ) : (
              <span className="sf-under">{formatCurrency(Math.round(-forecast.budgetDelta))} under budget</span>
            )}
          </>
        )}
        .
      </p>
      {forecast.lowConfidence && (
        <p className="sf-note">Only {forecast.daysElapsed} day{forecast.daysElapsed === 1 ? '' : 's'} of data so far — this will firm up as the month goes on.</p>
      )}

      <div className="sf-stats">
        <div className="sf-stat">
          <span className="sf-stat-label">Spent so far</span>
          <span className="sf-stat-value">{formatCurrency(Math.round(forecast.spent))}</span>
        </div>
        <div className="sf-stat">
          <span className="sf-stat-label">Daily run-rate</span>
          <span className="sf-stat-value">{formatCurrency(Math.round(forecast.dailyRate))}</span>
        </div>
        <div className="sf-stat">
          <span className="sf-stat-label">Recurring still due</span>
          <span className="sf-stat-value">{formatCurrency(Math.round(forecast.upcomingRecurring))}</span>
        </div>
        <div className="sf-stat">
          <span className="sf-stat-label">Days left</span>
          <span className="sf-stat-value">{forecast.daysLeft}</span>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="sf-burndown">
          <p className="sf-burndown-title">{budgeted.length > 0 ? 'Budget burn-down' : 'Biggest categories — projected'}</p>
          {rows.map((c) => {
            const scale = Math.max(c.limit ?? 0, c.projected, 1)
            const status = statusOf(c)
            return (
              <div key={c.category_id ?? 'none'} className="sf-row">
                <div className="sf-row-head">
                  <span className="sf-row-name">{nameOf(c.category_id)}</span>
                  <span className={`sf-row-status sf-tone-${status.tone}`}>{status.label}</span>
                </div>
                <div className="sf-bar" role="img" aria-label={`${nameOf(c.category_id)}: ${formatCurrency(c.spent)} spent, ${formatCurrency(c.projected)} projected`}>
                  <div className="sf-bar-projected" style={{ width: `${(c.projected / scale) * 100}%` }} />
                  <div className={`sf-bar-spent sf-bar-${status.tone}`} style={{ width: `${(c.spent / scale) * 100}%` }} />
                  {c.limit !== null && <div className="sf-bar-limit" style={{ left: `${(c.limit / scale) * 100}%` }} />}
                </div>
                <div className="sf-row-foot">
                  <span>{formatCurrency(Math.round(c.spent))}{c.limit !== null && ` of ${formatCurrency(Math.round(c.limit))}`}</span>
                  <span>projected {formatCurrency(Math.round(c.projected))}</span>
                </div>
              </div>
            )
          })}
          {budgeted.length === 0 && <p className="sf-note">Set category budgets in Settings to see how each one is tracking.</p>}
        </div>
      )}
    </motion.div>
  )
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 ? 0 : n % 10]}`
}

function statusOf(c: { limit: number | null; spent: number; projectedOver: number | null; runsOutDay: number | null }) {
  if (c.limit === null) return { tone: 'neutral', label: '' }
  if (c.spent >= c.limit) return { tone: 'over', label: `Over by ${formatCurrency(Math.round(c.spent - c.limit))}` }
  if (c.runsOutDay !== null || (c.projectedOver ?? 0) > 0) {
    return { tone: 'warn', label: c.runsOutDay !== null ? `Runs out ~${ordinal(c.runsOutDay)}` : 'Likely over' }
  }
  return { tone: 'ok', label: 'On track' }
}
