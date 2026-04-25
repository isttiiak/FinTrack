import { useMemo } from 'react'
import type { Transaction } from '@/types/expense.types'
import { toISODateString } from '@/lib/utils'

export function useNoSpendStreak(transactions: Transaction[]) {
  return useMemo(() => {
    const spendDays = new Set(
      transactions
        .filter((t) => t.type === 'Expense')
        .map((t) => t.txn_date)
    )

    let streak = 0
    const today = new Date()

    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = toISODateString(d)
      if (spendDays.has(key)) break
      streak++
    }

    // Don't count today if it hasn't ended yet — only count completed no-spend days
    return Math.max(0, streak - 1)
  }, [transactions])
}
