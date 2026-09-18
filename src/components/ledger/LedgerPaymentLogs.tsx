import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Filter, Check, HandCoins, CreditCard, ArrowDownCircle, ArrowUpCircle, ChevronDown } from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import { formatCurrency, formatDate, round2 } from '@/lib/utils'
import { useDeletePayment, useUpdatePayment } from '@/hooks/useLedger'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import type { PersonWithLedgers } from '@/types/ledger.types'
import type { LedgerType } from '@/lib/constants'
import { fadeUp } from '@/lib/animations'
import './LedgerPaymentLogs.css'

interface EditingState {
  id: string
  amount: string
}

// One row per lend/debt entry OR payment, merged into a single
// chronological timeline per (person, type) with a running balance —
// this is the "central" view: you can see exactly why the balance
// changed at each point, instead of a payments-only list.
interface HistoryRow {
  key: string
  personId: string
  personName: string
  ledgerType: LedgerType
  date: string
  kind: 'entry' | 'payment'
  amount: number
  runningBalance: number
  reason: string | null
  paymentMethod: string | null
  notes: string | null
  sourceId: string
}

function rowLabel(row: HistoryRow): string {
  if (row.kind === 'entry') return row.ledgerType === 'Lent' ? 'Lent' : 'Borrowed'
  return row.ledgerType === 'Lent' ? 'Collected' : 'Paid'
}

function rowColor(row: HistoryRow): string {
  return row.ledgerType === 'Lent' ? 'var(--accent-teal)' : 'var(--accent-coral)'
}

