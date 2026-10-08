import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Filter, ArrowUpRight, ArrowDownRight, Edit2 } from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useDeleteInvestmentPayment, useDeleteReturn } from '@/hooks/useInvestments'
import InvestmentPaymentForm from './InvestmentPaymentForm'
import ReturnForm from './ReturnForm'
import { fadeUp } from '@/lib/animations'
import type { Investment, InvestmentPayment, InvestmentReturn } from '@/types/investment.types'
import './InvestmentTransactionLogs.css'

interface TxRow {
  id: string
  invId: string
  invName: string
  txType: 'Payment Out' | 'Return In'
  returnType: string | null
  date: string
  amount: number
  remainingToPay: number   // after this payment/return
  cumulativePL: number     // running profit/loss
  notes: string | null
}

export default function InvestmentTransactionLogs({ investments }: { investments: Investment[] }) {
  const { mutate: deletePayment } = useDeleteInvestmentPayment()
  const { mutate: deleteReturn } = useDeleteReturn()
  const [filterInv, setFilterInv] = useState<string | null>(null)
  const [editing, setEditing] = useState<
    | { kind: 'payment'; investment: Investment; row: InvestmentPayment }
    | { kind: 'return'; investment: Investment; row: InvestmentReturn }
    | null
  >(null)

  function startEdit(row: TxRow) {
    const investment = investments.find((i) => i.id === row.invId)
    if (!investment) return
    if (row.txType === 'Payment Out') {
      const payment = investment.payments?.find((p) => p.id === row.id)
      if (payment) setEditing({ kind: 'payment', investment, row: payment })
    } else {
      const ret = investment.returns?.find((r) => r.id === row.id)
      if (ret) setEditing({ kind: 'return', investment, row: ret })
    }
  }

  const allRows = useMemo((): TxRow[] => {
    const rows: TxRow[] = []

    for (const inv of investments) {
      const committed = inv.committed_amount ?? 0

      // Build chronological transactions
      const paymentRows = (inv.payments ?? []).map((p) => ({
        id: p.id, date: p.payment_date, amount: p.amount, type: 'Payment Out' as const, returnType: null, notes: p.notes,
      }))
      const returnRows = (inv.returns ?? []).map((r) => ({
        id: r.id, date: r.return_date, amount: r.amount, type: 'Return In' as const, returnType: r.return_type, notes: r.notes,
      }))

      const all = [...paymentRows, ...returnRows].sort((a, b) => a.date.localeCompare(b.date))

      let totalPaid = 0
      let totalReturned = 0

      for (const tx of all) {
        if (tx.type === 'Payment Out') totalPaid += tx.amount
        else totalReturned += tx.amount

        const remainingToPay = Math.max(0, committed - totalPaid)
        const cumulativePL = totalReturned - totalPaid

        rows.push({
          id:             tx.id,
          invId:          inv.id,
          invName:        inv.name,
          txType:         tx.type,
          returnType:     tx.returnType,
          date:           tx.date,
          amount:         tx.amount,
          remainingToPay,
          cumulativePL,
          notes:          tx.notes,
        })
      }
    }

    return rows.sort((a, b) => b.date.localeCompare(a.date))
  }, [investments])

  const filtered = filterInv ? allRows.filter((r) => r.invId === filterInv) : allRows

  const invSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {}
    for (const r of allRows) {
      if (!map[r.invId]) map[r.invId] = { name: r.invName, count: 0 }
      map[r.invId].count++
    }
    return map
  }, [allRows])

  const selectedName = filterInv ? invSummary[filterInv]?.name ?? null : null
  const totalPaidOut = filtered.filter((r) => r.txType === 'Payment Out').reduce((s, r) => s + r.amount, 0)
  const totalReturnIn = filtered.filter((r) => r.txType === 'Return In').reduce((s, r) => s + r.amount, 0)

  if (allRows.length === 0) {
    return (
      <div className="itl-empty">
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No transactions yet</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
          Log payments and returns from the investment cards above.
        </p>
      </div>
    )
  }

  return (
    <motion.div className="itl-wrap" variants={fadeUp} initial="initial" animate="animate">
      {/* Filter pills */}
      {Object.keys(invSummary).length > 1 && (
        <div className="itl-filters">
          <Filter size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <button className={`itl-pill ${!filterInv ? 'itl-pill-active' : ''}`} onClick={() => setFilterInv(null)}>
            All investments
          </button>
          {Object.entries(invSummary).map(([id, s]) => (
            <button
              key={id}
              className={`itl-pill ${filterInv === id ? 'itl-pill-active' : ''}`}
              onClick={() => setFilterInv(filterInv === id ? null : id)}
            >
              {s.name} <span className="itl-pill-count">{s.count}</span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedName && (
          <motion.div className="itl-filter-banner" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <span>Showing: <strong>{selectedName}</strong></span>
            <button className="itl-filter-clear" onClick={() => setFilterInv(null)}><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary strip */}
      <div className="itl-summary">
        <div className="itl-sum-item">
          <span className="itl-sum-label">Total paid in</span>
          <span className="itl-sum-value" style={{ color: 'var(--accent-coral)' }}>{formatCurrency(totalPaidOut)}</span>
        </div>
        <div className="itl-sum-item">
          <span className="itl-sum-label">Total returned</span>
          <span className="itl-sum-value" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(totalReturnIn)}</span>
        </div>
        <div className="itl-sum-item">
          <span className="itl-sum-label">Net P&amp;L</span>
          <span className="itl-sum-value" style={{ color: totalReturnIn - totalPaidOut >= 0 ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
            {totalReturnIn - totalPaidOut >= 0 ? '+' : ''}{formatCurrency(totalReturnIn - totalPaidOut)}
          </span>
        </div>
        <div className="itl-sum-item">
          <span className="itl-sum-label">Entries</span>
          <span className="itl-sum-value">{filtered.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="itl-table">
        <div className="itl-header-row">
          <span>Investment</span>
          <span>Type</span>
          <span>Date</span>
          <span>Amount</span>
          <span>Remaining due</span>
          <span>Running P&amp;L</span>
          <span>Notes</span>
          <span></span>
        </div>

        {filtered.map((row) => (
          <motion.div key={`${row.txType}-${row.id}`} className="itl-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
            {/* Investment name */}
            <div className="itl-cell">
              <button className="itl-inv-btn" onClick={() => setFilterInv(filterInv === row.invId ? null : row.invId)}>
                <span className="itl-inv-name">{row.invName}</span>
              </button>
            </div>

            {/* Type */}
            <div className="itl-cell" data-label="Type">
              {row.txType === 'Payment Out' ? (
                <span className="itl-type-out"><ArrowUpRight size={11} /> {row.returnType ?? 'Payment'}</span>
              ) : (
                <span className="itl-type-in"><ArrowDownRight size={11} /> {row.returnType ?? 'Return'}</span>
              )}
            </div>

            {/* Date */}
            <div className="itl-cell itl-cell-muted" data-label="Date">{formatDate(row.date)}</div>

            {/* Amount */}
            <div className="itl-cell" data-label="Amount">
              <span className={row.txType === 'Payment Out' ? 'itl-amount-out' : 'itl-amount-in'}>
                {row.txType === 'Payment Out' ? '−' : '+'}{formatCurrency(row.amount)}
              </span>
            </div>

            {/* Remaining to pay */}
            <div className="itl-cell" data-label="Remaining due">
              {row.remainingToPay > 0 ? (
                <span className="itl-remaining">{formatCurrency(row.remainingToPay)}</span>
              ) : (
                <span className="itl-remaining-zero">Fully paid</span>
              )}
            </div>

            {/* Running P&L */}
            <div className="itl-cell" data-label="Running P&amp;L">
              <span className={row.cumulativePL >= 0 ? 'itl-pl-pos' : 'itl-pl-neg'}>
                {row.cumulativePL >= 0 ? '+' : ''}{formatCurrency(row.cumulativePL)}
              </span>
            </div>

            {/* Notes */}
            <div className="itl-cell" data-label="Notes">
              <span className="itl-cell-muted">{row.notes ?? '—'}</span>
            </div>

            {/* Edit / Delete */}
            <div className="itl-cell" style={{ display: 'flex', gap: 4 }}>
              <button className="itl-edit-btn" onClick={() => startEdit(row)} data-tooltip="Edit" aria-label="Edit">
                <Edit2 size={12} />
              </button>
              <DeleteButton
                onConfirm={() => row.txType === 'Payment Out' ? deletePayment(row.id) : deleteReturn(row.id)}
                className="itl-del-btn"
                iconSize={12}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editing?.kind === 'payment' && (
          <InvestmentPaymentForm investment={editing.investment} editing={editing.row} onClose={() => setEditing(null)} />
        )}
        {editing?.kind === 'return' && (
          <ReturnForm investment={editing.investment} editing={editing.row} onClose={() => setEditing(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
