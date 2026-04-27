import { formatCurrency } from './utils'
import type { Transaction } from '@/types/expense.types'
import type { PersonWithLedgers } from '@/types/ledger.types'

interface Budget { category_id: string; monthly_limit: number; category?: { name: string } | null }

// ── Category breakdown ────────────────────────────────────────────────────────
export function catBreakdown(txns: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const t of txns.filter((t) => t.type === 'Expense')) {
    const k = t.category?.name ?? 'Uncategorized'
    map[k] = (map[k] ?? 0) + t.amount
  }
  return map
}

// ── Monthly aggregates from a flat list ──────────────────────────────────────
export function monthlyAgg(txns: Transaction[]): Record<string, { expense: number; income: number }> {
  const map: Record<string, { expense: number; income: number }> = {}
  for (const t of txns) {
    const m = t.txn_date.slice(0, 7)
    if (!map[m]) map[m] = { expense: 0, income: 0 }
    if (t.type === 'Expense') map[m].expense += t.amount
    else map[m].income += t.amount
  }
  return map
}

// ── Primary context block used by most features ───────────────────────────────
export function buildMonthlyContext(
  thisTxns: Transaction[],
  allTxns: Transaction[],
  budgets: Budget[],
  selectedMonth: string,
): string {
  const catMap = catBreakdown(thisTxns)
  const topCats = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([n, v]) => `  ${n}: ${formatCurrency(v)}`)
    .join('\n')

  const totalExpense = Object.values(catMap).reduce((s, v) => s + v, 0)
  const totalIncome  = thisTxns.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0)

  // Last 3 month trend
  const monthly = monthlyAgg(allTxns)
  const sortedMonths = Object.keys(monthly).sort().slice(-4)
  const trend = sortedMonths
    .map((m) => `  ${m}: spent ${formatCurrency(monthly[m].expense)}, income ${formatCurrency(monthly[m].income)}`)
    .join('\n')

  // Budget performance
  const budgetLines = budgets
    .filter((b) => b.category)
    .map((b) => {
      const spent = catMap[b.category!.name ?? ''] ?? 0
      const pct = b.monthly_limit > 0 ? Math.round((spent / b.monthly_limit) * 100) : 0
      return `  ${b.category!.name}: budget ${formatCurrency(b.monthly_limit)}, spent ${formatCurrency(spent)} (${pct}%)`
    })
    .join('\n')

  return `Month: ${selectedMonth}
Total spent: ${formatCurrency(totalExpense)}
Total income: ${formatCurrency(totalIncome)}
Net: ${formatCurrency(totalIncome - totalExpense)}

Top spending categories:
${topCats || '  No data'}

Monthly trend (last 4 months):
${trend || '  No data'}

Budget performance:
${budgetLines || '  No budgets set'}`
}

// ── Debt context for Feature 15 ──────────────────────────────────────────────
export function buildDebtContext(persons: PersonWithLedgers[]): string {
  const lines: string[] = []
  for (const p of persons) {
    for (const e of p.ledgers) {
      if ((e.remaining ?? e.total_amount) > 0) {
        lines.push(
          `  ${p.name} (${e.ledger_type}): total ${formatCurrency(e.total_amount)}, ` +
          `remaining ${formatCurrency(e.remaining ?? e.total_amount)}, ` +
          `since ${e.start_date}` +
          (e.reason ? `, reason: ${e.reason}` : ''),
        )
      }
    }
  }
  return lines.length ? lines.join('\n') : '  No outstanding debts or lent amounts.'
}
