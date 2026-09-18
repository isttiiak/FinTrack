import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, getActiveCurrencySymbol, toISODateString } from '@/lib/utils'
import { useExpenses } from '@/hooks/useExpenses'
import { useBudgets } from '@/hooks/useBudgets'
import { useNoSpendStreak } from '@/hooks/useNoSpendStreak'
import AIHub from '@/components/ai/AIHub'
import ErrorBanner from '@/components/common/ErrorBanner'
import { useIsExpensesOnly } from '@/hooks/useTrackingMode'
import './AnalyticsPage.css'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}
function fmtK(v: number) {
  const symbol = getActiveCurrencySymbol()
  if (v >= 100000) return `${symbol}${(v / 1000).toFixed(0)}k`
  if (v >= 10000)  return `${symbol}${(v / 1000).toFixed(1)}k`
  return `${symbol}${v.toLocaleString()}`
}

// Deliberately literal hex, not var(--accent-*) tokens: the new Emerald & Gold
// palette intentionally collapses several semantic tokens to the same value
// (accent-teal === accent-primary, accent-amber === accent-gold), which is
// fine for single-value usage but would silently merge two category slices
// into an indistinguishable color in this donut/legend. These 10 are curated
// to stay visually distinct while remaining inside the muted emerald/gold family.
const CHART_COLORS = [
  '#4FA981', '#C2A24E', '#C9736E', '#3E9B72',
  '#C25B55', '#B4923F', '#8A968C',
  '#B5677A', '#6B8CAE', '#5FA88F',
]
const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10,
    color: 'var(--text-primary)', fontSize: 12,
  },
  itemStyle: { color: 'var(--text-primary)' },
  labelStyle: { color: 'var(--text-secondary)', marginBottom: 4 },
}

type Tab = 'overview' | 'habits' | 'ai'

