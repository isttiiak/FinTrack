import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Filter, Edit2, Check } from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useDeletePayment, useUpdatePayment } from '@/hooks/useLedger'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import type { PersonWithLedgers } from '@/types/ledger.types'
import { fadeUp } from '@/lib/animations'

interface EditingState {
  id: string
  amount: string
  notes: string
}

interface LogRow {
  id: string
  personId: string
  personName: string
  ledgerType: 'Lent' | 'Debt'
  entryReason: string | null
  entryTotal: number
  paymentDate: string
  amountPaid: number
  remainingAfter: number
  notes: string | null
  status: 'Settled' | 'Partial' | 'Pending'
}

const STATUS = {
  Settled: { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: '✅ Settled' },
  Partial:  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🔄 Partial' },
  Pending:  { bg: 'rgba(249,115,22,0.12)', color: '#F97316', label: '⏳ Pending' },
}

export default function LedgerPaymentLogs({ persons }: { persons: PersonWithLedgers[] }) {
  const { mutate: deletePayment } = useDeletePayment()
  const { mutateAsync: updatePayment, isPending: updating } = useUpdatePayment()
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)
  const [filterPerson, setFilterPerson] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)

  const allLogs = useMemo((): LogRow[] => {
    const rows: LogRow[] = []
    for (const person of persons) {
      for (const entry of person.ledgers) {
        const sorted = [...(entry.payments ?? [])].sort((a, b) =>
          a.payment_date.localeCompare(b.payment_date),
        )
        let runningPaid = 0
        for (const pay of sorted) {
          runningPaid += pay.amount
          const remaining = Math.max(0, entry.total_amount - runningPaid)
          rows.push({
            id:             pay.id,
            personId:       person.id,
            personName:     person.name,
            ledgerType:     entry.ledger_type,
            entryReason:    entry.reason,
            entryTotal:     entry.total_amount,
            paymentDate:    pay.payment_date,
            amountPaid:     pay.amount,
            remainingAfter: remaining,
            notes:          pay.notes,
            status:         remaining === 0 ? 'Settled' : runningPaid < entry.total_amount ? 'Partial' : 'Settled',
          })
        }
      }
    }
    return rows.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
  }, [persons])

  const filtered = filterPerson ? allLogs.filter((r) => r.personId === filterPerson) : allLogs

  const selectedPersonName = filterPerson
    ? persons.find((p) => p.id === filterPerson)?.name ?? null
    : null

  function handleDelete(id: string) {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    deletePayment(id)
  }

  function startEdit(row: LogRow) {
    setEditing({ id: row.id, amount: String(row.amountPaid), notes: row.notes ?? '' })
  }

  async function saveEdit() {
    if (!editing) return
    const amount = Number(editing.amount)
    if (isNaN(amount) || amount <= 0) { addToast({ type: 'error', message: 'Enter a valid amount' }); return }
    await updatePayment({ id: editing.id, amount, notes: editing.notes || null })
    setEditing(null)
  }

  // Per-person summary for filter pills
  const personSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalPaid: number }> = {}
    for (const row of allLogs) {
      if (!map[row.personId]) map[row.personId] = { name: row.personName, count: 0, totalPaid: 0 }
      map[row.personId].count++
      map[row.personId].totalPaid += row.amountPaid
    }
    return map
  }, [allLogs])

  if (allLogs.length === 0) {
    return (
      <motion.div className="lpl-empty" variants={fadeUp} initial="initial" animate="animate">
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No payment logs yet</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          Payments you log from PersonDetail will appear here.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div className="lpl-wrap" variants={fadeUp} initial="initial" animate="animate">
      {/* Person filter pills */}
      {Object.keys(personSummary).length > 1 && (
        <div className="lpl-filters">
          <Filter size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <button
            className={`lpl-pill ${filterPerson === null ? 'lpl-pill-active' : ''}`}
            onClick={() => setFilterPerson(null)}
          >
            All people
          </button>
          {Object.entries(personSummary).map(([id, s]) => (
            <button
              key={id}
              className={`lpl-pill ${filterPerson === id ? 'lpl-pill-active' : ''}`}
              onClick={() => setFilterPerson(filterPerson === id ? null : id)}
            >
              {s.name} <span className="lpl-pill-count">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active filter banner */}
      <AnimatePresence>
        {selectedPersonName && (
          <motion.div
            className="lpl-filter-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span>Showing payments for <strong>{selectedPersonName}</strong></span>
            <button className="lpl-filter-clear" onClick={() => setFilterPerson(null)}><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="lpl-summary-strip">
          <span className="lpl-summary-item">
            <span className="lpl-summary-label">Total payments</span>
            <span className="lpl-summary-value">{filtered.length}</span>
          </span>
          <span className="lpl-summary-item">
            <span className="lpl-summary-label">Total paid</span>
            <span className="lpl-summary-value" style={{ color: 'var(--accent-teal)' }}>
              {formatCurrency(filtered.reduce((s, r) => s + r.amountPaid, 0))}
            </span>
          </span>
          <span className="lpl-summary-item">
            <span className="lpl-summary-label">Settled entries</span>
            <span className="lpl-summary-value" style={{ color: 'var(--accent-teal)' }}>
              {filtered.filter((r) => r.status === 'Settled').length}
            </span>
          </span>
        </div>
      )}

      {/* Logs table */}
      <div className="lpl-table">
        {/* Header */}
        <div className="lpl-header-row">
          <span>Person</span>
          <span>Type</span>
          <span>Reason</span>
          <span>Date</span>
          <span>Paid</span>
          <span>Remaining</span>
          <span>Status</span>
          <span>Notes</span>
          <span></span>
        </div>

        {filtered.length === 0 ? (
          <div className="lpl-no-match">No payments found for this filter.</div>
        ) : (
          filtered.map((row) => {
            const st = STATUS[row.status]
            return (
              <motion.div
                key={row.id}
                className="lpl-row"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                {/* Person */}
                <div className="lpl-cell">
                  <button
                    className="lpl-person-btn"
                    onClick={() => setFilterPerson(filterPerson === row.personId ? null : row.personId)}
                  >
                    <span className="lpl-person-avatar">{row.personName[0]?.toUpperCase()}</span>
                    <span className="lpl-person-name">{row.personName}</span>
                  </button>
                </div>

                {/* Type */}
                <div className="lpl-cell">
                  <span className={`lpl-type-chip ${row.ledgerType === 'Lent' ? 'lpl-type-lent' : 'lpl-type-debt'}`}>
                    {row.ledgerType === 'Lent' ? '💸 Lent' : '🏦 Debt'}
                  </span>
                </div>

                {/* Reason */}
                <div className="lpl-cell lpl-cell-muted">{row.entryReason ?? '—'}</div>

                {/* Date */}
                <div className="lpl-cell lpl-cell-muted">{formatDate(row.paymentDate)}</div>

                {/* Amount paid — inline edit */}
                <div className="lpl-cell">
                  {editing?.id === row.id ? (
                    <input
                      className="lpl-edit-input"
                      type="number"
                      step="0.01"
                      value={editing.amount}
                      onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                      autoFocus
                    />
                  ) : (
                    <span className="lpl-amount-paid">{formatCurrency(row.amountPaid)}</span>
                  )}
                </div>

                {/* Remaining */}
                <div className="lpl-cell">
                  {row.remainingAfter === 0 ? (
                    <span className="lpl-remaining-zero">—</span>
                  ) : (
                    <span className="lpl-remaining">{formatCurrency(row.remainingAfter)}</span>
                  )}
                </div>

                {/* Status */}
                <div className="lpl-cell">
                  <span className="lpl-status" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>

                {/* Notes — inline edit */}
                <div className="lpl-cell">
                  {editing?.id === row.id ? (
                    <input
                      className="lpl-edit-input"
                      type="text"
                      placeholder="Notes…"
                      value={editing.notes}
                      onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    />
                  ) : (
                    <span className="lpl-cell-muted">{row.notes ?? '—'}</span>
                  )}
                </div>

                {/* Edit / Delete */}
                <div className="lpl-cell" style={{ display: 'flex', gap: 4 }}>
                  {editing?.id === row.id ? (
                    <button className="lpl-save-btn" onClick={saveEdit} disabled={updating} data-tooltip="Save changes">
                      <Check size={12} />
                    </button>
                  ) : (
                    <button className="lpl-edit-btn" onClick={() => startEdit(row)} data-tooltip="Edit this payment">
                      <Edit2 size={12} />
                    </button>
                  )}
                  {editing?.id === row.id ? (
                    <button
                      className="lpl-del-btn"
                      onClick={() => setEditing(null)}
                      data-tooltip="Cancel edit"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <DeleteButton onConfirm={() => handleDelete(row.id)} className="lpl-del-btn" iconSize={12} />
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      <style>{`
        .lpl-wrap { display: flex; flex-direction: column; gap: 12px; }
        .lpl-empty { text-align: center; padding: 40px 16px; }

        /* Filters */
        .lpl-filters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .lpl-pill {
          padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.12s, color 0.12s; display: flex; align-items: center; gap: 5px;
        }
        .lpl-pill:hover { background: var(--bg-hover); color: var(--text-primary); }
        .lpl-pill-active { background: linear-gradient(135deg,#6C63FF,#A855F7); border-color: transparent; color: #fff; }
        .lpl-pill-count {
          background: rgba(255,255,255,0.2); border-radius: 20px; padding: 0 6px; font-size: 10px;
        }
        .lpl-pill:not(.lpl-pill-active) .lpl-pill-count { background: var(--bg-elevated); }

        .lpl-filter-banner {
          overflow: hidden; display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; border-radius: 10px;
          background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.2);
          font-size: 13px; color: var(--text-secondary);
        }
        .lpl-filter-banner strong { color: var(--text-primary); }
        .lpl-filter-clear {
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center;
        }
        .lpl-filter-clear:hover { color: var(--text-primary); }

        /* Summary strip */
        .lpl-summary-strip {
          display: flex; gap: 20px; flex-wrap: wrap;
          padding: 10px 14px; border-radius: 10px;
          background: var(--bg-card); border: 1px solid var(--border);
        }
        .lpl-summary-item { display: flex; flex-direction: column; gap: 2px; }
        .lpl-summary-label { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .lpl-summary-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }

        /* Table */
        .lpl-table {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          overflow: hidden; overflow-x: auto;
        }
        .lpl-header-row {
          display: grid;
          grid-template-columns: 140px 90px 110px 100px 100px 90px 100px 1fr 60px;
          gap: 0;
          padding: 10px 14px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border);
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
          min-width: 900px;
        }
        .lpl-row {
          display: grid;
          grid-template-columns: 140px 90px 110px 100px 100px 90px 100px 1fr 60px;
          gap: 0;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(42,42,74,0.5);
          align-items: center;
          min-width: 900px;
          transition: background 0.1s;
        }
        .lpl-row:last-child { border-bottom: none; }
        .lpl-row:hover { background: var(--bg-elevated); }
        .lpl-no-match { padding: 20px 14px; font-size: 13px; color: var(--text-muted); text-align: center; }

        .lpl-cell { padding: 0 6px 0 0; }
        .lpl-cell-muted { font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .lpl-person-btn {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer; padding: 0; text-align: left;
        }
        .lpl-person-avatar {
          width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0;
          background: rgba(108,99,255,0.15); color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
        }
        .lpl-person-name { font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px; }
        .lpl-person-btn:hover .lpl-person-name { color: var(--accent-primary); }

        .lpl-type-chip { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
        .lpl-type-lent { background: rgba(16,185,129,0.12); color: var(--accent-teal); }
        .lpl-type-debt { background: rgba(249,115,22,0.12); color: var(--accent-coral); }

        .lpl-amount-paid { font-size: 13px; font-weight: 700; color: var(--accent-teal); }
        .lpl-remaining { font-size: 13px; font-weight: 600; color: var(--accent-coral); }
        .lpl-remaining-zero { font-size: 12px; color: var(--text-muted); }

        .lpl-status { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }

        .lpl-edit-input {
          background: var(--bg-elevated); border: 1px solid var(--border-focus); border-radius: 6px;
          color: var(--text-primary); font-size: 12px; padding: 3px 6px; width: 100%;
          outline: none;
        }
        .lpl-edit-btn, .lpl-save-btn, .lpl-del-btn {
          width: 24px; height: 24px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer;
          transition: background 0.1s, color 0.1s; flex-shrink: 0;
        }
        .lpl-edit-btn { color: var(--text-muted); }
        .lpl-edit-btn:hover { background: rgba(108,99,255,0.1); color: var(--accent-primary); }
        .lpl-save-btn { color: var(--accent-teal); }
        .lpl-save-btn:hover { background: rgba(16,185,129,0.1); }
        .lpl-del-btn { color: var(--text-muted); }
        .lpl-del-btn:hover { background: rgba(239,68,68,0.1); color: var(--accent-red); }
      `}</style>
    </motion.div>
  )
}