export default function LedgerPaymentLogs({ persons }: { persons: PersonWithLedgers[] }) {
  const { mutate: deletePayment } = useDeletePayment()
  const { mutateAsync: updatePayment, isPending: updating } = useUpdatePayment()
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)
  const [filterPerson, setFilterPerson] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditingState | null>(null)

  const allRows = useMemo((): HistoryRow[] => {
    const rows: HistoryRow[] = []
    for (const person of persons) {
      for (const type of ['Lent', 'Debt'] as const) {
        const entries = person.ledgers.filter((l) => l.ledger_type === type)
        const payments = person.payments.filter((p) => p.ledger_type === type)
        if (entries.length === 0 && payments.length === 0) continue

        const events = [
          ...entries.map((e) => ({
            date: e.start_date, kind: 'entry' as const, amount: e.total_amount, sourceId: e.id,
            reason: e.reason, paymentMethod: e.payment_method, notes: null as string | null,
          })),
          ...payments.map((p) => ({
            date: p.payment_date, kind: 'payment' as const, amount: p.amount, sourceId: p.id,
            reason: null as string | null, paymentMethod: p.payment_method, notes: p.notes,
          })),
        ].sort((a, b) => {
          const dateCmp = a.date.localeCompare(b.date)
          if (dateCmp !== 0) return dateCmp
          if (a.kind === b.kind) return 0
          return a.kind === 'entry' ? -1 : 1
        })

        let balance = 0
        for (const ev of events) {
          balance += ev.kind === 'entry' ? ev.amount : -ev.amount
          balance = round2(Math.max(0, balance))
          rows.push({
            key: `${person.id}-${type}-${ev.kind}-${ev.sourceId}`,
            personId: person.id,
            personName: person.name,
            ledgerType: type,
            date: ev.date,
            kind: ev.kind,
            amount: ev.amount,
            runningBalance: balance,
            reason: ev.reason,
            paymentMethod: ev.paymentMethod,
            notes: ev.notes,
            sourceId: ev.sourceId,
          })
        }
      }
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [persons])

  const filtered = filterPerson ? allRows.filter((r) => r.personId === filterPerson) : allRows

  const selectedPersonName = filterPerson
    ? persons.find((p) => p.id === filterPerson)?.name ?? null
    : null

  function handleDelete(id: string) {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    deletePayment(id)
  }

  function startEdit(row: HistoryRow) {
    setEditing({ id: row.sourceId, amount: String(row.amount) })
  }

  async function saveEdit() {
    if (!editing) return
    const amount = Number(editing.amount)
    if (isNaN(amount) || amount <= 0) { addToast({ type: 'error', message: 'Enter a valid amount' }); return }
    try {
      await updatePayment({ id: editing.id, amount })
      setEditing(null)
    } catch (err) {
      if (err instanceof DemoBlockedError) setEditing(null)
    }
  }

  // Per-person summary for filter pills
  const personSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {}
    for (const row of allRows) {
      if (!map[row.personId]) map[row.personId] = { name: row.personName, count: 0 }
      map[row.personId].count++
    }
    return map
  }, [allRows])

  // "Currently settled" = distinct (person, type) pairs whose most recent row has a zero balance.
  // allRows is sorted newest-first, so the first row seen per key is the most recent.
  const settledPairCount = useMemo(() => {
    const seen = new Set<string>()
    let settled = 0
    for (const row of filtered) {
      const pairKey = `${row.personId}-${row.ledgerType}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      if (row.runningBalance === 0) settled++
    }
    return settled
  }, [filtered])

  const totalPaid = filtered.filter((r) => r.kind === 'payment').reduce((s, r) => s + r.amount, 0)
  const paymentCount = filtered.filter((r) => r.kind === 'payment').length

  if (allRows.length === 0) {
    return (
      <motion.div className="lpl-empty" variants={fadeUp} initial="initial" animate="animate">
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No history yet</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          Lend/debt entries and payments will appear here as a running balance.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div className="lpl-wrap" variants={fadeUp} initial="initial" animate="animate">
      {/* Person filter: "All people" toggle + a dropdown to pick one */}
      {Object.keys(personSummary).length > 1 && (
        <div className="lpl-filters">
          <Filter size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <button
            className={`lpl-pill ${filterPerson === null ? 'lpl-pill-active' : ''}`}
            onClick={() => setFilterPerson(null)}
          >
            All people
          </button>
          <div className="lpl-person-select-wrap">
            <select
              className="lpl-person-select"
              value={filterPerson ?? ''}
              onChange={(e) => setFilterPerson(e.target.value || null)}
            >
              <option value="">Select a person…</option>
              {Object.entries(personSummary)
                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                .map(([id, s]) => (
                  <option key={id} value={id}>{s.name} ({s.count})</option>
                ))}
            </select>
            <ChevronDown size={13} className="lpl-select-icon" />
          </div>
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
            <span>Showing history for <strong>{selectedPersonName}</strong></span>
            <button className="lpl-filter-clear" onClick={() => setFilterPerson(null)}><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="lpl-summary-strip">
          <span className="lpl-summary-item">
            <span className="lpl-summary-label">Payments logged</span>
            <span className="lpl-summary-value">{paymentCount}</span>
          </span>
          <span className="lpl-summary-item">
            <span className="lpl-summary-label">Total paid</span>
            <span className="lpl-summary-value" style={{ color: 'var(--accent-teal)' }}>
              {formatCurrency(totalPaid)}
            </span>
          </span>
          <span className="lpl-summary-item">
            <span className="lpl-summary-label">Settled balances</span>
            <span className="lpl-summary-value" style={{ color: 'var(--accent-teal)' }}>
              {settledPairCount}
            </span>
          </span>
        </div>
      )}

      {/* Unified history */}
      <div className="lpl-list">
        {filtered.length === 0 ? (
          <div className="lpl-no-match">No history found for this filter.</div>
        ) : (
          filtered.map((row) => (
            <motion.div
              key={row.key}
              className="lpl-row"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <div className="lpl-row-icon" style={{ color: rowColor(row) }}>
                {row.kind === 'entry'
                  ? (row.ledgerType === 'Lent' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />)
                  : (row.ledgerType === 'Lent' ? <HandCoins size={18} /> : <CreditCard size={18} />)}
              </div>

              <div className="lpl-row-info">
                <div className="lpl-row-top">
                  <button
                    className="lpl-person-btn"
                    onClick={() => setFilterPerson(filterPerson === row.personId ? null : row.personId)}
                  >
                    {row.personName}
                  </button>
                  <span className="lpl-row-action" style={{ color: rowColor(row) }}>
                    {rowLabel(row)} {formatCurrency(row.amount)}
                  </span>
                </div>
                <div className="lpl-row-meta">
                  <span>{formatDate(row.date)}</span>
                  <span className={`lpl-type-chip ${row.ledgerType === 'Lent' ? 'lpl-type-lent' : 'lpl-type-debt'}`}>
                    {row.ledgerType === 'Lent' ? '💸 Lent' : '🏦 Debt'}
                  </span>
                  {row.reason && <span>· {row.reason}</span>}
                  {row.paymentMethod && <span>· {row.paymentMethod}</span>}
                  {row.notes && <span>· {row.notes}</span>}
                </div>
              </div>

              <div className="lpl-row-balance">
                <span className="lpl-balance-label">Balance</span>
                {editing?.id === row.sourceId ? (
                  <input
                    className="lpl-edit-input"
                    type="number"
                    step="0.01"
                    value={editing.amount}
                    onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                    autoFocus
                  />
                ) : (
                  <span className="lpl-balance-value">
                    {row.runningBalance === 0 ? '—' : formatCurrency(row.runningBalance)}
                  </span>
                )}
              </div>

              {row.kind === 'payment' && (
                <div className="lpl-row-actions">
                  {editing?.id === row.sourceId ? (
                    <>
                      <button className="lpl-save-btn" onClick={saveEdit} disabled={updating}>
                        <Check size={12} />
                      </button>
                      <button className="lpl-cancel-btn" onClick={() => setEditing(null)}>
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="lpl-edit-btn edit-btn-purple" onClick={() => startEdit(row)}>
                        Edit
                      </button>
                      <DeleteButton onConfirm={() => handleDelete(row.sourceId)} iconSize={12} />
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

    </motion.div>
  )
}
