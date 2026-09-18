import { useState } from 'react'
import { motion } from 'framer-motion'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
import type { PersonWithLedgers, PersonLedger } from '@/types/ledger.types'
import './LedgerSummaryTab.css'

function lastActivity(ledgers: PersonLedger[]): string | null {
  if (ledgers.length === 0) return null
  return ledgers.reduce((max, e) => (e.start_date > max ? e.start_date : max), ledgers[0].start_date)
}

const STATUS_STYLE = {
  Settled: { bg: 'rgba(79, 169, 129,0.12)', color: '#4FA981', label: '✅ Settled' },
  Partial:  { bg: 'rgba(194, 162, 78,0.12)', color: '#C2A24E', label: '🔄 Partial' },
  Pending:  { bg: 'rgba(201, 115, 110,0.12)', color: '#C9736E', label: '⏳ Pending' },
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

  // Build one row per person × type, reading the pre-computed aggregate
  // fields directly off `person` (see enrichPerson() in useLedger.ts) —
  // no per-entry re-derivation, since entries no longer carry their own
  // remaining/status.
  const rows: SummaryRow[] = []
  for (const person of persons) {
    if (person.lent_count > 0 && person.lent_status) {
      rows.push({
        person, type: 'Lent',
        total: person.total_lent,
        paid: person.total_lent - person.total_outstanding_lent,
        remaining: person.total_outstanding_lent,
        status: person.lent_status,
        lastDate: lastActivity(person.ledgers.filter((e) => e.ledger_type === 'Lent')),
      })
    }
    if (person.debt_count > 0 && person.debt_status) {
      rows.push({
        person, type: 'Debt',
        total: person.total_debt,
        paid: person.total_debt - person.total_outstanding_debt,
        remaining: person.total_outstanding_debt,
        status: person.debt_status,
        lastDate: lastActivity(person.ledgers.filter((e) => e.ledger_type === 'Debt')),
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
              <div className="lst-cell" data-label="Type">
                <span className={`lst-type-chip ${isLent ? 'lst-chip-lent' : 'lst-chip-debt'}`}>
                  {isLent ? '💸 Lent' : '🏦 Debt'}
                </span>
              </div>

              {/* Total */}
              <div className="lst-cell" data-label="Total">
                <span className="lst-amt-total">{formatCurrency(row.total)}</span>
              </div>

              {/* Paid */}
              <div className="lst-cell" data-label="Paid back">
                {row.paid > 0
                  ? <span className="lst-amt-paid">{formatCurrency(row.paid)}</span>
                  : <span className="lst-cell-muted">—</span>}
              </div>

              {/* Remaining */}
              <div className="lst-cell" data-label="Remaining">
                {row.remaining === 0 ? (
                  <span className="lst-remaining-zero">Fully settled</span>
                ) : (
                  <span className={isLent ? 'lst-remaining-lent' : 'lst-remaining-debt'}>
                    {formatCurrency(row.remaining)}
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="lst-cell" data-label="Status">
                <span className="lst-status-badge" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>

              {/* Last activity */}
              <div className="lst-cell lst-cell-muted" data-label="Last activity">
                {row.lastDate ? formatDate(row.lastDate) : '—'}
              </div>
            </div>
          )
        })}
      </div>

    </motion.div>
  )
}