export default function AnalyticsPage() {
  const isExpensesOnly = useIsExpensesOnly()
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })

  // Data queries
  const twelveAgo = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 11); d.setDate(1)
    return toISODateString(d)
  }, [])
  const allTxnsQ  = useExpenses({ from: twelveAgo, to: toISODateString(new Date()) })
  // End-of-month bound must be derived from selectedMonth, not "today" —
  // using today's date here ignored the month picker entirely for any month
  // other than the current one.
  const selectedMonthRange = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    return { from: `${selectedMonth}-01`, to: toISODateString(new Date(y, m, 0)) }
  }, [selectedMonth])
  const thisTxnsQ = useExpenses(selectedMonthRange)
  const { data: allTxns = [] }  = allTxnsQ
  const { data: thisTxns = [] } = thisTxnsQ
  const hasError = allTxnsQ.isError || thisTxnsQ.isError
  const retryAll = () => { allTxnsQ.refetch(); thisTxnsQ.refetch() }
  const { data: budgets = [] }  = useBudgets()
  const streak = useNoSpendStreak(allTxns)

  // Monthly trend
  const trendData = useMemo(() => {
    const map: Record<string, { month: string; Expense: number; Income: number }> = {}
    for (const t of allTxns) {
      const m = t.txn_date.slice(0, 7)
      if (!map[m]) map[m] = { month: m, Expense: 0, Income: 0 }
      if (t.type === 'Expense') map[m].Expense += t.amount
      else map[m].Income += t.amount
    }
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((d) => ({ ...d, month: fmtMonth(d.month) }))
  }, [allTxns])

  // Category breakdown for selected month
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {}
    thisTxns.filter((t) => t.type === 'Expense').forEach((t) => {
      const key = t.category?.name ?? 'Other'
      if (!map[key]) map[key] = { name: key, value: 0 }
      map[key].value += t.amount
    })
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [thisTxns])

  // Daily spend for selected month
  const dailyData = useMemo(() => {
    const map: Record<string, number> = {}
    thisTxns.filter((t) => t.type === 'Expense').forEach((t) => {
      const d = t.txn_date.slice(8) // DD
      map[d] = (map[d] ?? 0) + t.amount
    })
    const [y, m] = selectedMonth.split('-')
    const daysInMonth = new Date(Number(y), Number(m), 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0')
      return { day: String(i + 1), amount: map[day] ?? 0 }
    })
  }, [thisTxns, selectedMonth])

  // Payment method split
  const methodData = useMemo(() => {
    const map: Record<string, number> = {}
    thisTxns.filter((t) => t.type === 'Expense').forEach((t) => {
      const key = t.payment_method ?? 'Unknown'
      map[key] = (map[key] ?? 0) + t.amount
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [thisTxns])

  // Budget vs actual
  const budgetData = useMemo(() => {
    const spendMap: Record<string, number> = {}
    thisTxns.filter((t) => t.type === 'Expense').forEach((t) => {
      if (t.category_id) spendMap[t.category_id] = (spendMap[t.category_id] ?? 0) + t.amount
    })
    return budgets
      .filter((b) => b.category)
      .map((b) => ({
        name:   b.category!.name,
        Budget: b.monthly_limit,
        Actual: spendMap[b.category_id] ?? 0,
      }))
      .sort((a, b) => b.Actual - a.Actual)
  }, [thisTxns, budgets])

  // No-spend calendar
  const calendarData = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const firstDow = new Date(y, m - 1, 1).getDay() // 0=Sun
    const spendMap: Record<string, number> = {}
    allTxns.filter((t) => {
      const [ty, tm] = t.txn_date.split('-').map(Number)
      return ty === y && tm === m && t.type === 'Expense'
    }).forEach((t) => {
      const d = t.txn_date
      spendMap[d] = (spendMap[d] ?? 0) + t.amount
    })
    const maxSpend = Math.max(...Object.values(spendMap), 1)
    return { daysInMonth, firstDow, spendMap, maxSpend, y, m }
  }, [allTxns, selectedMonth])

  const thisExpense = useMemo(() => thisTxns.filter((t) => t.type === 'Expense').reduce((s, t) => s + t.amount, 0), [thisTxns])
  const thisIncome  = useMemo(() => thisTxns.filter((t) => t.type === 'Income').reduce((s, t) => s + t.amount, 0), [thisTxns])
  const avgDaily    = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    return thisExpense / new Date(y, m, 0).getDate()
  }, [thisExpense, selectedMonth])
  const yearlyExpense = useMemo(() => {
    const year = selectedMonth.slice(0, 4)
    return allTxns.filter((t) => t.type === 'Expense' && t.txn_date.startsWith(year)).reduce((s, t) => s + t.amount, 0)
  }, [allTxns, selectedMonth])

  return (
    <motion.div className="analytics-page" variants={staggerContainer} initial="initial" animate="animate">
      {/* Header */}
      <motion.div variants={staggerItem} className="analytics-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Spending trends, breakdowns and habits</p>
        </div>
        <input
          type="month"
          className="analytics-month-picker"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </motion.div>

      {hasError && <ErrorBanner onRetry={retryAll} />}

      {/* Summary KPIs */}
      <motion.div className="analytics-kpis" variants={staggerItem}>
        {(() => {
          const net = thisIncome - thisExpense
          return [
            { label: 'Spent this month',   value: formatCurrency(thisExpense),       color: 'var(--accent-coral)' },
            ...(isExpensesOnly ? [] : [
              { label: 'Income this month',  value: formatCurrency(thisIncome),        color: 'var(--accent-teal)' },
              { label: 'Net (income−spent)', value: `${net >= 0 ? '+' : ''}${formatCurrency(net)}`, color: net >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)' },
            ]),
            { label: 'Daily avg (month)',  value: formatCurrency(Math.round(avgDaily)), color: '#C2A24E' },
            { label: `${selectedMonth.slice(0,4)} total spent`, value: formatCurrency(yearlyExpense), color: '#3E9B72' },
            { label: 'No-spend streak',   value: `${streak} day${streak !== 1 ? 's' : ''}`, color: 'var(--accent-primary)' },
          ]
        })().map((k) => (
          <div key={k.label} className="analytics-kpi">
            <div className="analytics-kpi-label">{k.label}</div>
            <div className="analytics-kpi-value" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div className="analytics-tabs" variants={staggerItem}>
        <button className={`analytics-tab ${tab === 'overview' ? 'analytics-tab-active' : ''}`} onClick={() => setTab('overview')}>
          📊 Overview
        </button>
        <button className={`analytics-tab ${tab === 'habits' ? 'analytics-tab-active' : ''}`} onClick={() => setTab('habits')}>
          📅 Habits &amp; Budget
        </button>
        <button className={`analytics-tab ${tab === 'ai' ? 'analytics-tab-active analytics-tab-ai' : ''}`} onClick={() => setTab('ai')}>
          ✨ AI Insights
        </button>
      </motion.div>

      {tab === 'overview' && (
        <motion.div className="analytics-grid" variants={staggerContainer} initial="initial" animate="animate">

          {/* Monthly trend */}
          <motion.div className="analytics-card analytics-card-wide" variants={staggerItem}>
            <h3 className="analytics-card-title">Monthly trend — last 12 months</h3>
            {trendData.length === 0 ? (
              <div className="analytics-empty">No transactions yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#212A24" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#8A968C', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill: '#8A968C', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#8A968C' }} />
                  <Line type="monotone" dataKey="Expense" stroke="#C9736E" strokeWidth={2} dot={false} />
                  {!isExpensesOnly && (
                    <Line type="monotone" dataKey="Income" stroke="#4FA981" strokeWidth={2} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Category donut */}
          <motion.div className="analytics-card" variants={staggerItem}>
            <h3 className="analytics-card-title">Spending by category</h3>
            {categoryData.length === 0 ? (
              <div className="analytics-empty">No expenses this month.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="analytics-legend">
                  {categoryData.slice(0, 6).map((c, i) => (
                    <div key={c.name} className="analytics-legend-item">
                      <div className="analytics-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="analytics-legend-name">{c.name}</span>
                      <span className="analytics-legend-value">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* Daily spend bars */}
          <motion.div className="analytics-card" variants={staggerItem}>
            <h3 className="analytics-card-title">Daily spending</h3>
            {dailyData.every((d) => d.amount === 0) ? (
              <div className="analytics-empty">No expenses this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#212A24" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#8A968C', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => Number(v) % 5 === 0 ? v : ''} />
                  <YAxis tickFormatter={fmtK} tick={{ fill: '#8A968C', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} labelFormatter={(l) => `Day ${l}`} />
                  <Bar dataKey="amount" fill="#4FA981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Payment method */}
          <motion.div className="analytics-card" variants={staggerItem}>
            <h3 className="analytics-card-title">Payment method split</h3>
            {methodData.length === 0 ? (
              <div className="analytics-empty">No expenses this month.</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={methodData} cx="50%" cy="50%" outerRadius={75} paddingAngle={2} dataKey="value" nameKey="name">
                      {methodData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="analytics-legend">
                  {methodData.map((d, i) => (
                    <div key={d.name} className="analytics-legend-item">
                      <div className="analytics-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="analytics-legend-name">{d.name}</span>
                      <span className="analytics-legend-value">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

        </motion.div>
      )}

      {tab === 'habits' && (
        <motion.div className="analytics-grid" variants={staggerContainer} initial="initial" animate="animate">

          {/* Budget vs actual */}
          <motion.div className="analytics-card analytics-card-wide" variants={staggerItem}>
            <h3 className="analytics-card-title">Budget vs actual</h3>
            {budgetData.length === 0 ? (
              <div className="analytics-empty">No budget limits set. Add them in Settings → Budgets.</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, budgetData.length * 42)}>
                <BarChart data={budgetData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#212A24" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtK} tick={{ fill: '#8A968C', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#8A968C', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#8A968C' }} />
                  <Bar dataKey="Budget" fill="#212A24" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Actual"
                    radius={[0, 4, 4, 0]}
                    fill="#4FA981"
                    // Red if over budget
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* No-spend calendar */}
          <motion.div className="analytics-card" variants={staggerItem}>
            <h3 className="analytics-card-title">
              No-spend calendar
              <span className="analytics-streak-badge"> 🔥 {streak} day streak</span>
            </h3>
            <NoSpendCalendar {...calendarData} />
          </motion.div>

          {/* Top spending days */}
          <motion.div className="analytics-card" variants={staggerItem}>
            <h3 className="analytics-card-title">Biggest spending days</h3>
            {dailyData.every((d) => d.amount === 0) ? (
              <div className="analytics-empty">No expenses this month.</div>
            ) : (
              <div className="analytics-top-days">
                {[...dailyData]
                  .filter((d) => d.amount > 0)
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 8)
                  .map((d, i) => {
                    const [y, m] = selectedMonth.split('-').map(Number)
                    const date = new Date(y, m - 1, Number(d.day))
                    const label = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                    return (
                      <div key={d.day} className="analytics-top-day-row">
                        <span className="analytics-top-day-rank">#{i + 1}</span>
                        <span className="analytics-top-day-date">{label}</span>
                        <div className="analytics-top-day-bar-wrap">
                          <div
                            className="analytics-top-day-bar"
                            style={{
                              width: `${(d.amount / dailyData.reduce((mx, x) => Math.max(mx, x.amount), 0)) * 100}%`,
                              background: i === 0 ? 'linear-gradient(90deg,#C25B55,#C9736E)' : 'linear-gradient(90deg,#4FA981,#3E9B72)',
                            }}
                          />
                        </div>
                        <span className="analytics-top-day-amount">{formatCurrency(d.amount)}</span>
                      </div>
                    )
                  })}
              </div>
            )}
          </motion.div>

        </motion.div>
      )}

      {tab === 'ai' && (
        localStorage.getItem('fintrack_ai_enabled') === 'false' ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
            AI Insights is turned off. Enable it in <strong style={{ color: 'var(--accent-primary)' }}>Settings → AI Insights</strong>.
          </div>
        ) : (
          <AIHub selectedMonth={selectedMonth} />
        )
      )}

    </motion.div>
  )
}


// ── No-spend calendar sub-component ──────────────────────────────────────────
function NoSpendCalendar({
  daysInMonth, firstDow, spendMap, maxSpend, y, m,
}: {
  daysInMonth: number
  firstDow: number
  spendMap: Record<string, number>
  maxSpend: number
  y: number
  m: number
}) {
  const today = new Date()
  const todayStr = toISODateString(today)
  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="nsc-wrap">
      <div className="nsc-dow-row">{DOW.map((d) => <div key={d} className="nsc-dow">{d}</div>)}</div>
      <div className="nsc-grid">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="nsc-day nsc-empty" />
          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const spend = spendMap[dateStr] ?? 0
          const isToday = dateStr === todayStr
          const pct = spend / maxSpend

          let cls = 'nsc-day'
          if (spend === 0) cls += ' nsc-no-spend'
          else if (pct < 0.33) cls += ' nsc-spend-low'
          else if (pct < 0.66) cls += ' nsc-spend-med'
          else cls += ' nsc-spend-high'
          if (isToday) cls += ' nsc-today'

          return (
            <div key={day} className={cls} title={spend > 0 ? formatCurrency(spend) : 'No spend'}>
              <span className="nsc-day-num">{day}</span>
            </div>
          )
        })}
      </div>
      <div className="nsc-legend">
        <div className="nsc-legend-item"><div className="nsc-legend-swatch" style={{ background: 'rgba(79, 169, 129,0.4)' }} />No spend</div>
        <div className="nsc-legend-item"><div className="nsc-legend-swatch" style={{ background: 'rgba(201, 115, 110,0.25)' }} />Low spend</div>
        <div className="nsc-legend-item"><div className="nsc-legend-swatch" style={{ background: 'rgba(194, 91, 85,0.5)' }} />High spend</div>
      </div>
    </div>
  )
}
