import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Receipt, Filter, X } from 'lucide-react'
import { useExpenses } from '@/hooks/useExpenses'
import { useBudgets } from '@/hooks/useBudgets'
import { useNoSpendStreak } from '@/hooks/useNoSpendStreak'
import ExpenseList from '@/components/expenses/ExpenseList'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import BudgetIndicator from '@/components/expenses/BudgetIndicator'
import QuickAddFAB from '@/components/expenses/QuickAddFAB'
import EmptyState from '@/components/common/EmptyState'
import { SkeletonList } from '@/components/common/SkeletonCard'
import AnimatedNumber from '@/components/common/AnimatedNumber'
import type { Transaction, TransactionFilters } from '@/types/expense.types'
import { PAYMENT_METHODS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="month-picker">
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="month-input"
      />
    </div>
  )
}

export default function ExpensesPage() {
  const now = new Date()
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [filterOpen, setFilterOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'All' | 'Expense' | 'Income'>('All')
  const [methodFilter, setMethodFilter] = useState<string>('All')
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const [year, mon] = month.split('-').map(Number)
  const from = `${year}-${String(mon).padStart(2, '0')}-01`
  const to = new Date(year, mon, 0).toISOString().split('T')[0]

  const filters: TransactionFilters = {
    from, to,
    type: typeFilter === 'All' ? undefined : typeFilter,
    payment_method: methodFilter === 'All' ? undefined : (methodFilter as TransactionFilters['payment_method']),
  }

  const { data: transactions = [], isLoading } = useExpenses(filters)
  const { data: budgets = [] } = useBudgets()
  const streak = useNoSpendStreak(transactions)

  const { totalExpense, totalIncome, categorySpend } = useMemo(() => {
    let totalExpense = 0
    let totalIncome = 0
    const categorySpend: Record<string, number> = {}

    for (const t of transactions) {
      if (t.type === 'Expense') {
        totalExpense += t.amount
        if (t.category_id) categorySpend[t.category_id] = (categorySpend[t.category_id] ?? 0) + t.amount
      } else {
        totalIncome += t.amount
      }
    }

    return { totalExpense, totalIncome, categorySpend }
  }, [transactions])

  const budgetsWithSpend = budgets.map((b) => ({
    ...b,
    spent: categorySpend[b.category_id] ?? 0,
  })).filter((b) => b.monthly_limit > 0)

  const isCurrentMonth = month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="expenses-page"
    >
      {/* Header */}
      <div className="expenses-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track income and spending</p>
        </div>
        <motion.button
          className="btn-primary expenses-add-btn"
          onClick={() => setAddOpen(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={16} /> Add
        </motion.button>
      </div>

      {/* Summary cards */}
      <motion.div
        className="expenses-summary"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="summary-card summary-card-expense" variants={staggerItem}>
          <div className="summary-label">Total spent</div>
          <AnimatedNumber value={totalExpense} className="summary-value" />
          {isCurrentMonth && streak > 0 && (
            <div className="summary-sub">🔥 {streak}-day no-spend streak</div>
          )}
        </motion.div>

        <motion.div className="summary-card summary-card-income" variants={staggerItem}>
          <div className="summary-label">Total income</div>
          <AnimatedNumber value={totalIncome} className="summary-value summary-value-income" />
          <div className="summary-sub">Net: {formatCurrency(totalIncome - totalExpense)}</div>
        </motion.div>
      </motion.div>

      {/* Budget indicators */}
      <AnimatePresence>
        {budgetsWithSpend.length > 0 && (
          <motion.div
            className="budgets-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="section-label">Budget progress</p>
            <div className="budgets-grid">
              {budgetsWithSpend.map((b) => (
                <BudgetIndicator key={b.id} budget={b} spent={b.spent} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters row */}
      <div className="filters-row">
        <MonthPicker value={month} onChange={setMonth} />
        <button
          className={cn('filter-toggle-btn', filterOpen && 'filter-toggle-active')}
          onClick={() => setFilterOpen((v) => !v)}
        >
          <Filter size={14} /> Filters
          {(typeFilter !== 'All' || methodFilter !== 'All') && (
            <span className="filter-active-dot" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <motion.div
            className="filters-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="filters-inner">
              {/* Type filter */}
              <div className="filter-group">
                <label className="filter-label">Type</label>
                <div className="filter-chips">
                  {(['All', 'Expense', 'Income'] as const).map((t) => (
                    <button
                      key={t}
                      className={cn('filter-chip', typeFilter === t && 'filter-chip-active')}
                      onClick={() => setTypeFilter(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method filter */}
              <div className="filter-group">
                <label className="filter-label">Payment method</label>
                <div className="filter-chips">
                  {(['All', ...PAYMENT_METHODS] as const).map((m) => (
                    <button
                      key={m}
                      className={cn('filter-chip', methodFilter === m && 'filter-chip-active')}
                      onClick={() => setMethodFilter(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {(typeFilter !== 'All' || methodFilter !== 'All') && (
                <button
                  className="filter-clear-btn"
                  onClick={() => { setTypeFilter('All'); setMethodFilter('All') }}
                >
                  <X size={13} /> Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction list */}
      <div className="expenses-list-area">
        {isLoading ? (
          <SkeletonList count={6} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt size={44} />}
            title="No transactions yet"
            description="Add your first transaction using the + button above or the floating button."
            action={
              <button className="btn-primary" onClick={() => setAddOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={15} /> Add transaction
              </button>
            }
          />
        ) : (
          <ExpenseList transactions={transactions} onEdit={setEditingTxn} />
        )}
      </div>

      {/* Add / Edit form modal */}
      <AnimatePresence>
        {addOpen && <ExpenseForm onClose={() => setAddOpen(false)} />}
        {editingTxn && (
          <ExpenseForm editing={editingTxn} onClose={() => setEditingTxn(null)} />
        )}
      </AnimatePresence>

      {/* FAB */}
      <QuickAddFAB />

      <style>{`
        .expenses-page { max-width: 860px; padding-bottom: 80px; }

        .expenses-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
        .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }
        .expenses-add-btn { display: flex; align-items: center; gap: 8px; padding: 9px 18px; font-size: 13px; }

        .expenses-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        @media (max-width: 400px) { .expenses-summary { grid-template-columns: 1fr; } }

        .summary-card {
          padding: 18px 20px; border-radius: 14px;
          background: var(--bg-card); border: 1px solid var(--border);
        }
        .summary-card-expense { border-left: 3px solid var(--accent-coral); }
        .summary-card-income  { border-left: 3px solid var(--accent-teal); }
        .summary-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .summary-value { font-size: 24px; font-weight: 700; color: var(--text-primary); display: block; }
        .summary-value-income { color: var(--accent-teal); }
        .summary-sub { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

        .budgets-section { margin-bottom: 16px; overflow: hidden; }
        .section-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px; }
        .budgets-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }

        .filters-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }

        .month-picker {}
        .month-input {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px;
          color: var(--text-primary); font-size: 13px; padding: 7px 12px;
          cursor: pointer;
        }
        .month-input:focus { outline: none; border-color: var(--border-focus); }

        .filter-toggle-btn {
          display: flex; align-items: center; gap: 6px; position: relative;
          padding: 7px 14px; border-radius: 8px; font-size: 13px;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          cursor: pointer; transition: background 0.15s, color 0.15s;
        }
        .filter-toggle-btn:hover, .filter-toggle-active { background: var(--bg-hover); color: var(--text-primary); border-color: var(--border-focus); }
        .filter-active-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-primary); }

        .filters-panel { overflow: hidden; margin-bottom: 12px; }
        .filters-inner {
          padding: 14px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .filter-group { display: flex; flex-direction: column; gap: 6px; }
        .filter-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .filter-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .filter-chip {
          padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          cursor: pointer; transition: all 0.15s;
        }
        .filter-chip:hover { background: var(--bg-hover); color: var(--text-primary); }
        .filter-chip-active { background: rgba(108,99,255,0.15); color: var(--accent-primary); border-color: rgba(108,99,255,0.35); }

        .filter-clear-btn {
          display: flex; align-items: center; gap: 5px; align-self: flex-start;
          padding: 4px 10px; border-radius: 8px; font-size: 12px;
          background: none; border: 1px solid rgba(239,68,68,0.3); color: var(--accent-red);
          cursor: pointer;
        }
        .filter-clear-btn:hover { background: rgba(239,68,68,0.1); }

        .expenses-list-area { margin-top: 8px; }
      `}</style>
    </motion.div>
  )
}
