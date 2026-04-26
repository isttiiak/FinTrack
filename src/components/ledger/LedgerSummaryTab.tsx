import { useState } from 'react'
import { motion } from 'framer-motion'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
import type { PersonWithLedgers, PersonLedger } from '@/types/ledger.types'

function lastActivity(ledgers: PersonLedger[]): string | null {
  if (ledgers.length === 0) return null
  return ledgers.reduce((max, e) => (e.start_date > max ? e.start_date : max), ledgers[0].start_date)
}

function aggStatus(ledgers: PersonLedger[]): 'Settled' | 'Partial' | 'Pending' {
  if (ledgers.length === 0) return 'Pending'
  const statuses = ledgers.map((e) => e.status ?? 'Pending')
  if (statuses.every((s) => s === 'Settled')) return 'Settled'
  if (statuses.every((s) => s === 'Pending')) return 'Pending'
  return 'Partial'
}

const STATUS_STYLE = {
  Settled: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: '✅ Settled' },
  Partial:  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🔄 Partial' },
  Pending:  { bg: 'rgba(249,115,22,0.12)', color: '#F97316', label: '⏳ Pending' },
}

type SortField = 'name' | 'total' | 'remaining'

interface SummaryRow {
  person: PersonWithLedgers
  type: 'Lent' | 'Debt'
  total: number
  paid: number
  remaining: number
  status: 'Settled' | 'Partial' | 'Pending'
  lastDate: string | null
}

