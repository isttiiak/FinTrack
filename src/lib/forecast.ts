import { generateOccurrences, type RecurringOccurrenceInput } from '@/lib/recurring'
import { round2, toISODateString } from '@/lib/utils'

export interface ForecastTxn {
  type: string
  amount: number
  txn_date: string
  category_id: string | null
}

export interface ForecastRule extends RecurringOccurrenceInput {
  type: string
  amount: number
  category_id: string | null
  is_active: boolean
}

export interface ForecastBudget {
  category_id: string
  monthly_limit: number
}

export interface CategoryForecast {
  category_id: string | null
  spent: number
  projected: number
  limit: number | null
  // projected − limit; positive = on course to overspend. null when no budget.
  projectedOver: number | null
  // Day of the month the budget runs out at the current pace, or null if it
  // won't run out this month (or already has, or there's no budget).
  runsOutDay: number | null
}

export interface MonthForecast {
  spent: number
  projected: number
  upcomingRecurring: number
  dailyRate: number
  daysElapsed: number
  daysLeft: number
  daysInMonth: number
  totalBudget: number
  // projected spend on budgeted categories − their combined limits
  budgetDelta: number
  // Too early in the month for the run-rate to mean much.
  lowConfidence: boolean
  categories: CategoryForecast[]
}

const LOW_CONFIDENCE_DAYS = 5
const NO_CATEGORY = '__none__'

// End-of-month projection for the month containing `today`.
//
// Spend to date is split into "recurring" (what the active rules should have
// produced so far) and "discretionary" (everything else); only the
// discretionary part is extrapolated at its daily run-rate, because recurring
// charges are lumpy — a rent payment on the 1st says nothing about the 20th.
// Recurring occurrences still ahead this month are then added exactly.
export function forecastMonth(input: {
  today: Date
  txns: ForecastTxn[]
  rules: ForecastRule[]
  budgets: ForecastBudget[]
}): MonthForecast {
  const { txns, budgets } = input
  const year = input.today.getFullYear()
  const month = input.today.getMonth()
  const today = new Date(year, month, input.today.getDate())
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  const tomorrow = new Date(year, month, today.getDate() + 1)

  const daysInMonth = monthEnd.getDate()
  const daysElapsed = today.getDate()
  const daysLeft = daysInMonth - daysElapsed

  const fromISO = toISODateString(monthStart)
  const todayISO = toISODateString(today)
  const key = (id: string | null) => id ?? NO_CATEGORY

  const spent = new Map<string, number>()
  for (const t of txns) {
    if (t.type !== 'Expense' || t.txn_date < fromISO || t.txn_date > todayISO) continue
    spent.set(key(t.category_id), (spent.get(key(t.category_id)) ?? 0) + t.amount)
  }

  const recurringToDate = new Map<string, number>()
  const recurringAhead = new Map<string, number>()
  for (const r of input.rules) {
    if (!r.is_active || r.type !== 'Expense') continue
    const k = key(r.category_id)
    const done = generateOccurrences(r, monthStart, today).length
    const ahead = daysLeft > 0 ? generateOccurrences(r, tomorrow, monthEnd).length : 0
    recurringToDate.set(k, (recurringToDate.get(k) ?? 0) + done * r.amount)
    recurringAhead.set(k, (recurringAhead.get(k) ?? 0) + ahead * r.amount)
  }

  const limits = new Map(budgets.filter((b) => b.monthly_limit > 0).map((b) => [b.category_id, b.monthly_limit]))
  const ids = new Set<string>([...spent.keys(), ...recurringAhead.keys(), ...limits.keys()])

  const categories: CategoryForecast[] = []
  let totalSpent = 0
  let totalProjected = 0
  let totalAhead = 0
  let totalDiscretionary = 0
  let totalBudget = 0
  let budgetedProjected = 0

  for (const id of ids) {
    const s = spent.get(id) ?? 0
    const ahead = recurringAhead.get(id) ?? 0
    const discretionary = Math.max(0, s - (recurringToDate.get(id) ?? 0))
    const rate = discretionary / daysElapsed
    const projected = round2(s + rate * daysLeft + ahead)
    const limit = limits.get(id) ?? null

    let runsOutDay: number | null = null
    if (limit !== null && s < limit && rate > 0) {
      const day = daysElapsed + Math.ceil((limit - s) / rate)
      if (day <= daysInMonth) runsOutDay = day
    }

    totalSpent += s
    totalProjected += projected
    totalAhead += ahead
    totalDiscretionary += discretionary
    if (limit !== null) {
      totalBudget += limit
      budgetedProjected += projected
    }

    categories.push({
      category_id: id === NO_CATEGORY ? null : id,
      spent: round2(s),
      projected,
      limit,
      projectedOver: limit === null ? null : round2(projected - limit),
      runsOutDay,
    })
  }

  return {
    spent: round2(totalSpent),
    projected: round2(totalProjected),
    upcomingRecurring: round2(totalAhead),
    dailyRate: round2(totalDiscretionary / daysElapsed),
    daysElapsed,
    daysLeft,
    daysInMonth,
    totalBudget: round2(totalBudget),
    budgetDelta: round2(budgetedProjected - totalBudget),
    lowConfidence: daysElapsed < LOW_CONFIDENCE_DAYS,
    categories: categories.sort((a, b) => b.projected - a.projected),
  }
}
