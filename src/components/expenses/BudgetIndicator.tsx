import { motion } from 'framer-motion'
import { AlertTriangle, AlertCircle } from 'lucide-react'
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

  // Over / near-limit is also spelled out with an icon and words — the bar
  // colour alone isn't enough for anyone who can't tell red from green.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ color: 'var(--text-muted)' }}>{budget.category?.name ?? 'Budget'}</span>
        <span style={{ color: isOver ? 'var(--accent-red)' : 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {isOver && <><AlertTriangle size={11} aria-hidden="true" />Over · </>}
          {isWarning && <><AlertCircle size={11} aria-hidden="true" style={{ color: 'var(--accent-amber)' }} />Near limit · </>}
          {formatCurrency(spent)} / {formatCurrency(budget.monthly_limit)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${budget.category?.name ?? 'Budget'} budget`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
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
