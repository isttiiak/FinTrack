import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  Wallet, TrendingUp, Zap,
  ArrowUpRight, ArrowDownRight, Users, ArrowRightLeft, ChevronRight,
} from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, toISODateString } from '@/lib/utils'
import { useExpenses } from '@/hooks/useExpenses'
import { usePersons } from '@/hooks/useLedger'
import { useNoSpendStreak } from '@/hooks/useNoSpendStreak'
import { useAuthStore } from '@/stores/authStore'

function getMonthRange(offset = 0) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + offset
  const from = toISODateString(new Date(y, m, 1))
  const to   = toISODateString(new Date(y, m + 1, 0))
  return { from, to }
}

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile)
  const firstName = profile?.full_name?.split(' ')[0] ?? null

  const thisMonth = getMonthRange(0)
  const lastMonth = getMonthRange(-1)

  const now2 = new Date()
  const yearFrom = toISODateString(new Date(now2.getFullYear(), 0, 1))
  const yearTo   = toISODateString(new Date(now2.getFullYear(), 11, 31))

  // All-time for streak
  const { data: allTxns = [] } = useExpenses({ from: '2000-01-01', to: toISODateString(new Date()) })
  const { data: thisTxns = [], isLoading: loadingThis } = useExpenses(thisMonth)
  const { data: lastTxns = [] } = useExpenses(lastMonth)
  const { data: yearTxns = [] } = useExpenses({ from: yearFrom, to: yearTo })
  const { data: persons = [] } = usePersons()

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

  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="dash-page">
      {/* Greeting */}
      <motion.div variants={staggerItem} className="dash-greeting">
        <h1 className="dash-title">
          {firstName ? `Hey, ${firstName} 👋` : 'Dashboard'}
        </h1>
        <p className="dash-subtitle">{monthLabel} · Your financial snapshot</p>
      </motion.div>

      {/* KPI grid */}
      <motion.div className="dash-kpi-grid" variants={staggerContainer}>

        {/* Spent this month */}
        <motion.div className="dash-kpi dash-kpi-coral" variants={staggerItem} whileHover={{ scale: 1.02 }}>
          <div className="dash-kpi-icon"><Wallet size={17} /></div>
          <div className="dash-kpi-label">Spent this month</div>
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

        {/* Income this month */}
        <motion.div className="dash-kpi dash-kpi-teal" variants={staggerItem} whileHover={{ scale: 1.02 }}>
          <div className="dash-kpi-icon"><TrendingUp size={17} /></div>
          <div className="dash-kpi-label">Income this month</div>
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
          <div className="dash-kpi-delta dash-delta-neutral">{now2.getFullYear()} total expenses</div>
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
                      ? 'linear-gradient(135deg,#10B981,#06B6D4)'
                      : 'linear-gradient(135deg,#F97316,#EF4444)',
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

      </div>

      <style>{`
        .dash-page { max-width: 960px; }
        .dash-greeting { margin-bottom: 24px; }
        .dash-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .dash-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

        /* KPI grid */
        .dash-kpi-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 12px; margin-bottom: 16px;
        }
        @media (max-width: 400px) { .dash-kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; } }
        .dash-kpi {
          border-radius: 16px; padding: 18px; border: 1px solid var(--border);
          cursor: default;
        }
        .dash-kpi-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
        }
        .dash-kpi-coral { background: rgba(249,115,22,0.05); border-color: rgba(249,115,22,0.15); }
        .dash-kpi-coral .dash-kpi-icon { background: rgba(249,115,22,0.15); color: var(--accent-coral); }
        .dash-kpi-coral .dash-kpi-value { color: var(--accent-coral); }
        .dash-kpi-teal { background: rgba(16,185,129,0.05); border-color: rgba(16,185,129,0.12); }
        .dash-kpi-teal .dash-kpi-icon { background: rgba(16,185,129,0.15); color: var(--accent-teal); }
        .dash-kpi-teal .dash-kpi-value { color: var(--accent-teal); }
        .dash-kpi-purple { background: rgba(108,99,255,0.05); border-color: rgba(108,99,255,0.12); }
        .dash-kpi-purple .dash-kpi-icon { background: rgba(108,99,255,0.15); color: var(--accent-primary); }
        .dash-kpi-purple .dash-kpi-value { color: var(--accent-primary); }
        .dash-kpi-amber { background: rgba(245,158,11,0.05); border-color: rgba(245,158,11,0.12); }
        .dash-kpi-amber .dash-kpi-icon { background: rgba(245,158,11,0.15); color: var(--accent-amber); }
        .dash-kpi-amber .dash-kpi-value { color: var(--accent-amber); }
        .dash-kpi-label { font-size: 11px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
        .dash-kpi-value { font-size: 24px; font-weight: 700; margin-bottom: 6px; min-height: 30px; }
        .dash-kpi-skeleton {
          display: inline-block; width: 80px; height: 24px; border-radius: 6px;
          background: var(--bg-elevated); animation: shimmer 1.5s infinite;
          background: linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-hover) 50%, var(--bg-elevated) 75%);
          background-size: 200% 100%;
        }
        .dash-kpi-delta { font-size: 11px; display: flex; align-items: center; gap: 3px; }
        .dash-delta-bad { color: #F97316; }
        .dash-delta-good { color: var(--accent-teal); }
        .dash-delta-neutral { color: var(--text-muted); }

        /* Bottom grid */
        .dash-bottom-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
        }
        @media (max-width: 680px) { .dash-bottom-grid { grid-template-columns: 1fr; gap: 10px; } }
        .dash-card-wide { grid-column: 1 / -1; }

        .dash-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
          padding: 18px;
        }
        .dash-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .dash-card-title { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0; }
        .dash-card-link {
          display: flex; align-items: center; gap: 4px;
          font-size: 12px; color: var(--accent-primary); text-decoration: none; font-weight: 500;
        }
        .dash-card-link:hover { text-decoration: underline; }
        .dash-card-empty { font-size: 13px; color: var(--text-muted); padding: 8px 0; }

        /* Top category */
        .dash-top-cat { }
        .dash-top-cat-name { font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .dash-top-cat-amount { font-size: 15px; font-weight: 600; color: var(--accent-coral); margin-bottom: 10px; }
        .dash-top-cat-bar-wrap {
          height: 6px; border-radius: 3px; background: var(--bg-elevated); margin-bottom: 6px; overflow: hidden;
        }
        .dash-top-cat-bar {
          height: 100%; border-radius: 3px;
          background: linear-gradient(90deg, #F97316, #EF4444);
          transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
        }
        .dash-top-cat-pct { font-size: 12px; color: var(--text-muted); margin: 0; }

        /* Ledger snapshot */
        .dash-ledger-list { display: flex; flex-direction: column; gap: 4px; }
        .dash-ledger-row {
          display: flex; align-items: center; gap: 10px; padding: 8px;
          border-radius: 10px; text-decoration: none; transition: background 0.12s;
        }
        .dash-ledger-row:hover { background: var(--bg-elevated); }
        .dash-ledger-avatar {
          width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
          background: rgba(108,99,255,0.15); color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700;
        }
        .dash-ledger-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
        .dash-ledger-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .dash-ledger-rel { font-size: 11px; color: var(--text-muted); }
        .dash-ledger-net { font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .dash-net-pos { color: var(--accent-teal); }
        .dash-net-neg { color: var(--accent-coral); }
        .dash-ledger-settled-note { font-size: 11px; color: var(--text-muted); margin: 4px 0 0; padding: 0 8px; }

        /* Recent transactions */
        .dash-recent-list { display: flex; flex-direction: column; gap: 4px; }
        .dash-recent-row {
          display: flex; align-items: center; gap: 12px; padding: 8px;
          border-radius: 10px; transition: background 0.12s;
        }
        .dash-recent-row:hover { background: var(--bg-elevated); }
        .dash-recent-cat-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .dash-recent-info { flex: 1; min-width: 0; }
        .dash-recent-desc { font-size: 13px; font-weight: 500; color: var(--text-primary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dash-recent-cat { font-size: 11px; color: var(--text-muted); }
        .dash-recent-amount { font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .dash-amount-income { color: var(--accent-teal); }
        .dash-amount-expense { color: var(--accent-coral); }

        /* Lent vs Debt bars */
        .dash-lv-bars { }
        .dash-lv-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .dash-lv-label { font-size: 12px; color: var(--text-secondary); }
        .dash-lv-amount { font-size: 13px; font-weight: 700; }
        .dash-lv-bar-wrap { height: 8px; border-radius: 4px; background: var(--bg-elevated); overflow: hidden; margin-bottom: 4px; }
        .dash-lv-bar { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .dash-lv-bar-lent { background: linear-gradient(90deg, #10B981, #06B6D4); }
        .dash-lv-bar-debt { background: linear-gradient(90deg, #F97316, #EF4444); }

        @keyframes shimmer { to { background-position: -200% 0; } }
      `}</style>
    </motion.div>
  )
}
