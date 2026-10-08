import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { CalendarClock } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, formatDate, toISODateString } from '@/lib/utils'
import { CHART_COLORS, TOOLTIP_STYLE } from '@/lib/chartTheme'
import {
  allocationByCategory, returnSummary, maturitySchedule,
  type MaturityItem,
} from '@/lib/investmentAnalytics'
import type { Investment } from '@/types/investment.types'
import './InvestmentAnalytics.css'

function pct(r: number): string {
  const v = r * 100
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

function maturityLabel(m: MaturityItem): string {
  if (m.daysLeft < 0) return `Matured ${-m.daysLeft} day${m.daysLeft === -1 ? '' : 's'} ago`
  if (m.daysLeft === 0) return 'Matures today'
  return `In ${m.daysLeft} day${m.daysLeft === 1 ? '' : 's'}`
}

export default function InvestmentAnalytics({ investments }: { investments: Investment[] }) {
  const navigate = useNavigate()
  const today = toISODateString(new Date())

  const allocation = useMemo(() => allocationByCategory(investments), [investments])
  const allocationTotal = allocation.reduce((s, a) => s + a.value, 0)

  const returnsTable = useMemo(
    () => investments
      .map((inv) => ({ inv, ...returnSummary(inv, today) }))
      .sort((a, b) => (b.annual ?? b.total ?? -Infinity) - (a.annual ?? a.total ?? -Infinity)),
    [investments, today],
  )

  const maturities = useMemo(() => maturitySchedule(investments, today), [investments, today])

  const open = (id: string) => navigate({ to: '/investments/$investmentId', params: { investmentId: id } })

  return (
    <motion.div className="ia-grid" variants={staggerContainer} initial="initial" animate="animate">
      {/* Allocation */}
      <motion.section className="ia-card" variants={staggerItem}>
        <h2 className="ia-card-title">Allocation by category</h2>
        <p className="ia-card-sub">Current value where entered, otherwise money paid in, otherwise the commitment.</p>
        {allocation.length === 0 ? (
          <div className="ia-empty">Add an amount or valuation to an investment to see its share.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={allocation} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" nameKey="name">
                  {allocation.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => formatCurrency(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="ia-legend">
              {allocation.map((a, i) => (
                <li key={a.name} className="ia-legend-item">
                  <span className="ia-legend-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="ia-legend-name">{a.name}</span>
                  <span className="ia-legend-share">{((a.value / allocationTotal) * 100).toFixed(0)}%</span>
                  <span className="ia-legend-value">{formatCurrency(a.value)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </motion.section>

      {/* Annualised return */}
      <motion.section className="ia-card" variants={staggerItem}>
        <h2 className="ia-card-title">Annualised return</h2>
        <p className="ia-card-sub">
          Total return counts money back plus current value. Per year accounts for when money went in
          and came out (XIRR), so investments held for different lengths of time compare fairly.
        </p>
        <div className="ia-table">
          <div className="ia-row ia-row-head" aria-hidden="true">
            <span>Investment</span>
            <span>Total</span>
            <span>Per year</span>
          </div>
          {returnsTable.map(({ inv, total, annual, note }) => (
            <button key={inv.id} className="ia-row" onClick={() => open(inv.id)}
              aria-label={`${inv.name}: total ${total == null ? 'unknown' : pct(total)}, per year ${annual == null ? (note ?? 'unknown') : pct(annual)}`}>
              <span className="ia-row-name">{inv.name}</span>
              <span className={total == null ? 'ia-muted' : total >= 0 ? 'ia-pos' : 'ia-neg'}>
                {total == null ? '—' : pct(total)}
              </span>
              <span className={annual == null ? 'ia-muted' : annual >= 0 ? 'ia-pos' : 'ia-neg'}>
                {annual == null ? note : pct(annual)}
              </span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* Maturity calendar */}
      <motion.section className="ia-card ia-card-wide" variants={staggerItem}>
        <h2 className="ia-card-title"><CalendarClock size={14} style={{ verticalAlign: -2 }} /> Maturity calendar</h2>
        <p className="ia-card-sub">Investments with an end date — FDs, bonds, fixed-term deals.</p>
        {maturities.length === 0 ? (
          <div className="ia-empty">No end dates set. Add one when editing an investment to see it here.</div>
        ) : (
          <ul className="ia-maturity-list">
            {maturities.map((m) => (
              <li key={m.investment.id}>
                <button className={`ia-maturity ia-maturity-${m.status}`} onClick={() => open(m.investment.id)}>
                  <span className="ia-maturity-date">{formatDate(m.endDate)}</span>
                  <span className="ia-maturity-name">{m.investment.name}</span>
                  <span className="ia-maturity-status">{maturityLabel(m)}</span>
                  <span className="ia-maturity-amount">
                    {m.investment.committed_amount != null ? formatCurrency(m.investment.committed_amount) : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.section>
    </motion.div>
  )
}
