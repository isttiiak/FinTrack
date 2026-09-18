import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Edit2, Wallet, TrendingUp, BarChart3,
  CreditCard, PlusCircle, ExternalLink, ArrowUpRight, ArrowDownRight,
  Trash2, SearchX,
} from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import EmptyState from '@/components/common/EmptyState'
import ErrorBanner from '@/components/common/ErrorBanner'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useInvestments, useDeleteReturn, useDeleteInvestmentPayment, useDeleteInvestment, useUpdateInvestmentPayment, useUpdateReturn } from '@/hooks/useInvestments'
import InvestmentForm from '@/components/investments/InvestmentForm'
import ReturnForm from '@/components/investments/ReturnForm'
import InvestmentPaymentForm from '@/components/investments/InvestmentPaymentForm'
import type { Investment, InvestmentReturn, InvestmentPayment } from '@/types/investment.types'
import './InvestmentDetailPage.css'

const RETURN_TYPE_COLORS: Record<string, string> = {
  Profit: 'var(--accent-teal)', 'Capital Return': 'var(--accent-primary)',
  Dividend: '#C2A24E', Rent: '#3E9B72', Other: 'var(--text-muted)',
}

type DetailTab = 'payments' | 'returns'

export default function InvestmentDetailPage() {
  const { investmentId } = useParams({ strict: false }) as { investmentId: string }
  const navigate = useNavigate()
  const { data: investments = [], isLoading, isError, refetch } = useInvestments()
  const { mutate: deleteReturn } = useDeleteReturn()
  const { mutate: deletePayment } = useDeleteInvestmentPayment()
  const { mutate: deleteInvestment } = useDeleteInvestment()
  const { mutate: updatePayment } = useUpdateInvestmentPayment()
  const { mutate: updateReturn } = useUpdateReturn()

  const [tab, setTab] = useState<DetailTab>('payments')
  const [editingInv, setEditingInv] = useState<Investment | null>(null)
  const [loggingPayment, setLoggingPayment] = useState(false)
  const [loggingReturn, setLoggingReturn] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null)
  const [paymentEditDraft, setPaymentEditDraft] = useState<{ amount: string; payment_date: string; notes: string }>({ amount: '', payment_date: '', notes: '' })
  const [returnEditDraft, setReturnEditDraft] = useState<{ amount: string; return_date: string; return_type: string; notes: string }>({ amount: '', return_date: '', return_type: '', notes: '' })

  const inv = investments.find((i) => i.id === investmentId)

  if (isLoading) {
    return (
      <div className="idp-page">
        <button className="idp-back" onClick={() => navigate({ to: '/investments' })}>
          <ArrowLeft size={15} /> Back
        </button>
        <div className="idp-skeleton-hero" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="idp-page">
        <button className="idp-back" onClick={() => navigate({ to: '/investments' })}>
          <ArrowLeft size={15} /> Back to Investments
        </button>
        <ErrorBanner message="Couldn't load this investment — your connection or session may have hiccuped." onRetry={refetch} />
      </div>
    )
  }

  if (!inv) {
    return (
      <div className="idp-page">
        <button className="idp-back" onClick={() => navigate({ to: '/investments' })}>
          <ArrowLeft size={15} /> Back to Investments
        </button>
        <EmptyState
          icon={<SearchX size={32} />}
          title="Investment not found"
          description="It may have been deleted, or the link is incorrect."
        />
      </div>
    )
  }

  const committed    = inv.committed_amount ?? 0
  const totalPaid    = inv.total_paid ?? 0
  const totalReturned = inv.total_returned ?? 0
  const remainingToPay = Math.max(0, committed - totalPaid)
  // ROI/P&L are computed once, against the committed amount, in useInvestments.ts's
  // enrich() — reused here so the list page and this page never disagree.
  const profitLoss   = inv.profit_loss
  const roi          = inv.roi_percent
  // Only shown when the user has actually entered a market_value — falling
  // back to totalPaid made this silently equal "Paid in" whenever no
  // valuation was set, contradicting a correctly negative ROI right next to it.
  const portfolioValue = inv.market_value ?? null
  const paymentProgress = committed > 0 ? Math.min(100, (totalPaid / committed) * 100) : 0

  const payments  = (inv.payments  ?? []) as InvestmentPayment[]
  const returns   = (inv.returns   ?? []) as InvestmentReturn[]

  return (
    <motion.div className="idp-page" variants={fadeUp} initial="initial" animate="animate">
      <button className="idp-back" onClick={() => navigate({ to: '/investments' })}>
        <ArrowLeft size={15} /> Back to Investments
      </button>

      {/* Hero */}
      <div className="idp-hero">
        <div className="idp-hero-left">
          <div className="idp-hero-icon">{inv.category === 'Real Estate' ? '🏢' : inv.category === 'Stocks' ? '📈' : inv.category === 'Crypto' ? '₿' : '💼'}</div>
          <div>
            <h1 className="idp-hero-name">{inv.name}</h1>
            <div className="idp-hero-meta">
              {inv.category && <span className="idp-hero-cat">{inv.category}</span>}
              {inv.company_name && <span className="idp-hero-company">{inv.company_name}</span>}
              {inv.start_date && <span className="idp-hero-date">Since {formatDate(inv.start_date)}</span>}
              {inv.end_date && <span className="idp-hero-date">→ {formatDate(inv.end_date)}</span>}
              {inv.doc_link && (
                <a href={inv.doc_link} target="_blank" rel="noopener noreferrer" className="idp-doc-link">
                  <ExternalLink size={12} /> Document
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="idp-hero-actions">
          <button className="idp-action-btn idp-action-pay" onClick={() => setLoggingPayment(true)}>
            <CreditCard size={14} /> Pay
          </button>
          <button className="idp-action-btn idp-action-return" onClick={() => setLoggingReturn(true)}>
            <PlusCircle size={14} /> Return
          </button>
          <button className="idp-action-btn idp-action-edit edit-btn-purple" onClick={() => setEditingInv(inv)}>
            <Edit2 size={14} /> Edit
          </button>
          <button
            className="idp-action-btn idp-action-delete"
            onClick={() => { deleteInvestment(inv.id); navigate({ to: '/investments' }) }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <motion.div className="idp-kpis" variants={staggerContainer} initial="initial" animate="animate">
        <motion.div className="idp-kpi idp-kpi-amber" variants={staggerItem}>
          <div className="idp-kpi-icon"><Wallet size={16} /></div>
          <div className="idp-kpi-label">Committed</div>
          <div className="idp-kpi-value">{formatCurrency(committed)}</div>
          <div className="idp-kpi-sub">Total agreed amount</div>
        </motion.div>

        <motion.div className="idp-kpi idp-kpi-coral" variants={staggerItem}>
          <div className="idp-kpi-icon"><ArrowUpRight size={16} /></div>
          <div className="idp-kpi-label">Paid in</div>
          <div className="idp-kpi-value">{formatCurrency(totalPaid)}</div>
          {remainingToPay > 0 && (
            <div className="idp-kpi-sub" style={{ color: '#C2A24E' }}>{formatCurrency(remainingToPay)} still due</div>
          )}
          {remainingToPay === 0 && committed > 0 && (
            <div className="idp-kpi-sub" style={{ color: 'var(--accent-teal)' }}>Fully paid ✓</div>
          )}
          {/* Progress bar */}
          {committed > 0 && (
            <div className="idp-progress-wrap">
              <div className="idp-progress-bar" style={{ width: `${paymentProgress}%` }} />
            </div>
          )}
        </motion.div>

        <motion.div className="idp-kpi idp-kpi-teal" variants={staggerItem}>
          <div className="idp-kpi-icon"><ArrowDownRight size={16} /></div>
          <div className="idp-kpi-label">Returned</div>
          <div className="idp-kpi-value">{formatCurrency(totalReturned)}</div>
          <div className="idp-kpi-sub">{returns.length} return{returns.length !== 1 ? 's' : ''} logged</div>
        </motion.div>

        <motion.div className={`idp-kpi ${(profitLoss ?? 0) >= 0 ? 'idp-kpi-teal' : 'idp-kpi-coral'}`} variants={staggerItem}>
          <div className="idp-kpi-icon"><BarChart3 size={16} /></div>
          <div className="idp-kpi-label">Net P&amp;L</div>
          <div className="idp-kpi-value" style={{ color: (profitLoss ?? 0) >= 0 ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
            {profitLoss !== undefined ? `${profitLoss >= 0 ? '+' : ''}${formatCurrency(profitLoss)}` : '—'}
          </div>
          <div className="idp-kpi-sub">
            {roi !== undefined ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}% ROI` : '—'}
          </div>
        </motion.div>

        <motion.div className="idp-kpi idp-kpi-purple" variants={staggerItem}>
          <div className="idp-kpi-icon"><TrendingUp size={16} /></div>
          <div className="idp-kpi-label">Portfolio value</div>
          <div className="idp-kpi-value">{portfolioValue != null ? formatCurrency(portfolioValue) : '—'}</div>
          <div className="idp-kpi-sub">{portfolioValue != null ? 'Market value' : 'Not valued yet'}</div>
        </motion.div>
      </motion.div>

      {inv.notes && (
        <div className="idp-notes-card">
          <span className="idp-notes-label">Notes</span>
          <span className="idp-notes-text">{inv.notes}</span>
        </div>
      )}

      {/* Detail tabs */}
      <div className="idp-tabs">
        <button className={`idp-tab ${tab === 'payments' ? 'idp-tab-active' : ''}`} onClick={() => setTab('payments')}>
          💸 Payments out ({payments.length})
        </button>
        <button className={`idp-tab ${tab === 'returns' ? 'idp-tab-active' : ''}`} onClick={() => setTab('returns')}>
          ↩ Returns received ({returns.length})
        </button>
      </div>

      {tab === 'payments' && (
        <div className="idp-list">
          {payments.length === 0 ? (
            <div className="idp-empty">
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No payments logged yet</p>
              <button className="btn-primary" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }} onClick={() => setLoggingPayment(true)}>
                <CreditCard size={14} /> Log first payment
              </button>
            </div>
          ) : (
            [...payments]
              .sort((a, b) => b.payment_date.localeCompare(a.payment_date))
              .map((pay, i, arr) => {
                const remaining = Math.max(0, committed - (totalPaid - arr.slice(0, i).reduce((s, p) => s + p.amount, 0)))
                const isEditing = editingPaymentId === pay.id
                return (
                  <div key={pay.id} className="idp-row" style={{ flexWrap: 'wrap' }}>
                    <div className="idp-row-dot" style={{ background: 'var(--accent-coral)' }} />
                    <div className="idp-row-info">
                      <span className="idp-row-amount idp-amount-out">−{formatCurrency(pay.amount)}</span>
                      <span className="idp-row-date">{formatDate(pay.payment_date)}</span>
                      <span className="idp-row-chip idp-chip-out">Payment out</span>
                      {pay.notes && <span className="idp-row-notes">{pay.notes}</span>}
                    </div>
                    <div className="idp-row-remaining">
                      {remaining > 0 ? (
                        <>
                          <span className="idp-remaining-label">Remaining</span>
                          <span className="idp-remaining-val">{formatCurrency(remaining)}</span>
                        </>
                      ) : (
                        <span className="idp-fully-paid">Fully paid ✓</span>
                      )}
                    </div>
                    <button
                      className="idp-row-edit-btn edit-btn-purple"
                      onClick={() => {
                        setEditingPaymentId(pay.id)
                        setPaymentEditDraft({ amount: String(pay.amount), payment_date: pay.payment_date, notes: pay.notes ?? '' })
                      }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <DeleteButton onConfirm={() => deletePayment(pay.id)} className="idp-del-btn" iconSize={12} />
                    {isEditing && (
                      <div className="idp-inline-edit">
                        <input
                          type="number" step="0.01" className="idp-inline-input" placeholder="Amount"
                          value={paymentEditDraft.amount}
                          onChange={(e) => setPaymentEditDraft((d) => ({ ...d, amount: e.target.value }))}
                        />
                        <input
                          type="date" className="idp-inline-input"
                          value={paymentEditDraft.payment_date}
                          onChange={(e) => setPaymentEditDraft((d) => ({ ...d, payment_date: e.target.value }))}
                        />
                        <input
                          type="text" className="idp-inline-input" placeholder="Notes (optional)"
                          value={paymentEditDraft.notes}
                          onChange={(e) => setPaymentEditDraft((d) => ({ ...d, notes: e.target.value }))}
                        />
                        <div className="idp-inline-actions">
                          <button
                            className="idp-inline-save"
                            onClick={() => {
                              updatePayment({
                                id: pay.id,
                                amount: parseFloat(paymentEditDraft.amount),
                                payment_date: paymentEditDraft.payment_date,
                                notes: paymentEditDraft.notes || null,
                              })
                              setEditingPaymentId(null)
                            }}
                          >Save</button>
                          <button className="idp-inline-cancel" onClick={() => setEditingPaymentId(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {tab === 'returns' && (
        <div className="idp-list">
          {returns.length === 0 ? (
            <div className="idp-empty">
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No returns logged yet</p>
              <button className="btn-primary" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }} onClick={() => setLoggingReturn(true)}>
                <PlusCircle size={14} /> Log first return
              </button>
            </div>
          ) : (
            [...returns]
              .sort((a, b) => b.return_date.localeCompare(a.return_date))
              .map((ret) => {
                const color = RETURN_TYPE_COLORS[ret.return_type ?? ''] ?? 'var(--text-muted)'
                const isEditing = editingReturnId === ret.id
                return (
                  <div key={ret.id} className="idp-row" style={{ flexWrap: 'wrap' }}>
                    <div className="idp-row-dot" style={{ background: color }} />
                    <div className="idp-row-info">
                      <span className="idp-row-amount idp-amount-in">+{formatCurrency(ret.amount)}</span>
                      <span className="idp-row-date">{formatDate(ret.return_date)}</span>
                      {ret.return_type && (
                        <span className="idp-row-chip" style={{ color, background: `${color}22` }}>{ret.return_type}</span>
                      )}
                      {ret.notes && <span className="idp-row-notes">{ret.notes}</span>}
                    </div>
                    <div className="idp-row-remaining" />
                    <button
                      className="idp-row-edit-btn edit-btn-purple"
                      onClick={() => {
                        setEditingReturnId(ret.id)
                        setReturnEditDraft({ amount: String(ret.amount), return_date: ret.return_date, return_type: ret.return_type ?? '', notes: ret.notes ?? '' })
                      }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <DeleteButton onConfirm={() => deleteReturn(ret.id)} className="idp-del-btn" iconSize={12} />
                    {isEditing && (
                      <div className="idp-inline-edit">
                        <input
                          type="number" step="0.01" className="idp-inline-input" placeholder="Amount"
                          value={returnEditDraft.amount}
                          onChange={(e) => setReturnEditDraft((d) => ({ ...d, amount: e.target.value }))}
                        />
                        <input
                          type="date" className="idp-inline-input"
                          value={returnEditDraft.return_date}
                          onChange={(e) => setReturnEditDraft((d) => ({ ...d, return_date: e.target.value }))}
                        />
                        <select
                          className="idp-inline-input"
                          value={returnEditDraft.return_type}
                          onChange={(e) => setReturnEditDraft((d) => ({ ...d, return_type: e.target.value }))}
                        >
                          <option value="">— None —</option>
                          {(['Profit', 'Capital Return', 'Dividend', 'Rent', 'Other'] as const).map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <input
                          type="text" className="idp-inline-input" placeholder="Notes (optional)"
                          value={returnEditDraft.notes}
                          onChange={(e) => setReturnEditDraft((d) => ({ ...d, notes: e.target.value }))}
                        />
                        <div className="idp-inline-actions">
                          <button
                            className="idp-inline-save"
                            onClick={() => {
                              updateReturn({
                                id: ret.id,
                                amount: parseFloat(returnEditDraft.amount),
                                return_date: returnEditDraft.return_date,
                                return_type: (returnEditDraft.return_type as InvestmentReturn['return_type']) || null,
                                notes: returnEditDraft.notes || null,
                              })
                              setEditingReturnId(null)
                            }}
                          >Save</button>
                          <button className="idp-inline-cancel" onClick={() => setEditingReturnId(null)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {editingInv && <InvestmentForm editing={editingInv} onClose={() => setEditingInv(null)} />}
        {loggingPayment && <InvestmentPaymentForm investment={inv} onClose={() => setLoggingPayment(false)} />}
        {loggingReturn && <ReturnForm investment={inv} onClose={() => setLoggingReturn(false)} />}
      </AnimatePresence>

    </motion.div>
  )
}

