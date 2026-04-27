import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Sparkles, AlertCircle } from 'lucide-react'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations'
import { formatCurrency, toISODateString } from '@/lib/utils'
import { useExpenses } from '@/hooks/useExpenses'
import { useBudgets } from '@/hooks/useBudgets'
import { useNoSpendStreak } from '@/hooks/useNoSpendStreak'

// ── Helpers ──────────────────────────────────────────────────────────────────
function getMonthRange(offset = 0) {
  const now = new Date()
  const from = toISODateString(new Date(now.getFullYear(), now.getMonth() + offset, 1))
  const to   = toISODateString(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0))
  return { from, to }
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}
function fmtK(v: number) {
  if (v >= 100000) return `৳${(v / 1000).toFixed(0)}k`
  if (v >= 10000)  return `৳${(v / 1000).toFixed(1)}k`
  return `৳${v.toLocaleString()}`
}

const CHART_COLORS = ['#6C63FF','#10B981','#F97316','#F59E0B','#EF4444','#06B6D4','#A855F7','#EC4899','#8B5CF6','#14B8A6']
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1E1E38', border: '1px solid #2A2A4A', borderRadius: 10,
    color: '#E8E6FF', fontSize: 12,
  },
  itemStyle: { color: '#E8E6FF' },
  labelStyle: { color: '#9D9AB8', marginBottom: 4 },
}

type Tab = 'overview' | 'habits' | 'ai'

