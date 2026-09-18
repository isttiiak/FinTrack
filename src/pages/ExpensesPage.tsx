import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Receipt, Filter, X, CalendarRange } from 'lucide-react'
import { useExpenses } from '@/hooks/useExpenses'
import { useBudgets } from '@/hooks/useBudgets'
import { useNoSpendStreak } from '@/hooks/useNoSpendStreak'
import ExpenseList from '@/components/expenses/ExpenseList'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import BudgetIndicator from '@/components/expenses/BudgetIndicator'
import QuickAddFAB from '@/components/expenses/QuickAddFAB'
import EmptyState from '@/components/common/EmptyState'
import ErrorBanner from '@/components/common/ErrorBanner'
import { SkeletonList } from '@/components/common/SkeletonCard'
import AnimatedNumber from '@/components/common/AnimatedNumber'
import MonthPicker from '@/components/common/MonthPicker'
import SearchToggle from '@/components/common/SearchToggle'
import type { Transaction, TransactionFilters } from '@/types/expense.types'
import { PAYMENT_METHODS } from '@/lib/constants'
import { formatCurrency, toISODateString } from '@/lib/utils'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { useIsExpensesOnly } from '@/hooks/useTrackingMode'
import './ExpensesPage.css'

export default function ExpensesPage() {
  const isExpensesOnly = useIsExpensesOnly()
  const now = new Date()
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [filterOpen, setFilterOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'All' | 'Expense' | 'Income'>('All')
  const [methodFilter, setMethodFilter] = useState<string>('All')
  const [groupFilter, setGroupFilter] = useState<string>('All')
  const [rangeMode, setRangeMode] = useState(false)
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [search, setSearch] = useState('')
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const [year, mon] = month.split('-').map(Number)
  const monthFrom = `${year}-${String(mon).padStart(2, '0')}-01`
  const monthTo   = toISODateString(new Date(year, mon, 0))

  const from = rangeMode ? (rangeFrom || null) : monthFrom
  const to   = rangeMode ? (rangeTo   || null) : monthTo

  const filters: TransactionFilters = {
    from, to,
    type: typeFilter === 'All' ? undefined : typeFilter,
    payment_method: methodFilter === 'All' ? undefined : (methodFilter as TransactionFilters['payment_method']),
    search: search.trim() || undefined,
  }

  const transactionsQ = useExpenses(filters)
  const { data: transactions = [], isLoading } = transactionsQ
  const { data: budgets = [] } = useBudgets()

  // The no-spend streak must be computed from the *unfiltered, all-time*
  // transaction list, not the month/type/method-filtered `transactions`
  // above — matches DashboardPage/AnalyticsPage. Passing the filtered list
  // here (as this page previously did) breaks in three ways: viewing a past
  // month counts every day since as "no-spend" (the hook counts back from
  // today, not from the viewed month); filtering to Income empties
  // spendDays entirely; filtering to one payment method treats days paid
  // another way as no-spend too. See TODO.md §3.2.
  const allTxnsQ = useExpenses({ from: '2000-01-01', to: toISODateString(new Date()) })
  const { data: allTxns = [] } = allTxnsQ
  const streak = useNoSpendStreak(allTxns)

  const mainGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const t of transactions) {
      if (t.category?.main_group) groups.add(t.category.main_group)
    }
    return Array.from(groups).sort()
  }, [transactions])

  const displayedTransactions = useMemo(() => {
    if (groupFilter === 'All') return transactions
    return transactions.filter((t) => t.category?.main_group === groupFilter)
  }, [transactions, groupFilter])

  const { totalExpense, totalIncome, categorySpend } = useMemo(() => {
    let totalExpense = 0
    let totalIncome = 0
    const categorySpend: Record<string, number> = {}

    for (const t of transactions) {   // always full-month totals, group filter only narrows the list
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

  const isCurrentMonth = !rangeMode && month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

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

      {(transactionsQ.isError || allTxnsQ.isError) && (
        <ErrorBanner onRetry={() => { transactionsQ.refetch(); allTxnsQ.refetch() }} />
      )}

      {/* Summary cards */}
      <motion.div
        className="expenses-summary"
        style={isExpensesOnly ? { gridTemplateColumns: '1fr' } : undefined}
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

        {!isExpensesOnly && (
          <motion.div className="summary-card summary-card-income" variants={staggerItem}>
            <div className="summary-label">Total income</div>
            <AnimatedNumber value={totalIncome} className="summary-value summary-value-income" />
            <div className="summary-sub">Net: {formatCurrency(totalIncome - totalExpense)}</div>
          </motion.div>
        )}
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
        {rangeMode ? (
          <div className="date-range-wrap">
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="range-date-input"
              placeholder="Start"
            />
            <span className="range-sep">→</span>
            <input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="range-date-input"
              placeholder="End"
            />
          </div>
        ) : (
          <MonthPicker value={month} onChange={setMonth} />
        )}
        <button
          className={cn('filter-toggle-btn', rangeMode && 'filter-toggle-active')}
          onClick={() => { setRangeMode((v) => !v); setRangeFrom(''); setRangeTo('') }}
          title={rangeMode ? 'Switch to month view' : 'Switch to date range'}
        >
          <CalendarRange size={14} /> {rangeMode ? 'Month' : 'Range'}
        </button>
        <button
          className={cn('filter-toggle-btn', filterOpen && 'filter-toggle-active')}
          onClick={() => setFilterOpen((v) => !v)}
        >
          <Filter size={14} /> Filters
          {(typeFilter !== 'All' || methodFilter !== 'All' || groupFilter !== 'All') && (
            <span className="filter-active-dot" />
          )}
        </button>
        <SearchToggle value={search} onChange={setSearch} placeholder="Search description…" className="expenses-search" />
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
                <div className="filter-group-header">
                  <label className="filter-label">Type</label>
                  {typeFilter !== 'All' && (
                    <button className="filter-group-clear" onClick={() => setTypeFilter('All')}>Clear</button>
                  )}
                </div>
                <div className="filter-chips">
                  {(isExpensesOnly ? (['All', 'Expense'] as const) : (['All', 'Expense', 'Income'] as const)).map((t) => (
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

              {/* Main group filter */}
              {mainGroups.length > 0 && (
                <div className="filter-group">
                  <div className="filter-group-header">
                    <label className="filter-label">Category group</label>
                    {groupFilter !== 'All' && (
                      <button className="filter-group-clear" onClick={() => setGroupFilter('All')}>Clear</button>
                    )}
                  </div>
                  <div className="filter-chips filter-chips-scroll">
                    <button
                      className={cn('filter-chip', groupFilter === 'All' && 'filter-chip-active')}
                      onClick={() => setGroupFilter('All')}
                    >
                      All
                    </button>
                    {mainGroups.map((g) => (
                      <button
                        key={g}
                        className={cn('filter-chip', groupFilter === g && 'filter-chip-active')}
                        onClick={() => setGroupFilter(g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment method filter */}
              <div className="filter-group">
                <div className="filter-group-header">
                  <label className="filter-label">Payment method</label>
                  {methodFilter !== 'All' && (
                    <button className="filter-group-clear" onClick={() => setMethodFilter('All')}>Clear</button>
                  )}
                </div>
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
              {(typeFilter !== 'All' || methodFilter !== 'All' || groupFilter !== 'All') && (
                <button
                  className="filter-clear-btn"
                  onClick={() => { setTypeFilter('All'); setMethodFilter('All'); setGroupFilter('All') }}
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
          <ExpenseList transactions={displayedTransactions} onEdit={setEditingTxn} />
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

    </motion.div>
  )
}
