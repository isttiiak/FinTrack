import { useMemo } from 'react'
import type { Transaction } from '@/types/expense.types'
import { computeNoSpendStreak } from '@/lib/noSpendStreak'

export function useNoSpendStreak(transactions: Transaction[]) {
  return useMemo(() => computeNoSpendStreak(transactions), [transactions])
}