export default function AnalyticsPage() {
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
  const { data: allTxns = [] }  = useExpenses({ from: twelveAgo, to: toISODateString(new Date()) })
  const { data: thisTxns = [] } = useExpenses({ from: `${selectedMonth}-01`, to: getMonthRange(0).to })
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

      {/* Summary KPIs */}
      <motion.div className="analytics-kpis" variants={staggerItem}>
        {(() => {
          const net = thisIncome - thisExpense
          return [
            { label: 'Spent this month',   value: formatCurrency(thisExpense),       color: 'var(--accent-coral)' },
            { label: 'Income this month',  value: formatCurrency(thisIncome),        color: 'var(--accent-teal)' },
            { label: 'Net (income−spent)', value: `${net >= 0 ? '+' : ''}${formatCurrency(net)}`, color: net >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)' },
            { label: 'Daily avg (month)',  value: formatCurrency(Math.round(avgDaily)), color: '#F59E0B' },
            { label: `${selectedMonth.slice(0,4)} total spent`, value: formatCurrency(yearlyExpense), color: '#A855F7' },
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A4A" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#9D9AB8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fill: '#9D9AB8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9D9AB8' }} />
                  <Line type="monotone" dataKey="Expense" stroke="#F97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Income"  stroke="#10B981" strokeWidth={2} dot={false} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A4A" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: '#9D9AB8', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => Number(v) % 5 === 0 ? v : ''} />
                  <YAxis tickFormatter={fmtK} tick={{ fill: '#9D9AB8', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} labelFormatter={(l) => `Day ${l}`} />
                  <Bar dataKey="amount" fill="#6C63FF" radius={[3, 3, 0, 0]} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A4A" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtK} tick={{ fill: '#9D9AB8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#9D9AB8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#9D9AB8' }} />
                  <Bar dataKey="Budget" fill="#2A2A4A" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Actual"
                    radius={[0, 4, 4, 0]}
                    fill="#6C63FF"
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
                              background: i === 0 ? 'linear-gradient(90deg,#EF4444,#F97316)' : 'linear-gradient(90deg,#6C63FF,#A855F7)',
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
        <AIInsightsTab
          trendData={trendData}
          categoryData={categoryData}
          budgetData={budgetData}
          thisExpense={thisExpense}
          thisIncome={thisIncome}
          selectedMonth={selectedMonth}
          streak={streak}
        />
      )}

      <style>{`
        .analytics-page { max-width: 960px; }
        .analytics-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }
        .analytics-month-picker {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
          color: var(--text-primary); font-size: 13px; padding: 8px 12px; cursor: pointer;
        }
        .analytics-month-picker:focus { outline: none; border-color: var(--border-focus); }

        /* KPIs */
        .analytics-kpis {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px;
        }
        @media (max-width: 900px) { .analytics-kpis { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 500px) { .analytics-kpis { grid-template-columns: 1fr 1fr; gap: 6px; } }
        .analytics-kpi {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px;
          padding: 10px 12px;
        }
        .analytics-kpi-label { font-size: 11px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .analytics-kpi-value { font-size: 18px; font-weight: 700; }

        /* Tabs */
        .analytics-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .analytics-tab {
          padding: 8px 18px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .analytics-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
        .analytics-tab-active {
          background: linear-gradient(135deg, #6C63FF, #A855F7);
          border-color: transparent; color: #fff;
        }

        /* Grid */
        .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 700px) { .analytics-grid { grid-template-columns: 1fr; gap: 10px; } }
        .analytics-card-wide { grid-column: 1 / -1; }

        .analytics-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 18px;
        }
        .analytics-card-title {
          font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .analytics-streak-badge {
          font-size: 12px; font-weight: 500; color: var(--accent-primary);
          background: rgba(108,99,255,0.1); padding: 2px 8px; border-radius: 20px;
        }
        .analytics-empty { font-size: 13px; color: var(--text-muted); padding: 20px 0; text-align: center; }

        /* Legend */
        .analytics-legend { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
        .analytics-legend-item { display: flex; align-items: center; gap: 8px; }
        .analytics-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .analytics-legend-name { font-size: 12px; color: var(--text-secondary); flex: 1; }
        .analytics-legend-value { font-size: 12px; font-weight: 600; color: var(--text-primary); }

        /* Calendar */
        .nsc-wrap { }
        .nsc-dow-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; margin-bottom: 3px; }
        .nsc-dow { font-size: 9px; font-weight: 600; color: var(--text-muted); text-align: center; text-transform: uppercase; }
        .nsc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
        .nsc-day {
          aspect-ratio: 1; border-radius: 5px; display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 500; position: relative; cursor: default;
        }
        .nsc-day-num { color: var(--text-secondary); z-index: 1; position: relative; }
        .nsc-no-spend { background: rgba(16,185,129,0.15); }
        .nsc-no-spend .nsc-day-num { color: var(--accent-teal); }
        .nsc-spend-low { background: rgba(249,115,22,0.1); }
        .nsc-spend-med { background: rgba(249,115,22,0.25); }
        .nsc-spend-high { background: rgba(239,68,68,0.35); }
        .nsc-today { outline: 2px solid var(--accent-primary); outline-offset: -2px; }
        .nsc-empty { }
        .nsc-legend { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .nsc-legend-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--text-muted); }
        .nsc-legend-swatch { width: 10px; height: 10px; border-radius: 3px; }

        /* Top days */
        .analytics-top-days { display: flex; flex-direction: column; gap: 8px; }
        .analytics-top-day-row { display: flex; align-items: center; gap: 8px; }
        .analytics-top-day-rank { font-size: 11px; color: var(--text-muted); width: 22px; flex-shrink: 0; }
        .analytics-top-day-date { font-size: 12px; color: var(--text-secondary); width: 100px; flex-shrink: 0; }
        .analytics-top-day-bar-wrap { flex: 1; height: 6px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; }
        .analytics-top-day-bar { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
        .analytics-top-day-amount { font-size: 12px; font-weight: 600; color: var(--text-primary); flex-shrink: 0; width: 70px; text-align: right; }

        .analytics-tab-ai { background: linear-gradient(135deg,#6C63FF,#A855F7) !important; }
      `}</style>
    </motion.div>
  )
}

// ── AI Insights tab ───────────────────────────────────────────────────────────

type AIProvider = 'gemini' | 'groq'

const PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Google Gemini',
  groq: 'Groq',
}

interface AIInsightsTabProps {
  trendData: { month: string; Expense: number; Income: number }[]
  categoryData: { name: string; value: number }[]
  budgetData: { name: string; Budget: number; Actual: number }[]
  thisExpense: number
  thisIncome: number
  selectedMonth: string
  streak: number
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  // gemini-1.5-flash first, fall back to gemini-pro (universally available on free tier)
  const models = ['gemini-1.5-flash', 'gemini-pro']
  let lastErr = ''
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    )
    if (res.ok) {
      const data = await res.json()
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.'
    }
    const body = await res.json().catch(() => ({}))
    lastErr = body?.error?.message ?? `HTTP ${res.status}`
    if (res.status !== 404) break  // only retry on 404 (model not found)
  }
  throw new Error(lastErr)
}

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 400,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? 'No response received.'
}

