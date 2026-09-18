import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Transaction } from '@/types/expense.types'
import ExpenseCard from './ExpenseCard'
import { formatCurrency, formatDateLabel } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/animations'

export type ExpenseSort = 'newest' | 'oldest' | 'highest' | 'lowest'

interface ExpenseListProps {
  transactions: Transaction[]
  onEdit: (txn: Transaction) => void
  sort?: ExpenseSort
}

export default function ExpenseList({ transactions, onEdit, sort = 'newest' }: ExpenseListProps) {
  const byAmount = sort === 'highest' || sort === 'lowest'

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const txn of transactions) {
      const key = txn.txn_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(txn)
    }
    const entries = Array.from(map.entries())
    return sort === 'oldest'
      ? entries.sort((a, b) => a[0].localeCompare(b[0]))
      : entries.sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions, sort])

  const flat = useMemo(() => {
    if (!byAmount) return []
    return [...transactions].sort((a, b) => (sort === 'highest' ? b.amount - a.amount : a.amount - b.amount))
  }, [transactions, sort, byAmount])

  if (transactions.length === 0) return null

  // Amount sorts can't keep date grouping — a flat ranked list instead.
  if (byAmount) {
    return (
      <motion.div className="expense-list" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div className="expense-group" variants={staggerItem}>
          <div className="expense-group-items">
            {flat.map((txn) => (
              <ExpenseCard key={txn.id} txn={txn} onEdit={onEdit} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="expense-list"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {grouped.map(([date, txns]) => {
        const dayTotal = txns.reduce((sum, t) => sum + (t.type === 'Expense' ? t.amount : -t.amount), 0)

        return (
          <motion.div key={date} className="expense-group" variants={staggerItem}>
            <div className="expense-group-header">
              <span className="expense-group-date">{formatDateLabel(date)}</span>
              <span className="expense-group-total" style={{ color: dayTotal > 0 ? 'var(--accent-coral)' : 'var(--accent-teal)' }}>
                {dayTotal > 0 ? '-' : '+'}{formatCurrency(Math.abs(dayTotal))}
              </span>
            </div>
            <div className="expense-group-items">
              {txns.map((txn) => (
                <ExpenseCard key={txn.id} txn={txn} onEdit={onEdit} />
              ))}
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
