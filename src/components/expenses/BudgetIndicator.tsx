import { motion } from 'framer-motion'
import type { BudgetLimit } from '@/types/expense.types'
import { formatCurrency } from '@/lib/utils'

interface BudgetIndicatorProps {
  budget: BudgetLimit
  spent: number
}

export default function BudgetIndicator({ budget, spent }: BudgetIndicatorProps) {
  const pct = Math.min((spent / budget.monthly_limit) * 100, 100)
  const isOver = spent > budget.monthly_limit
  const isWarning = pct >= 80 && !isOver

  const barColor = isOver
    ? 'var(--accent-red)'
    : isWarning
    ? 'var(--accent-amber)'
    : 'var(--accent-primary)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'var(--text-muted)' }}>{budget.category?.name ?? 'Budget'}</span>
        <span style={{ color: isOver ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
          {formatCurrency(spent)} / {formatCurrency(budget.monthly_limit)}
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ height: '100%', background: barColor, borderRadius: 2 }}
        />
      </div>
    </div>
  )
}