function AIInsightsTab({
  trendData, categoryData, budgetData, thisExpense, thisIncome, selectedMonth, streak,
}: AIInsightsTabProps) {
  const [insights, setInsights] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aiEnabled  = localStorage.getItem('ai_insights_enabled') === 'true'
  const provider   = (localStorage.getItem('ai_provider') ?? 'groq') as AIProvider
  const apiKey     = localStorage.getItem(`${provider}_api_key`) ?? ''
  const providerLabel = PROVIDER_LABELS[provider]

  async function analyze() {
    if (!apiKey) {
      setError(`No API key saved for ${providerLabel}. Go to Settings → AI Insights, select your provider and save your key.`)
      return
    }
    setLoading(true); setError(null); setInsights(null)

    const topCats     = categoryData.slice(0, 5).map((c) => `${c.name}: ${formatCurrency(c.value)}`).join(', ')
    const trendSummary = trendData.slice(-3).map((d) => `${d.month} — Spent: ${formatCurrency(d.Expense)}, Income: ${formatCurrency(d.Income)}`).join('; ')
    const overBudget  = budgetData.filter((b) => b.Actual > b.Budget).map((b) => b.name).join(', ')

    const prompt = `You are a personal finance advisor. Analyze this spending data and give 4–5 concise, actionable bullet points. Be specific and practical. Keep total under 180 words.

Month: ${selectedMonth}
Spent: ${formatCurrency(thisExpense)} | Income: ${formatCurrency(thisIncome)} | Saved: ${formatCurrency(Math.max(0, thisIncome - thisExpense))}
No-spend streak: ${streak} days
Top spending categories: ${topCats || 'No data'}
3-month trend: ${trendSummary || 'No data'}
Over budget categories: ${overBudget || 'None'}

Respond ONLY with bullet points starting with "•". No intro, no heading.`

    try {
      const text = provider === 'groq'
        ? await callGroq(apiKey, prompt)
        : await callGemini(apiKey, prompt)
      setInsights(text)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(`${providerLabel} error: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  if (!aiEnabled) {
    return (
      <motion.div
        className="analytics-card analytics-ai-disabled"
        variants={fadeUp} initial="initial" animate="animate"
      >
        <Sparkles size={28} style={{ color: 'var(--accent-primary)', marginBottom: 12 }} />
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>AI Insights not enabled</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Go to <strong>Settings → AI Insights</strong>, toggle it on, pick a provider (Gemini or Groq), and save your free API key.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="analytics-card">
        <div className="analytics-ai-header">
          <div>
            <h3 className="analytics-card-title" style={{ marginBottom: 4 }}>
              <Sparkles size={16} style={{ color: '#A855F7' }} /> AI Spending Analysis
              <span className="analytics-ai-provider-badge">{providerLabel}</span>
            </h3>
            <p style={{ font: '13px/1.4 inherit', color: 'var(--text-secondary)', margin: 0 }}>
              Click Analyze to get personalized insights for {selectedMonth}.
            </p>
          </div>
          <button className="analytics-ai-btn" onClick={analyze} disabled={loading}>
            {loading
              ? <><span className="analytics-ai-spinner" /> Analyzing…</>
              : <><Sparkles size={14} /> Analyze</>}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              className="analytics-ai-loading"
              variants={fadeUp} initial="initial" animate="animate" exit={{ opacity: 0 }}
            >
              <span className="analytics-ai-spinner-lg" />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Calling {providerLabel}…</span>
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              className="analytics-ai-error"
              variants={fadeUp} initial="initial" animate="animate"
            >
              <AlertCircle size={15} /> {error}
            </motion.div>
          )}

          {insights && !loading && (
            <motion.div
              key="insights"
              className="analytics-ai-insights"
              variants={fadeUp} initial="initial" animate="animate"
            >
              {insights
                .split('\n')
                .filter(Boolean)
                .map((line, i) => (
                  <p key={i} className="analytics-ai-line">
                    {line.replace(/^[•\-\*]\s*/, '• ')}
                  </p>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .analytics-ai-disabled {
          display: flex; flex-direction: column; align-items: center;
          padding: 48px 24px; text-align: center;
        }
        .analytics-ai-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .analytics-ai-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer;
          background: linear-gradient(135deg,#6C63FF,#A855F7); border: none; color: #fff;
          transition: opacity 0.15s; white-space: nowrap; flex-shrink: 0;
        }
        .analytics-ai-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .analytics-ai-spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: ai-spin 0.7s linear infinite;
        }
        .analytics-ai-spinner-lg {
          display: inline-block; width: 20px; height: 20px;
          border: 2px solid rgba(108,99,255,0.2); border-top-color: var(--accent-primary);
          border-radius: 50%; animation: ai-spin 0.7s linear infinite;
        }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
        .analytics-ai-loading { display: flex; align-items: center; gap: 12px; padding: 24px 0; }
        .analytics-ai-error {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; font-size: 13px; color: var(--accent-red);
        }
        .analytics-ai-insights { display: flex; flex-direction: column; gap: 6px; }
        .analytics-ai-line {
          font-size: 14px; color: var(--text-secondary); margin: 0; line-height: 1.55;
          padding: 6px 10px; border-radius: 8px; background: var(--bg-elevated);
        }
        .analytics-ai-provider-badge {
          font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px;
          background: rgba(16,185,129,0.12); color: var(--accent-teal);
          margin-left: 4px;
        }
      `}</style>
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
            <div key={day} className={cls} title={spend > 0 ? `৳${spend.toLocaleString()}` : 'No spend'}>
              <span className="nsc-day-num">{day}</span>
            </div>
          )
        })}
      </div>
      <div className="nsc-legend">
        <div className="nsc-legend-item"><div className="nsc-legend-swatch" style={{ background: 'rgba(16,185,129,0.4)' }} />No spend</div>
        <div className="nsc-legend-item"><div className="nsc-legend-swatch" style={{ background: 'rgba(249,115,22,0.25)' }} />Low spend</div>
        <div className="nsc-legend-item"><div className="nsc-legend-swatch" style={{ background: 'rgba(239,68,68,0.5)' }} />High spend</div>
      </div>
    </div>
  )
}
