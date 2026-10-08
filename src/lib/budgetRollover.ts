// Opt-in budget rollover: last month's unspent amount is added to this
// month's limit, for budgets the user switched it on for.
//
// Deliberately simple so the number is easy to explain on screen
// ("৳5,000 + ৳500 rolled over"):
//   * one month only — what was left of last month's *base* limit, never a
//     chain of carried-over carry-overs that grows without bound
//   * never negative — overspending last month doesn't shrink this month
//   * only for budgets that existed before this month started, so a budget
//     created today doesn't inherit a whole unbudgeted month as "unspent"
import { round2 } from './utils'

export function carryoverAmount(opts: {
  rollover: boolean | null | undefined
  monthlyLimit: number
  lastMonthSpent: number
  createdAt: string          // budget row's created_at (ISO timestamp)
  monthStart: string         // 'YYYY-MM-01' of the month being viewed
}): number {
  if (!opts.rollover) return 0
  if (opts.createdAt.slice(0, 10) >= opts.monthStart) return 0
  return round2(Math.max(0, opts.monthlyLimit - opts.lastMonthSpent))
}

// 'YYYY-MM' → first and last day of the month before it.
export function previousMonthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const prevY = m === 1 ? y - 1 : y
  const prevM = m === 1 ? 12 : m - 1
  const last = new Date(prevY, prevM, 0).getDate()
  const mm = String(prevM).padStart(2, '0')
  return { from: `${prevY}-${mm}-01`, to: `${prevY}-${mm}-${String(last).padStart(2, '0')}` }
}
