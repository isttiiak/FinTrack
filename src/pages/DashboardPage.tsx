import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  Wallet, TrendingUp, Zap, Repeat,
  ArrowUpRight, ArrowDownRight, Users, ArrowRightLeft, ChevronRight,
} from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, toISODateString } from '@/lib/utils'
import { useExpenses } from '@/hooks/useExpenses'
import { usePersons } from '@/hooks/useLedger'
import { useNoSpendStreak } from '@/hooks/useNoSpendStreak'
import { useRecurringRules, useMaterializeRecurring } from '@/hooks/useRecurring'
import { generateOccurrences } from '@/lib/recurring'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { useIsExpensesOnly } from '@/hooks/useTrackingMode'
import MonthPicker from '@/components/common/MonthPicker'
import ErrorBanner from '@/components/common/ErrorBanner'
import './DashboardPage.css'

function getMonthRange(year: number, month0: number, offset = 0) {
  const from = toISODateString(new Date(year, month0 + offset, 1))
  const to   = toISODateString(new Date(year, month0 + offset + 1, 0))
  return { from, to }
}

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const firstName = profile?.full_name?.split(' ')[0] ?? null
  const isExpensesOnly = useIsExpensesOnly()

  // Stable per mount (not recreated every render) so the upcoming-bills
  // memo below doesn't get a new Date identity — and an unnecessary
  // recompute — on every unrelated re-render.
  const now = useMemo(() => new Date(), [])
  const [selectedMonth, setSelectedMonth] = useState(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  )
  const [selYear, selMon1] = selectedMonth.split('-').map(Number)
  const selMon0 = selMon1 - 1 // JS Date month is 0-indexed

  const thisMonth = getMonthRange(selYear, selMon0, 0)
  const lastMonth = getMonthRange(selYear, selMon0, -1)

  const yearFrom = toISODateString(new Date(selYear, 0, 1))
  const yearTo   = toISODateString(new Date(selYear, 11, 31))

  // All-time for streak
  const allTxnsQ = useExpenses({ from: '2000-01-01', to: toISODateString(new Date()) })
  const thisTxnsQ = useExpenses(thisMonth)
  const lastTxnsQ = useExpenses(lastMonth)
  const yearTxnsQ = useExpenses({ from: yearFrom, to: yearTo })
  const personsQ = usePersons()
  const recurringRulesQ = useRecurringRules()

  const { data: allTxns = [] } = allTxnsQ
  const { data: thisTxns = [], isLoading: loadingThis } = thisTxnsQ
  const { data: lastTxns = [] } = lastTxnsQ
  const { data: yearTxns = [] } = yearTxnsQ
  const { data: persons = [] } = personsQ
  const { data: recurringRules = [] } = recurringRulesQ

  // A failed fetch renders pixel-identical to "genuinely zero transactions"
  // otherwise — this dashboard alone fires 5 concurrent queries, so it's the
  // page most exposed to a single transient failure looking like missing data.
  const queries = [allTxnsQ, thisTxnsQ, lastTxnsQ, yearTxnsQ, personsQ, recurringRulesQ]
  const hasError = queries.some((q) => q.isError)
  const retryAll = () => queries.forEach((q) => q.refetch())

  // Materialize any due recurring transactions once per app open. Guarded
  // with a ref (not just an empty dep array) because StrictMode's dev-only
  // double-invoke would otherwise race two materialize() calls against the
  // same last_materialized_date and double-insert. materialize() itself
  // no-ops in demo mode and when nothing is due, so this is cheap even when
  // there's nothing to do.
  const { materialize } = useMaterializeRecurring()
  const addToast = useUIStore((s) => s.addToast)
  const materializedRef = useRef(false)
  useEffect(() => {
    if (materializedRef.current) return
    materializedRef.current = true
    materialize().then((result) => {
      if (!result) return
      addToast({
        type: 'success',
        message: `${result.count} recurring transaction${result.count !== 1 ? 's' : ''} added`,
        duration: 6000,
        action: { label: 'Undo', onClick: () => { result.undo() } },
      })
    })
  }, [materialize, addToast])

  const streak = useNoSpendStreak(allTxns)

  const thisExpense = useMemo(() => thisTxns.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0), [thisTxns])
  const thisIncome  = useMemo(() => thisTxns.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0), [thisTxns])
  const lastExpense = useMemo(() => lastTxns.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0), [lastTxns])
  const lastIncome  = useMemo(() => lastTxns.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0), [lastTxns])

  const expenseDelta = lastExpense > 0 ? ((thisExpense - lastExpense) / lastExpense) * 100 : null
  const incomeDelta  = lastIncome  > 0 ? ((thisIncome  - lastIncome)  / lastIncome)  * 100 : null
  const yearExpense  = useMemo(() => yearTxns.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0), [yearTxns])

  const totalLent = useMemo(() => persons.reduce((s, p) => s + p.total_outstanding_lent, 0), [persons])
  const totalDebt = useMemo(() => persons.reduce((s, p) => s + p.total_outstanding_debt, 0), [persons])
  const netLedger = totalLent - totalDebt

  // Biggest expense category this month
  const topCategory = useMemo(() => {
    const map: Record<string, { name: string; amount: number }> = {}
    thisTxns.filter((t) => t.type === 'Expense' && t.category).forEach((t) => {
      const key = t.category_id ?? ''
      const name = t.category?.name ?? 'Unknown'
      if (!map[key]) map[key] = { name, amount: 0 }
      map[key].amount += t.amount
    })
    const entries = Object.values(map).sort((a, b) => b.amount - a.amount)
    return entries[0] ?? null
  }, [thisTxns])

  // Recent 5 transactions
  const recentTxns = thisTxns.slice(0, 5)

  const monthLabel = new Date(selYear, selMon0, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const isCurrentMonth = selYear === now.getFullYear() && selMon0 === now.getMonth()

  // "Upcoming this month" only makes sense relative to the real current
  // month, not whichever month MonthPicker happens to be browsing — a
  // bill due next Tuesday is meaningless context while looking at March.
  // Expense rules only ("bills"); a due salary isn't something to warn about.
  const upcomingRecurring = useMemo(() => {
    if (!isCurrentMonth) return { total: 0, items: [] as { rule: typeof recurringRules[number]; date: string }[] }
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const items: { rule: typeof recurringRules[number]; date: string }[] = []
    let total = 0
    for (const rule of recurringRules) {
      if (!rule.is_active || rule.type !== 'Expense') continue
      for (const date of generateOccurrences(rule, tomorrow, endOfThisMonth)) {
        items.push({ rule, date })
        total += rule.amount
      }
    }
    items.sort((a, b) => a.date.localeCompare(b.date))
    return { total, items }
  }, [recurringRules, isCurrentMonth, now])

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="dash-page">
      {/* Greeting */}
      <motion.div variants={staggerItem} className="dash-greeting-row">
        <div>
          <h1 className="dash-title">
            {firstName ? `Hey, ${firstName} 👋` : 'Dashboard'}
          </h1>
          <p className="dash-subtitle">{monthLabel} · Your financial snapshot</p>
        </div>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </motion.div>

      {hasError && <ErrorBanner onRetry={retryAll} />}

      {/* KPI grid */}
      <motion.div className="dash-kpi-grid" variants={staggerContainer}>

        {/* Spent this month */}
        <motion.div className="dash-kpi dash-kpi-coral" variants={staggerItem} whileHover={{ scale: 1.02 }}>
          <div className="dash-kpi-icon"><Wallet size={17} /></div>
          <div className="dash-kpi-label">{isCurrentMonth ? 'Spent this month' : `Spent in ${monthLabel.split(' ')[0]}`}</div>
          <div className="dash-kpi-value">
            {loadingThis ? <span className="dash-kpi-skeleton" /> : formatCurrency(thisExpense)}
          </div>
          {expenseDelta !== null && (
            <div className={`dash-kpi-delta ${expenseDelta > 0 ? 'dash-delta-bad' : 'dash-delta-good'}`}>
              {expenseDelta > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(expenseDelta).toFixed(1)}% vs last month
            </div>
          )}
        </motion.div>

        {/* Income this month — hidden in Expenses-only mode */}
        {!isExpensesOnly && (
          <motion.div className="dash-kpi dash-kpi-teal" variants={staggerItem} whileHover={{ scale: 1.02 }}>
            <div className="dash-kpi-icon"><TrendingUp size={17} /></div>
            <div className="dash-kpi-label">{isCurrentMonth ? 'Income this month' : `Income in ${monthLabel.split(' ')[0]}`}</div>
            <div className="dash-kpi-value">
              {loadingThis ? <span className="dash-kpi-skeleton" /> : formatCurrency(thisIncome)}
            </div>
            {incomeDelta !== null && (
              <div className={`dash-kpi-delta ${incomeDelta >= 0 ? 'dash-delta-good' : 'dash-delta-bad'}`}>
                {incomeDelta >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(incomeDelta).toFixed(1)}% vs last month
              </div>
            )}
          </motion.div>
        )}

        {/* No-spend streak */}
        <motion.div className="dash-kpi dash-kpi-purple" variants={staggerItem} whileHover={{ scale: 1.02 }}>
          <div className="dash-kpi-icon"><Zap size={17} /></div>
          <div className="dash-kpi-label">No-spend streak</div>
          <div className="dash-kpi-value">{streak} day{streak !== 1 ? 's' : ''}</div>
          <div className="dash-kpi-delta dash-delta-neutral">
            {streak === 0 ? 'Spent today' : streak === 1 ? 'Yesterday was clean!' : 'Keep it going!'}
          </div>
        </motion.div>

        {/* Net ledger position */}
        <motion.div className={`dash-kpi ${netLedger >= 0 ? 'dash-kpi-teal' : 'dash-kpi-coral'}`} variants={staggerItem} whileHover={{ scale: 1.02 }}>
          <div className="dash-kpi-icon"><ArrowRightLeft size={17} /></div>
          <div className="dash-kpi-label">Net ledger position</div>
          <div className="dash-kpi-value" style={{ color: netLedger >= 0 ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
            {netLedger >= 0 ? '+' : '−'}{formatCurrency(Math.abs(netLedger))}
          </div>
          <div className="dash-kpi-delta dash-delta-neutral">
            {totalLent > 0 && `↑ ${formatCurrency(totalLent)} owed to you`}
            {totalLent > 0 && totalDebt > 0 && ' · '}
            {totalDebt > 0 && `↓ ${formatCurrency(totalDebt)} you owe`}
            {totalLent === 0 && totalDebt === 0 && 'All clear'}
          </div>
        </motion.div>

        {/* Yearly total */}
        <motion.div className="dash-kpi dash-kpi-amber" variants={staggerItem} whileHover={{ scale: 1.02 }}>
          <div className="dash-kpi-icon"><TrendingUp size={17} /></div>
          <div className="dash-kpi-label">Spent this year</div>
          <div className="dash-kpi-value">{formatCurrency(yearExpense)}</div>
          <div className="dash-kpi-delta dash-delta-neutral">{selYear} total expenses</div>
        </motion.div>

      </motion.div>

      {/* Two-column section: top category + recent transactions */}
      <div className="dash-bottom-grid">

        {/* Top category */}
        <motion.div className="dash-card" variants={staggerItem}>
          <div className="dash-card-header">
            <h3 className="dash-card-title">Top category</h3>
            <Link to="/expenses" className="dash-card-link">View all <ChevronRight size={13} /></Link>
          </div>
          {topCategory ? (
            <div className="dash-top-cat">
              <div className="dash-top-cat-name">{topCategory.name}</div>
              <div className="dash-top-cat-amount">{formatCurrency(topCategory.amount)}</div>
              <div className="dash-top-cat-bar-wrap">
                <div
                  className="dash-top-cat-bar"
                  style={{ width: `${Math.min(100, (topCategory.amount / Math.max(thisExpense, 1)) * 100)}%` }}
                />
              </div>
              <p className="dash-top-cat-pct">
                {thisExpense > 0
                  ? `${((topCategory.amount / thisExpense) * 100).toFixed(0)}% of total spending`
                  : 'No spending yet'}
              </p>
            </div>
          ) : (
            <div className="dash-card-empty">No expenses logged this month.</div>
          )}
        </motion.div>

        {/* Ledger snapshot */}
        <motion.div className="dash-card" variants={staggerItem}>
          <div className="dash-card-header">
            <h3 className="dash-card-title">Ledger snapshot</h3>
            <Link to="/ledger" className="dash-card-link">View all <ChevronRight size={13} /></Link>
          </div>
          {persons.length === 0 ? (
            <div className="dash-card-empty">No ledger entries yet.</div>
          ) : (
            <div className="dash-ledger-list">
              {persons
                .filter((p) => p.total_outstanding_lent + p.total_outstanding_debt > 0)
                .slice(0, 4)
                .map((p) => {
                  const net = p.total_outstanding_lent - p.total_outstanding_debt
                  return (
                    <Link key={p.id} to="/ledger/$personId" params={{ personId: p.id }} className="dash-ledger-row">
                      <div className="dash-ledger-avatar">{p.name[0]?.toUpperCase()}</div>
                      <div className="dash-ledger-info">
                        <span className="dash-ledger-name">{p.name}</span>
                        {p.relationship && <span className="dash-ledger-rel">{p.relationship}</span>}
                      </div>
                      <div className={`dash-ledger-net ${net >= 0 ? 'dash-net-pos' : 'dash-net-neg'}`}>
                        {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}
                      </div>
                    </Link>
                  )
                })}
              {persons.filter((p) => p.total_outstanding_lent + p.total_outstanding_debt === 0).length > 0 && (
                <p className="dash-ledger-settled-note">
                  +{persons.filter((p) => p.total_outstanding_lent + p.total_outstanding_debt === 0).length} settled
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Recent transactions */}
        <motion.div className="dash-card dash-card-wide" variants={staggerItem}>
          <div className="dash-card-header">
            <h3 className="dash-card-title">Recent transactions</h3>
            <Link to="/expenses" className="dash-card-link">View all <ChevronRight size={13} /></Link>
          </div>
          {recentTxns.length === 0 ? (
            <div className="dash-card-empty">No transactions this month.</div>
          ) : (
            <div className="dash-recent-list">
              {recentTxns.map((t) => (
                <div key={t.id} className="dash-recent-row">
                  <div className="dash-recent-cat-dot" style={{
                    background: t.type === 'Income'
                      ? 'linear-gradient(135deg,#4FA981,#3E9B72)'
                      : 'linear-gradient(135deg,#C9736E,#C25B55)',
                  }} />
                  <div className="dash-recent-info">
                    <span className="dash-recent-desc">{t.description || t.category?.name || 'No description'}</span>
                    <span className="dash-recent-cat">{t.category?.name ?? '—'} · {t.txn_date}</span>
                  </div>
                  <div className={`dash-recent-amount ${t.type === 'Income' ? 'dash-amount-income' : 'dash-amount-expense'}`}>
                    {t.type === 'Income' ? '+' : '−'}{formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Lent vs Debt bar */}
        {(totalLent > 0 || totalDebt > 0) && (
          <motion.div className="dash-card" variants={staggerItem}>
            <div className="dash-card-header">
              <h3 className="dash-card-title">Lent vs Debt</h3>
              <Link to="/ledger" className="dash-card-link"><Users size={13} /> {persons.length} people</Link>
            </div>
            <div className="dash-lv-bars">
              <div className="dash-lv-row">
                <span className="dash-lv-label">They owe you</span>
                <span className="dash-lv-amount dash-net-pos">{formatCurrency(totalLent)}</span>
              </div>
              <div className="dash-lv-bar-wrap">
                <div className="dash-lv-bar dash-lv-bar-lent"
                  style={{ width: `${totalLent + totalDebt > 0 ? (totalLent / (totalLent + totalDebt)) * 100 : 0}%` }}
                />
              </div>
              <div className="dash-lv-row" style={{ marginTop: 12 }}>
                <span className="dash-lv-label">You owe them</span>
                <span className="dash-lv-amount dash-net-neg">{formatCurrency(totalDebt)}</span>
              </div>
              <div className="dash-lv-bar-wrap">
                <div className="dash-lv-bar dash-lv-bar-debt"
                  style={{ width: `${totalLent + totalDebt > 0 ? (totalDebt / (totalLent + totalDebt)) * 100 : 0}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Upcoming recurring bills — only meaningful while viewing the real current month */}
        {isCurrentMonth && upcomingRecurring.items.length > 0 && (
          <motion.div className="dash-card" variants={staggerItem}>
            <div className="dash-card-header">
              <h3 className="dash-card-title">Upcoming this month</h3>
              <Link to="/settings/recurring" className="dash-card-link"><Repeat size={13} /> Manage</Link>
            </div>
            <div className="dash-upcoming-total">{formatCurrency(upcomingRecurring.total)}</div>
            <p className="dash-upcoming-sub">
              in {upcomingRecurring.items.length} recurring bill{upcomingRecurring.items.length !== 1 ? 's' : ''}
            </p>
            <div className="dash-recent-list">
              {upcomingRecurring.items.slice(0, 4).map(({ rule, date }, i) => (
                <div key={`${rule.id}-${date}-${i}`} className="dash-recent-row">
                  <div className="dash-recent-cat-dot" style={{ background: 'linear-gradient(135deg,#C9736E,#C25B55)' }} />
                  <div className="dash-recent-info">
                    <span className="dash-recent-desc">{rule.description || rule.category?.name || 'Recurring bill'}</span>
                    <span className="dash-recent-cat">{date}</span>
                  </div>
                  <div className="dash-recent-amount dash-amount-expense">−{formatCurrency(rule.amount)}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>

    </motion.div>
  )
}
