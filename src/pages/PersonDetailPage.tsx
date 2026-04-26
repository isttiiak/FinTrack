import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Edit2, Trash2, ExternalLink,
  ChevronDown, ChevronUp, CreditCard,
} from 'lucide-react'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePerson, useDeleteLedgerEntry, useDeletePayment } from '@/hooks/useLedger'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import LedgerEntryForm from '@/components/ledger/LedgerEntryForm'
import PaymentForm from '@/components/ledger/PaymentForm'
import type { PersonLedger, LedgerPayment } from '@/types/ledger.types'

const STATUS_STYLE = {
  Pending: { bg: 'rgba(249,115,22,0.12)', color: '#F97316', label: '⏳ Pending' },
  Partial:  { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: '🔄 Partial' },
  Settled:  { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: '✅ Settled' },
}

export default function PersonDetailPage() {
  const { personId } = useParams({ strict: false }) as { personId: string }
  const navigate = useNavigate()
  const { data: person, isLoading } = usePerson(personId)
  const { mutate: deleteEntry } = useDeleteLedgerEntry()
  const { mutate: deletePayment } = useDeletePayment()
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)

  const [showAddEntry, setShowAddEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PersonLedger | null>(null)
  const [loggingPaymentFor, setLoggingPaymentFor] = useState<PersonLedger | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAddEntry() {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    setShowAddEntry(true)
  }

  function handleDeleteEntry(id: string) {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    deleteEntry(id)
  }

  function handleDeletePayment(id: string) {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    deletePayment(id)
  }

  if (isLoading) {
    return (
      <div className="pd-page">
        <div className="pd-skeleton-hero" />
        <div className="pd-skeleton-list">
          {[1, 2].map((i) => <div key={i} className="pd-skeleton-card" />)}
        </div>
        <style>{skeletonStyles}</style>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="pd-page">
        <button className="pd-back" onClick={() => navigate({ to: '/ledger' })}>
          <ArrowLeft size={16} /> Back
        </button>
        <p style={{ color: 'var(--text-muted)', marginTop: 32, textAlign: 'center' }}>Person not found.</p>
        <style>{skeletonStyles}</style>
      </div>
    )
  }

  const totalOutstanding = person.total_outstanding_lent + person.total_outstanding_debt
  const netPosition = person.total_outstanding_lent - person.total_outstanding_debt

  return (
    <motion.div className="pd-page" variants={fadeUp} initial="initial" animate="animate">
      {/* Back */}
      <button className="pd-back" onClick={() => navigate({ to: '/ledger' })}>
        <ArrowLeft size={15} /> Back to Lent &amp; Debt
      </button>

      {/* Hero card */}
      <motion.div className="pd-hero" variants={fadeUp}>
        <div className="pd-hero-left">
          <div className="pd-hero-avatar">{person.name[0]?.toUpperCase()}</div>
          <div>
            <h1 className="pd-hero-name">{person.name}</h1>
            {person.relationship && <span className="pd-hero-rel">{person.relationship}</span>}
            {person.phone && <p className="pd-hero-phone">{person.phone}</p>}
          </div>
        </div>
        <div className="pd-hero-right">
          {totalOutstanding > 0 ? (
            <>
              <div className="pd-hero-net" style={{ color: netPosition >= 0 ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
                {netPosition >= 0 ? '+' : '−'}{formatCurrency(Math.abs(netPosition))}
              </div>
              <div className="pd-hero-net-label">
                {netPosition >= 0 ? 'they owe you' : 'you owe them'}
              </div>
            </>
          ) : person.ledgers.length > 0 ? (
            <div className="pd-hero-all-settled">All settled ✓</div>
          ) : null}
        </div>
      </motion.div>

      {/* Sub-totals row */}
      {(person.total_outstanding_lent > 0 || person.total_outstanding_debt > 0) && (
        <div className="pd-sub-row">
          {person.total_outstanding_lent > 0 && (
            <div className="pd-sub-chip pd-sub-lent">
              💸 {formatCurrency(person.total_outstanding_lent)} they owe
            </div>
          )}
          {person.total_outstanding_debt > 0 && (
            <div className="pd-sub-chip pd-sub-debt">
              🏦 {formatCurrency(person.total_outstanding_debt)} you owe
            </div>
          )}
        </div>
      )}

      {/* Section header */}
      <div className="pd-section-header">
        <h2 className="pd-section-title">Timeline</h2>
        <motion.button
          className="btn-primary pd-add-btn"
          onClick={handleAddEntry}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={14} /> Add entry
        </motion.button>
      </div>

      {/* Entry timeline */}
      {person.ledgers.length === 0 ? (
        <div className="pd-empty">
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No entries yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 16px' }}>Add a lent or debt entry to start tracking.</p>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleAddEntry}>
            <Plus size={14} /> Add first entry
          </button>
        </div>
      ) : (
        <motion.div className="pd-timeline" variants={staggerContainer} initial="initial" animate="animate">
          {person.ledgers.map((entry) => {
            const isExpanded = expandedEntries.has(entry.id)
            const status = entry.status ?? 'Pending'
            const st = STATUS_STYLE[status]
            const isLent = entry.ledger_type === 'Lent'

            return (
              <motion.div key={entry.id} className="pd-entry" variants={staggerItem} layout>
                {/* Entry header */}
                <div className="pd-entry-header">
                  <div className="pd-entry-type-dot" style={{
                    background: isLent
                      ? 'linear-gradient(135deg, #10B981, #06B6D4)'
                      : 'linear-gradient(135deg, #F97316, #EF4444)',
                  }} />

                  <div className="pd-entry-info">
                    <div className="pd-entry-top-row">
                      <span className="pd-entry-type">{isLent ? '💸 Lent' : '🏦 Debt'}</span>
                      <span className="pd-entry-amount" style={{ color: isLent ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
                        {isLent ? '+' : '−'}{formatCurrency(entry.total_amount)}
                      </span>
                    </div>

                    <div className="pd-entry-meta">
                      <span>{formatDate(entry.start_date)}</span>
                      {entry.reason && <span>· {entry.reason}</span>}
                      {entry.payment_method && <span>· {entry.payment_method}</span>}
                    </div>

                    <div className="pd-entry-bottom-row">
                      <span className="pd-status-badge" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                      {entry.remaining !== undefined && entry.remaining > 0 && (
                        <span className="pd-remaining">{formatCurrency(entry.remaining)} remaining</span>
                      )}
                      {entry.doc_link && (
                        <a href={entry.doc_link} target="_blank" rel="noopener noreferrer" className="pd-doc-link" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={12} /> Doc
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pd-entry-actions">
                    {status !== 'Settled' && (
                      <button
                        className="pd-action-btn pd-pay-btn"
                        onClick={() => setLoggingPaymentFor(entry)}
                        data-tooltip={entry.ledger_type === 'Lent' ? 'Log repayment from them' : 'Log your payment to them'}
                      >
                        <CreditCard size={13} /> Pay
                      </button>
                    )}
                    <button
                      className="pd-action-btn pd-edit-btn"
                      onClick={() => setEditingEntry(entry)}
                      data-tooltip="Edit this entry"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="pd-action-btn pd-del-btn"
                      onClick={() => handleDeleteEntry(entry.id)}
                      data-tooltip="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                    {(entry.payments?.length ?? 0) > 0 && (
                      <button
                        className="pd-action-btn pd-expand-btn"
                        onClick={() => toggleExpand(entry.id)}
                        data-tooltip={isExpanded ? 'Hide payment history' : 'View payment history'}
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Payments sub-list */}
                <AnimatePresence>
                  {isExpanded && (entry.payments?.length ?? 0) > 0 && (
                    <motion.div
                      className="pd-payments"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {(entry.payments as LedgerPayment[]).map((pay) => (
                        <div key={pay.id} className="pd-payment-row">
                          <div className="pd-pay-dot" />
                          <div className="pd-pay-info">
                            <span className="pd-pay-amount">{formatCurrency(pay.amount)}</span>
                            <span className="pd-pay-date">{formatDate(pay.payment_date)}</span>
                            {pay.payment_method && <span className="pd-pay-method">{pay.payment_method}</span>}
                            {pay.notes && <span className="pd-pay-notes">{pay.notes}</span>}
                          </div>
                          <button
                            className="pd-pay-del"
                            onClick={() => handleDeletePayment(pay.id)}
                            title="Remove payment"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showAddEntry || editingEntry) && (
          <LedgerEntryForm
            personId={personId}
            editing={editingEntry}
            onClose={() => { setShowAddEntry(false); setEditingEntry(null) }}
          />
        )}
        {loggingPaymentFor && (
          <PaymentForm
            entry={loggingPaymentFor}
            onClose={() => setLoggingPaymentFor(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .pd-page { max-width: 760px; }
        .pd-back {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13px; color: var(--text-secondary); background: none; border: none;
          cursor: pointer; padding: 0 0 20px; transition: color 0.15s;
        }
        .pd-back:hover { color: var(--text-primary); }

        /* Hero */
        .pd-hero {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
          padding: 16px; display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
        }
        .pd-hero-left { display: flex; align-items: center; gap: 16px; }
        .pd-hero-avatar {
          width: 60px; height: 60px; border-radius: 16px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(108,99,255,0.25), rgba(168,85,247,0.25));
          color: var(--accent-primary); font-size: 26px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
        .pd-hero-name { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .pd-hero-rel {
          display: inline-block; font-size: 12px; font-weight: 500; padding: 2px 10px; border-radius: 20px;
          background: rgba(108,99,255,0.12); color: var(--accent-primary);
        }
        .pd-hero-phone { font-size: 12px; color: var(--text-muted); margin: 4px 0 0; }
        .pd-hero-right { text-align: right; }
        .pd-hero-net { font-size: 28px; font-weight: 800; line-height: 1.1; }
        .pd-hero-net-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .pd-hero-all-settled { font-size: 16px; font-weight: 600; color: var(--accent-teal); }

        .pd-sub-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
        .pd-sub-chip {
          padding: 5px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;
          border: 1px solid;
        }
        .pd-sub-lent { background: rgba(16,185,129,0.1); color: var(--accent-teal); border-color: rgba(16,185,129,0.2); }
        .pd-sub-debt { background: rgba(249,115,22,0.1); color: var(--accent-coral); border-color: rgba(249,115,22,0.2); }

        .pd-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .pd-section-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
        .pd-add-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; padding: 8px 16px; }

        .pd-timeline { display: flex; flex-direction: column; gap: 10px; }
        .pd-empty { display: flex; flex-direction: column; align-items: center; padding: 48px 20px; text-align: center; }

        /* Entry card */
        .pd-entry {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          overflow: hidden;
        }
        .pd-entry-header {
          display: flex; align-items: flex-start; gap: 12px; padding: 16px;
        }
        .pd-entry-type-dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
        }
        .pd-entry-info { flex: 1; min-width: 0; }
        .pd-entry-top-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .pd-entry-type { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
        .pd-entry-amount { font-size: 17px; font-weight: 700; }
        .pd-entry-meta { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
        .pd-entry-bottom-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .pd-status-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
        .pd-remaining { font-size: 11px; color: var(--text-muted); }
        .pd-doc-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; color: var(--accent-primary); text-decoration: none;
        }
        .pd-doc-link:hover { text-decoration: underline; }

        /* Entry action buttons */
        .pd-entry-actions { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; }
        @media (max-width: 400px) { .pd-entry-top-row { flex-direction: column; gap: 4px; } }
        .pd-action-btn {
          height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center; gap: 4px;
          background: var(--bg-elevated); border: 1px solid var(--border);
          font-size: 12px; cursor: pointer; padding: 0 8px;
          transition: background 0.12s, color 0.12s;
        }
        .pd-pay-btn { color: var(--accent-teal); }
        .pd-pay-btn:hover { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); }
        .pd-edit-btn { color: var(--text-secondary); }
        .pd-edit-btn:hover { background: rgba(108,99,255,0.12); color: var(--accent-primary); border-color: rgba(108,99,255,0.3); }
        .pd-del-btn { color: var(--text-muted); }
        .pd-del-btn:hover { background: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.3); }
        .pd-expand-btn { color: var(--text-muted); }
        .pd-expand-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

        /* Payments sub-list */
        .pd-payments {
          overflow: hidden;
          border-top: 1px solid var(--border);
          background: rgba(0,0,0,0.15);
          padding: 0 16px;
        }
        .pd-payment-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 0; border-bottom: 1px solid rgba(42,42,74,0.4);
        }
        .pd-payment-row:last-child { border-bottom: none; }
        .pd-pay-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
          background: var(--accent-teal); opacity: 0.7;
        }
        .pd-pay-info { flex: 1; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .pd-pay-amount { font-size: 13px; font-weight: 600; color: var(--accent-teal); }
        .pd-pay-date { font-size: 12px; color: var(--text-muted); }
        .pd-pay-method { font-size: 11px; color: var(--text-muted); padding: 1px 6px; background: var(--bg-hover); border-radius: 5px; }
        .pd-pay-notes { font-size: 11px; color: var(--text-muted); font-style: italic; }
        .pd-pay-del {
          width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; color: var(--text-muted); cursor: pointer;
        }
        .pd-pay-del:hover { color: var(--accent-red); background: rgba(239,68,68,0.1); }

        ${skeletonStyles}
      `}</style>
    </motion.div>
  )
}

const skeletonStyles = `
  .pd-page { max-width: 760px; }
  .pd-back {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 13px; color: var(--text-secondary); background: none; border: none;
    cursor: pointer; padding: 0 0 20px;
  }
  .pd-skeleton-hero {
    height: 120px; border-radius: 18px; margin-bottom: 12px;
    background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
  }
  .pd-skeleton-list { display: flex; flex-direction: column; gap: 10px; }
  .pd-skeleton-card {
    height: 80px; border-radius: 14px;
    background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer { to { background-position: -200% 0; } }
`
