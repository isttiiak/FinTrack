import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useDeleteInvestmentPayment, useDeleteReturn } from '@/hooks/useInvestments'
import { fadeUp } from '@/lib/animations'
import type { Investment } from '@/types/investment.types'

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
            <div className="itl-cell">
              {row.txType === 'Payment Out' ? (
                <span className="itl-type-out"><ArrowUpRight size={11} /> {row.returnType ?? 'Payment'}</span>
              ) : (
                <span className="itl-type-in"><ArrowDownRight size={11} /> {row.returnType ?? 'Return'}</span>
              )}
            </div>

            {/* Date */}
            <div className="itl-cell itl-cell-muted">{formatDate(row.date)}</div>

            {/* Amount */}
            <div className="itl-cell">
              <span className={row.txType === 'Payment Out' ? 'itl-amount-out' : 'itl-amount-in'}>
                {row.txType === 'Payment Out' ? '−' : '+'}{formatCurrency(row.amount)}
              </span>
            </div>

            {/* Remaining to pay */}
            <div className="itl-cell">
              {row.remainingToPay > 0 ? (
                <span className="itl-remaining">{formatCurrency(row.remainingToPay)}</span>
              ) : (
                <span className="itl-remaining-zero">Fully paid</span>
              )}
            </div>

            {/* Running P&L */}
            <div className="itl-cell">
              <span className={row.cumulativePL >= 0 ? 'itl-pl-pos' : 'itl-pl-neg'}>
                {row.cumulativePL >= 0 ? '+' : ''}{formatCurrency(row.cumulativePL)}
              </span>
            </div>

            {/* Notes */}
            <div className="itl-cell itl-cell-muted">{row.notes ?? '—'}</div>

            {/* Delete */}
            <div className="itl-cell">
              <button
                className="itl-del-btn"
                data-tooltip={`Delete this ${row.txType === 'Payment Out' ? 'payment' : 'return'}`}
                onClick={() => {
                  if (row.txType === 'Payment Out') deletePayment(row.id)
                  else deleteReturn(row.id)
                }}
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <style>{`
        .itl-wrap { display: flex; flex-direction: column; gap: 12px; }
        .itl-empty { text-align: center; padding: 40px 16px; }

        .itl-filters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .itl-pill {
          padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.12s; display: flex; align-items: center; gap: 5px;
        }
        .itl-pill:hover { background: var(--bg-hover); color: var(--text-primary); }
        .itl-pill-active { background: linear-gradient(135deg,#F59E0B,#F97316); border-color: transparent; color: #fff; }
        .itl-pill-count { background: var(--bg-elevated); border-radius: 20px; padding: 0 6px; font-size: 10px; }
        .itl-pill-active .itl-pill-count { background: rgba(255,255,255,0.2); }

        .itl-filter-banner {
          overflow: hidden; display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; border-radius: 10px;
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
          font-size: 13px; color: var(--text-secondary);
        }
        .itl-filter-banner strong { color: var(--text-primary); }
        .itl-filter-clear { background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; }

        .itl-summary {
          display: flex; gap: 20px; flex-wrap: wrap;
          padding: 10px 14px; border-radius: 10px;
          background: var(--bg-card); border: 1px solid var(--border);
        }
        .itl-sum-item { display: flex; flex-direction: column; gap: 2px; }
        .itl-sum-label { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .itl-sum-value { font-size: 15px; font-weight: 700; color: var(--text-primary); }

        .itl-table {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          overflow: hidden; overflow-x: auto;
        }
        .itl-header-row, .itl-row {
          display: grid;
          grid-template-columns: 140px 110px 100px 90px 110px 100px 1fr 32px;
          gap: 0; padding: 10px 14px; min-width: 800px; align-items: center;
        }
        .itl-header-row {
          background: var(--bg-elevated); border-bottom: 1px solid var(--border);
          font-size: 10px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .itl-row { border-bottom: 1px solid rgba(42,42,74,0.5); transition: background 0.1s; }
        .itl-row:last-child { border-bottom: none; }
        .itl-row:hover { background: var(--bg-elevated); }

        .itl-cell { padding: 0 6px 0 0; }
        .itl-cell-muted { font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .itl-inv-btn { background: none; border: none; cursor: pointer; padding: 0; text-align: left; }
        .itl-inv-name { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .itl-inv-btn:hover .itl-inv-name { color: #F59E0B; }

        .itl-type-out { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: var(--accent-coral); background: rgba(249,115,22,0.1); padding: 2px 8px; border-radius: 20px; width: fit-content; }
        .itl-type-in { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: var(--accent-teal); background: rgba(16,185,129,0.1); padding: 2px 8px; border-radius: 20px; width: fit-content; }

        .itl-amount-out { font-size: 13px; font-weight: 700; color: var(--accent-coral); }
        .itl-amount-in  { font-size: 13px; font-weight: 700; color: var(--accent-teal); }
        .itl-remaining { font-size: 13px; font-weight: 600; color: #F59E0B; }
        .itl-remaining-zero { font-size: 11px; color: var(--accent-teal); }
        .itl-pl-pos { font-size: 13px; font-weight: 700; color: var(--accent-teal); }
        .itl-pl-neg { font-size: 13px; font-weight: 700; color: var(--accent-coral); }

        .itl-del-btn {
          width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; color: var(--text-muted); cursor: pointer;
        }
        .itl-del-btn:hover { background: rgba(239,68,68,0.1); color: var(--accent-red); }
      `}</style>
    </motion.div>
  )
}
