import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
import type { PersonWithLedgers, PersonLedger } from '@/types/ledger.types'

const STATUS = {
  Settled: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: '✅ Settled' },
  Partial:  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🔄 Partial' },
  Pending:  { bg: 'rgba(249,115,22,0.12)', color: '#F97316', label: '⏳ Pending' },
}

export default function LedgerSummaryTab({ persons }: { persons: PersonWithLedgers[] }) {
  const navigate = useNavigate()
  const [sortField, setSortField] = useState<'name' | 'remaining' | 'total'>('remaining')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  type Row = { person: PersonWithLedgers; entry: PersonLedger | null }

  // Build row per ledger entry (one person can have multiple)
  const rows: Row[] = persons.flatMap((p) =>
    p.ledgers.length === 0
      ? [{ person: p, entry: null }]
      : p.ledgers.map((e) => ({ person: p, entry: e as PersonLedger | null })),
  )

  const sorted = [...rows].sort((a: Row, b: Row) => {
    let av = 0, bv = 0
    if (sortField === 'name') {
      return sortDir === 'asc'
        ? a.person.name.localeCompare(b.person.name)
        : b.person.name.localeCompare(a.person.name)
    }
    if (sortField === 'remaining') {
      av = a.entry?.remaining ?? 0; bv = b.entry?.remaining ?? 0
    }
    if (sortField === 'total') {
      av = a.entry?.total_amount ?? 0; bv = b.entry?.total_amount ?? 0
    }
    return sortDir === 'asc' ? av - bv : bv - av
  })

  const totalLent = persons.reduce((s, p) => s + p.total_outstanding_lent, 0)
  const totalDebt = persons.reduce((s, p) => s + p.total_outstanding_debt, 0)
  const settledCount = rows.filter((r: Row) => r.entry?.status === 'Settled').length
  const pendingCount = rows.filter((r: Row) => r.entry?.status === 'Pending').length
  const partialCount = rows.filter((r: Row) => r.entry?.status === 'Partial').length

  if (persons.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No entries yet</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>Add entries to see the summary.</p>
      </div>
    )
  }

  function SortBtn({ field, label }: { field: typeof sortField; label: string }) {
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
          <span className="lst-total-label">Total outstanding lent</span>
          <span className="lst-total-val" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(totalLent)}</span>
        </div>
        <div className="lst-total-item">
          <span className="lst-total-label">Total outstanding debt</span>
          <span className="lst-total-val" style={{ color: 'var(--accent-coral)' }}>{formatCurrency(totalDebt)}</span>
        </div>
        <div className="lst-total-item">
          <span className="lst-total-label">Net position</span>
          <span className="lst-total-val" style={{ color: totalLent - totalDebt >= 0 ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
            {totalLent - totalDebt >= 0 ? '+' : ''}{formatCurrency(totalLent - totalDebt)}
          </span>
        </div>
        <div className="lst-total-item">
          <span className="lst-total-label">Status breakdown</span>
          <span className="lst-total-statuses">
            <span style={{ color: '#10B981' }}>✅ {settledCount}</span>
            <span style={{ color: '#F59E0B' }}>🔄 {partialCount}</span>
            <span style={{ color: '#F97316' }}>⏳ {pendingCount}</span>
          </span>
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
          <span>Reason</span>
          <span>Date</span>
          <span>Total</span>
          <span>Paid</span>
          <span>Remaining</span>
          <span>Status</span>
          <span></span>
        </div>

        {sorted.map(({ person, entry }: Row, i) => {
          const status = (entry?.status ?? 'Pending') as keyof typeof STATUS
          const st = STATUS[status]
          return (
            <div
              key={`${person.id}-${entry?.id ?? i}`}
              className="lst-row"
              onClick={() => navigate({ to: '/ledger/$personId', params: { personId: person.id } })}
            >
              {/* Person */}
              <div className="lst-cell lst-person-cell">
                <span className="lst-avatar">{person.name[0]?.toUpperCase()}</span>
                <span className="lst-person-name">{person.name}</span>
                {person.relationship && (
                  <span className="lst-rel-badge">{person.relationship}</span>
                )}
              </div>

              {/* Type */}
              <div className="lst-cell">
                {entry ? (
                  <span className={`lst-type-chip ${entry.ledger_type === 'Lent' ? 'lst-lent' : 'lst-debt'}`}>
                    {entry.ledger_type === 'Lent' ? '💸 Lent' : '🏦 Debt'}
                  </span>
                ) : <span className="lst-cell-muted">—</span>}
              </div>

              {/* Reason */}
              <div className="lst-cell lst-cell-muted">{entry?.reason ?? '—'}</div>

              {/* Date */}
              <div className="lst-cell lst-cell-muted">{entry ? formatDate(entry.start_date) : '—'}</div>

              {/* Total */}
              <div className="lst-cell">
                {entry ? (
                  <span className="lst-total-amount">{formatCurrency(entry.total_amount)}</span>
                ) : <span className="lst-cell-muted">—</span>}
              </div>

              {/* Paid */}
              <div className="lst-cell">
                {entry && (entry.paid_amount ?? 0) > 0 ? (
                  <span className="lst-paid-amount">{formatCurrency(entry.paid_amount!)}</span>
                ) : <span className="lst-cell-muted">—</span>}
              </div>

              {/* Remaining */}
              <div className="lst-cell">
                {entry ? (
                  (entry.remaining ?? entry.total_amount) === 0 ? (
                    <span className="lst-remaining-zero">Fully paid</span>
                  ) : (
                    <span className="lst-remaining">{formatCurrency(entry.remaining ?? entry.total_amount)}</span>
                  )
                ) : <span className="lst-cell-muted">—</span>}
              </div>

              {/* Status */}
              <div className="lst-cell">
                <span className="lst-status-badge" style={{ background: st.bg, color: st.color }}>
                  {entry ? st.label : '—'}
                </span>
              </div>

              {/* Navigate */}
              <div className="lst-cell">
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
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
        .lst-total-statuses { display: flex; gap: 8px; font-size: 13px; font-weight: 600; margin-top: 2px; }

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
          grid-template-columns: 160px 90px 110px 100px 90px 80px 90px 100px 24px;
          gap: 0; padding: 10px 14px; align-items: center;
          min-width: 860px;
        }
        .lst-header {
          background: var(--bg-elevated); border-bottom: 1px solid var(--border);
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .lst-row {
          border-bottom: 1px solid rgba(42,42,74,0.5); cursor: pointer;
          transition: background 0.1s;
        }
        .lst-row:last-child { border-bottom: none; }
        .lst-row:hover { background: var(--bg-elevated); }
        .lst-cell { padding: 0 6px 0 0; }
        .lst-cell-muted { font-size: 12px; color: var(--text-muted); }

        .lst-person-cell { display: flex; align-items: center; gap: 6px; }
        .lst-avatar {
          width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
          background: rgba(108,99,255,0.15); color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
        }
        .lst-person-name { font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80px; }
        .lst-rel-badge { font-size: 10px; color: var(--text-muted); background: var(--bg-elevated); padding: 1px 6px; border-radius: 20px; white-space: nowrap; }

        .lst-type-chip { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
        .lst-lent { background: rgba(16,185,129,0.12); color: var(--accent-teal); }
        .lst-debt { background: rgba(249,115,22,0.12); color: var(--accent-coral); }

        .lst-total-amount { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .lst-paid-amount { font-size: 13px; font-weight: 600; color: var(--accent-teal); }
        .lst-remaining { font-size: 13px; font-weight: 700; color: var(--accent-coral); }
        .lst-remaining-zero { font-size: 11px; color: var(--accent-teal); }

        .lst-status-badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
      `}</style>
    </motion.div>
  )
}
