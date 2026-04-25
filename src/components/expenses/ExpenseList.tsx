import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { Transaction } from '@/types/expense.types'
import ExpenseCard, { expenseCardStyles } from './ExpenseCard'
import { formatCurrency, formatDateLabel } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/animations'

interface ExpenseListProps {
  transactions: Transaction[]
  onEdit: (txn: Transaction) => void
}

export default function ExpenseList({ transactions, onEdit }: ExpenseListProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const txn of transactions) {
      const key = txn.txn_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(txn)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions])

  if (transactions.length === 0) return null

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

      <style>{`
        .expense-list { display: flex; flex-direction: column; gap: 20px; }
        .expense-group { display: flex; flex-direction: column; gap: 6px; }
        .expense-group-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 4px 4px;
          border-bottom: 1px solid var(--border);
        }
        .expense-group-date { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
        .expense-group-total { font-size: 13px; font-weight: 600; }
        .expense-group-items { display: flex; flex-direction: column; gap: 6px; }
        ${expenseCardStyles}
      `}</style>
    </motion.div>
  )
}
