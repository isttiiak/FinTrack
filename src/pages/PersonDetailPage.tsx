import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, Edit2, ExternalLink,
  CreditCard, HandCoins,
} from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePerson, useDeleteLedgerEntry, useDeletePerson } from '@/hooks/useLedger'
import { DemoBlockedError } from '@/hooks/useDemoGuard'
import { useConfirmStore } from '@/stores/confirmStore'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import LedgerEntryForm from '@/components/ledger/LedgerEntryForm'
import PaymentForm from '@/components/ledger/PaymentForm'
import LedgerPaymentLogs from '@/components/ledger/LedgerPaymentLogs'
import ErrorBanner from '@/components/common/ErrorBanner'
import type { PersonLedger, PersonWithLedgers } from '@/types/ledger.types'
import type { LedgerType } from '@/lib/constants'
import './PersonDetailPage.css'

const STATUS_STYLE = {
  Pending: { bg: 'rgba(201, 115, 110,0.12)', color: '#C9736E', label: '⏳ Pending' },
  Partial:  { bg: 'rgba(194, 162, 78,0.12)', color: '#C2A24E', label: '🔄 Partial' },
  Settled:  { bg: 'rgba(79, 169, 129,0.12)', color: '#4FA981', label: '✅ Settled' },
}

export default function PersonDetailPage() {
  const { personId } = useParams({ strict: false }) as { personId: string }
  const navigate = useNavigate()
  const { data: person, isLoading, isError, refetch } = usePerson(personId)
  const { mutate: deleteEntry } = useDeleteLedgerEntry()
  const { mutateAsync: deletePerson } = useDeletePerson()
  const confirm = useConfirmStore((s) => s.confirm)
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)

  const [activeTab, setActiveTab] = useState<'timeline' | 'payments'>('timeline')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PersonLedger | null>(null)
  const [loggingPaymentFor, setLoggingPaymentFor] = useState<{ ledgerType: LedgerType; remaining: number } | null>(null)

  function handleAddEntry() {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    setShowAddEntry(true)
  }

  function handleDeleteEntry(id: string) {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    deleteEntry(id)
  }

  if (isLoading) {
    return (
      <div className="pd-page">
        <div className="pd-skeleton-hero" />
        <div className="pd-skeleton-list">
          {[1, 2].map((i) => <div key={i} className="pd-skeleton-card" />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="pd-page">
        <button className="pd-back" onClick={() => navigate({ to: '/ledger' })}>
          <ArrowLeft size={16} /> Back
        </button>
        <ErrorBanner message="Couldn't load this person — your connection or session may have hiccuped." onRetry={refetch} />
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
      </div>
    )
  }

  const totalOutstanding = person.total_outstanding_lent + person.total_outstanding_debt
  const netPosition = person.total_outstanding_lent - person.total_outstanding_debt

  async function handleDeletePerson() {
    const p = person!
    const ok = await confirm({
      title: `Remove ${p.name}?`,
      description: 'This removes the person and all their ledger entries permanently.',
      itemName: p.name,
    })
    if (!ok) return
    try {
      await deletePerson(personId)
      navigate({ to: '/ledger' })
    } catch (err) {
      // Demo-blocked: the toast already explained it — stay put rather
      // than navigating away from a person that's still here.
      if (!(err instanceof DemoBlockedError)) throw err
    }
  }

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
          {/* Hero action buttons */}
          <div className="pd-hero-btns">
            {person.total_outstanding_lent > 0 && (
              <button
                className="pd-action-btn pd-collect-btn"
                onClick={() => setLoggingPaymentFor({ ledgerType: 'Lent', remaining: person.total_outstanding_lent })}
              >
                <HandCoins size={13} /> Collect
              </button>
            )}
            {person.total_outstanding_debt > 0 && (
              <button
                className="pd-action-btn pd-pay-btn"
                onClick={() => setLoggingPaymentFor({ ledgerType: 'Debt', remaining: person.total_outstanding_debt })}
              >
                <CreditCard size={13} /> Pay
              </button>
            )}
            <DeleteButton onConfirm={handleDeletePerson} iconSize={13} />
          </div>
        </div>
      </motion.div>

      {/* Aggregate stats row */}
      {(person.lent_count > 0 || person.debt_count > 0) && (
        <div className="pd-stats-row">
          {person.lent_count > 0 && person.lent_status && (
            <div className="pd-stat-card pd-stat-lent">
              <div className="pd-stat-label">Total lent</div>
              <div className="pd-stat-amount">{formatCurrency(person.total_lent)}</div>
              <div className="pd-stat-sub">
                {person.lent_count} event{person.lent_count !== 1 ? 's' : ''} · Remaining: <strong>{formatCurrency(person.total_outstanding_lent)}</strong>
              </div>
              <span className="pd-status-badge" style={{ background: STATUS_STYLE[person.lent_status].bg, color: STATUS_STYLE[person.lent_status].color, marginTop: 4, display: 'inline-block' }}>
                {STATUS_STYLE[person.lent_status].label}
              </span>
              {person.overpaid_lent > 0 && (
                <span className="pd-overpaid-badge">Overpaid by {formatCurrency(person.overpaid_lent)}</span>
              )}
            </div>
          )}
          {person.debt_count > 0 && person.debt_status && (
            <div className="pd-stat-card pd-stat-debt">
              <div className="pd-stat-label">Total borrowed</div>
              <div className="pd-stat-amount">{formatCurrency(person.total_debt)}</div>
              <div className="pd-stat-sub">
                {person.debt_count} event{person.debt_count !== 1 ? 's' : ''} · Remaining: <strong>{formatCurrency(person.total_outstanding_debt)}</strong>
              </div>
              <span className="pd-status-badge" style={{ background: STATUS_STYLE[person.debt_status].bg, color: STATUS_STYLE[person.debt_status].color, marginTop: 4, display: 'inline-block' }}>
                {STATUS_STYLE[person.debt_status].label}
              </span>
              {person.overpaid_debt > 0 && (
                <span className="pd-overpaid-badge">Overpaid by {formatCurrency(person.overpaid_debt)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs + Add entry */}
      <div className="pd-section-header">
        <div className="pd-tabs">
          <button
            className={`pd-tab ${activeTab === 'timeline' ? 'pd-tab-active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            📋 Timeline
          </button>
          <button
            className={`pd-tab ${activeTab === 'payments' ? 'pd-tab-active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💳 Payments
          </button>
        </div>
        {activeTab === 'timeline' && (
          <motion.button
            className="btn-primary pd-add-btn"
            onClick={handleAddEntry}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={14} /> Add entry
          </motion.button>
        )}
      </div>

      {/* Payments tab */}
      {activeTab === 'payments' && (
        <LedgerPaymentLogs persons={[person as PersonWithLedgers]} />
      )}

      {/* Timeline tab */}
      {activeTab === 'timeline' && person.ledgers.length === 0 ? (
        <div className="pd-empty">
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>No entries yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 16px' }}>Add a lent or debt entry to start tracking.</p>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleAddEntry}>
            <Plus size={14} /> Add first entry
          </button>
        </div>
      ) : activeTab === 'timeline' ? (
        <motion.div className="pd-timeline" variants={staggerContainer} initial="initial" animate="animate">
          {person.ledgers.map((entry) => {
            const isLent = entry.ledger_type === 'Lent'

            return (
              <motion.div key={entry.id} className="pd-entry" variants={staggerItem} layout>
                {/* Entry header */}
                <div className="pd-entry-header">
                  <div className="pd-entry-type-dot" style={{
                    background: isLent
                      ? 'linear-gradient(135deg, #4FA981, #3E9B72)'
                      : 'linear-gradient(135deg, #C9736E, #C25B55)',
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
                      {entry.doc_link && (
                        <a href={entry.doc_link} target="_blank" rel="noopener noreferrer" className="pd-doc-link" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink size={12} /> Doc
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pd-entry-actions">
                    <button
                      className="pd-action-btn pd-edit-btn edit-btn-purple"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <DeleteButton
                      onConfirm={() => handleDeleteEntry(entry.id)}
                      iconSize={13}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      ) : null}

      {/* Modals */}
      <AnimatePresence>
        {(showAddEntry || editingEntry) && (
          <LedgerEntryForm
            personId={personId}
            editing={editingEntry}
            onClose={() => { setShowAddEntry(false); setEditingEntry(null) }}
          />
        )}
        {loggingPaymentFor && person && (
          <PaymentForm
            personId={person.id}
            personName={person.name}
            ledgerType={loggingPaymentFor.ledgerType}
            remaining={loggingPaymentFor.remaining}
            onClose={() => setLoggingPaymentFor(null)}
          />
        )}
      </AnimatePresence>

    </motion.div>
  )
}