export default function LedgerSummaryTab({ persons }: { persons: PersonWithLedgers[] }) {
  const [sortField, setSortField] = useState<SortField>('remaining')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(f); setSortDir('desc') }
  }

  // Build one row per person × type (only include type if they have entries for it)
  const rows: SummaryRow[] = []
  for (const person of persons) {
    const lentEntries = person.ledgers.filter((e) => e.ledger_type === 'Lent')
    const debtEntries = person.ledgers.filter((e) => e.ledger_type === 'Debt')

    if (lentEntries.length > 0) {
      const total = lentEntries.reduce((s, e) => s + e.total_amount, 0)
      const remaining = lentEntries.reduce((s, e) => s + (e.remaining ?? e.total_amount), 0)
      rows.push({
        person, type: 'Lent',
        total, paid: total - remaining, remaining,
        status: aggStatus(lentEntries),
        lastDate: lastActivity(lentEntries),
      })
    }
    if (debtEntries.length > 0) {
      const total = debtEntries.reduce((s, e) => s + e.total_amount, 0)
      const remaining = debtEntries.reduce((s, e) => s + (e.remaining ?? e.total_amount), 0)
      rows.push({
        person, type: 'Debt',
        total, paid: total - remaining, remaining,
        status: aggStatus(debtEntries),
        lastDate: lastActivity(debtEntries),
      })
    }
  }

  const totalLent = persons.reduce((s, p) => s + p.total_outstanding_lent, 0)
  const totalDebt = persons.reduce((s, p) => s + p.total_outstanding_debt, 0)
  const net = totalLent - totalDebt

  const sorted = [...rows].sort((a, b) => {
    if (sortField === 'name')
      return sortDir === 'asc'
        ? a.person.name.localeCompare(b.person.name)
        : b.person.name.localeCompare(a.person.name)
    const av = sortField === 'total' ? a.total : a.remaining
    const bv = sortField === 'total' ? b.total : b.remaining
    return sortDir === 'asc' ? av - bv : bv - av
  })

  if (persons.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No entries yet</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Add entries to see the summary.</p>
      </div>
    )
  }

  function SortBtn({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field
    return (
      <button className={`lst-sort-btn ${active ? 'lst-sort-active' : ''}`} onClick={() => toggleSort(field)}>
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </button>
    )
  }

  return (
    <motion.div className="lst-wrap" variants={fadeUp} initial="initial" animate="animate">
      {/* Totals strip */}
      <div className="lst-totals">
        <div className="lst-total-item">
          <span className="lst-total-label">Outstanding lent</span>
          <span className="lst-total-val" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(totalLent)}</span>
        </div>
        <div className="lst-total-item">
          <span className="lst-total-label">Outstanding debt</span>
          <span className="lst-total-val" style={{ color: 'var(--accent-coral)' }}>{formatCurrency(totalDebt)}</span>
        </div>
        <div className="lst-total-item">
          <span className="lst-total-label">Net position</span>
          <span className="lst-total-val" style={{ color: net >= 0 ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </span>
        </div>
        <div className="lst-total-item">
          <span className="lst-total-label">People tracked</span>
          <span className="lst-total-val" style={{ color: 'var(--accent-primary)' }}>{persons.length}</span>
        </div>
      </div>

      {/* Sort controls */}
      <div className="lst-sort-row">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sort by:</span>
        <SortBtn field="name" label="Name" />
        <SortBtn field="total" label="Total" />
        <SortBtn field="remaining" label="Remaining" />
      </div>

      {/* Table */}
      <div className="lst-table">
        <div className="lst-header">
          <span>Person</span>
          <span>Type</span>
          <span>Total</span>
          <span>Paid back</span>
          <span>Remaining</span>
          <span>Status</span>
          <span>Last activity</span>
        </div>

        {sorted.map((row, i) => {
          const st = STATUS_STYLE[row.status]
          const isLent = row.type === 'Lent'
          return (
            <div key={`${row.person.id}-${row.type}-${i}`} className="lst-row">
              {/* Person */}
              <div className="lst-cell lst-person-cell">
                <span className="lst-avatar">{row.person.name[0]?.toUpperCase()}</span>
                <div className="lst-person-info">
                  <span className="lst-person-name">{row.person.name}</span>
                  {row.person.relationship && (
                    <span className="lst-rel-badge">{row.person.relationship}</span>
                  )}
                </div>
              </div>

              {/* Type */}
              <div className="lst-cell">
                <span className={`lst-type-chip ${isLent ? 'lst-chip-lent' : 'lst-chip-debt'}`}>
                  {isLent ? '💸 Lent' : '🏦 Debt'}
                </span>
              </div>

              {/* Total */}
              <div className="lst-cell">
                <span className="lst-amt-total">{formatCurrency(row.total)}</span>
              </div>

              {/* Paid */}
              <div className="lst-cell">
                {row.paid > 0
                  ? <span className="lst-amt-paid">{formatCurrency(row.paid)}</span>
                  : <span className="lst-cell-muted">—</span>}
              </div>

              {/* Remaining */}
              <div className="lst-cell">
                {row.remaining === 0 ? (
                  <span className="lst-remaining-zero">Fully settled</span>
                ) : (
                  <span className={isLent ? 'lst-remaining-lent' : 'lst-remaining-debt'}>
                    {formatCurrency(row.remaining)}
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="lst-cell">
                <span className="lst-status-badge" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>

              {/* Last activity */}
              <div className="lst-cell lst-cell-muted">
                {row.lastDate ? formatDate(row.lastDate) : '—'}
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        .lst-wrap { display: flex; flex-direction: column; gap: 12px; }

        .lst-totals {
          display: flex; gap: 16px; flex-wrap: wrap;
          padding: 12px 16px; border-radius: 12px;
          background: var(--bg-card); border: 1px solid var(--border);
        }
        .lst-total-item { display: flex; flex-direction: column; gap: 3px; }
        .lst-total-label { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .lst-total-val { font-size: 16px; font-weight: 700; }

        .lst-sort-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .lst-sort-btn {
          padding: 4px 10px; border-radius: 20px; font-size: 12px; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.12s;
        }
        .lst-sort-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
        .lst-sort-active { background: rgba(108,99,255,0.1); border-color: rgba(108,99,255,0.3); color: var(--accent-primary); }

        .lst-table {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          overflow: hidden; overflow-x: auto;
        }
        .lst-header, .lst-row {
          display: grid;
          grid-template-columns: 170px 90px 100px 100px 110px 100px 100px;
          gap: 0; padding: 10px 16px; align-items: center;
          min-width: 780px;
        }
        .lst-header {
          background: var(--bg-elevated); border-bottom: 1px solid var(--border);
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .lst-row { border-bottom: 1px solid rgba(42,42,74,0.5); }
        .lst-row:last-child { border-bottom: none; }
        .lst-cell { padding: 0 8px 0 0; }
        .lst-cell-muted { font-size: 12px; color: var(--text-muted); }

        .lst-person-cell { display: flex; align-items: center; gap: 8px; }
        .lst-avatar {
          width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
          background: rgba(108,99,255,0.15); color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
        }
        .lst-person-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .lst-person-name { font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lst-rel-badge { font-size: 10px; color: var(--text-muted); background: var(--bg-elevated); padding: 1px 6px; border-radius: 20px; width: fit-content; }

        .lst-type-chip { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
        .lst-chip-lent { background: rgba(16,185,129,0.12); color: var(--accent-teal); }
        .lst-chip-debt { background: rgba(249,115,22,0.12); color: var(--accent-coral); }

        .lst-amt-total { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .lst-amt-paid { font-size: 13px; font-weight: 600; color: var(--accent-teal); }
        .lst-remaining-lent { font-size: 13px; font-weight: 700; color: var(--accent-teal); }
        .lst-remaining-debt { font-size: 13px; font-weight: 700; color: var(--accent-coral); }
        .lst-remaining-zero { font-size: 11px; color: var(--accent-teal); }

        .lst-status-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
      `}</style>
    </motion.div>
  )
}
