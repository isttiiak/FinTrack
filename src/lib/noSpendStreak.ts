import type { Transaction } from '@/types/expense.types'
import { parseDate, toISODateString } from '@/lib/utils'

export function computeNoSpendStreak(transactions: Transaction[], today: Date = new Date()): number {
  if (transactions.length === 0) return 0

  const spendDays = new Set(
    transactions
      .filter((t) => t.type === 'Expense')
      .map((t) => t.txn_date)
  )

  let streak = 0

  // Count back from today; stop at earliest known transaction date (no hard cap)
  const earliest = transactions.reduce((min, t) => (t.txn_date < min ? t.txn_date : min), toISODateString(today))
  const todayStart = parseDate(toISODateString(today))
  const earliestDate = parseDate(earliest)
  const maxDays = Math.max(1, Math.round((todayStart.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

  for (let i = 0; i < maxDays; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = toISODateString(d)
    if (spendDays.has(key)) break
    streak++
  }

  // Don't count today if it hasn't ended yet — only count completed no-spend days
  return Math.max(0, streak - 1)
}
