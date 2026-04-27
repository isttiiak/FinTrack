import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, TrendingUp, Wallet, BarChart3,
  Edit2, ExternalLink, PlusCircle, CreditCard,
} from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import { useNavigate } from '@tanstack/react-router'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useInvestments, useDeleteInvestment } from '@/hooks/useInvestments'
import InvestmentForm from '@/components/investments/InvestmentForm'
import ReturnForm from '@/components/investments/ReturnForm'
import InvestmentPaymentForm from '@/components/investments/InvestmentPaymentForm'
import InvestmentTransactionLogs from '@/components/investments/InvestmentTransactionLogs'
import type { Investment } from '@/types/investment.types'

type InvTab = 'portfolio' | 'logs'

const CATEGORY_ICONS: Record<string, string> = {
  'Real Estate': '🏢', 'Shared Business': '🤝', 'Garments': '👕',
  'Farming': '🌾', 'Stocks': '📈', 'Crypto': '₿',
  'Fixed Deposit': '🏦', 'Savings Bond': '📄', 'Other': '💼',
}



export default function InvestmentsPage() {
  const { data: investments = [], isLoading } = useInvestments()
  const { mutate: deleteInvestment } = useDeleteInvestment()

  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<InvTab>('portfolio')
  const [showForm, setShowForm] = useState(false)
  const [editingInv, setEditingInv] = useState<Investment | null>(null)
  const [loggingReturnFor, setLoggingReturnFor] = useState<Investment | null>(null)
  const [loggingPaymentFor, setLoggingPaymentFor] = useState<Investment | null>(null)

  // Portfolio summary
  const totalCommitted  = investments.reduce((s, i) => s + (i.committed_amount ?? 0), 0)
  const totalReturned   = investments.reduce((s, i) => s + (i.total_returned ?? 0), 0)
  const totalMarketValue = investments.reduce((s, i) => s + (i.market_value ?? i.committed_amount ?? 0), 0)
  const overallPL = totalReturned - totalCommitted
  const overallROI = totalCommitted > 0 ? ((totalReturned - totalCommitted) / totalCommitted) * 100 : null

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="inv-page">
      {/* Header */}
      <div className="inv-header-row">
        <div>
          <h1 className="page-title">Investments</h1>
          <p className="page-subtitle">Track committed capital, returns, and ROI</p>
        </div>
        <motion.button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setShowForm(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Plus size={16} /> Add investment
        </motion.button>
      </div>

      {/* Portfolio summary */}
      {investments.length > 0 && (
        <motion.div className="inv-summary-grid" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div className="inv-sum-card inv-sum-amber" variants={staggerItem}>
            <div className="inv-sum-icon"><Wallet size={17} /></div>
            <div className="inv-sum-label">Total committed</div>
            <div className="inv-sum-value">{formatCurrency(totalCommitted)}</div>
            <div className="inv-sum-sub">{investments.length} investment{investments.length !== 1 ? 's' : ''}</div>
          </motion.div>

          <motion.div className="inv-sum-card inv-sum-teal" variants={staggerItem}>
            <div className="inv-sum-icon"><TrendingUp size={17} /></div>
            <div className="inv-sum-label">Total returned</div>
            <div className="inv-sum-value">{formatCurrency(totalReturned)}</div>
            <div className="inv-sum-sub">across all investments</div>
          </motion.div>

          <motion.div className={`inv-sum-card ${overallPL >= 0 ? 'inv-sum-teal' : 'inv-sum-coral'}`} variants={staggerItem}>
            <div className="inv-sum-icon"><BarChart3 size={17} /></div>
            <div className="inv-sum-label">Net P&amp;L</div>
            <div className="inv-sum-value" style={{ color: overallPL >= 0 ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>
              {overallPL >= 0 ? '+' : ''}{formatCurrency(overallPL)}
            </div>
            <div className="inv-sum-sub">
              {overallROI !== null ? `${overallROI >= 0 ? '+' : ''}${overallROI.toFixed(1)}% ROI` : 'No committed amount set'}
            </div>
          </motion.div>

          <motion.div className="inv-sum-card inv-sum-purple" variants={staggerItem}>
            <div className="inv-sum-icon"><BarChart3 size={17} /></div>
            <div className="inv-sum-label">Portfolio value</div>
            <div className="inv-sum-value">{formatCurrency(totalMarketValue)}</div>
            <div className="inv-sum-sub">current / committed</div>
          </motion.div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="inv-tabs">
        <button className={`inv-tab ${activeTab === 'portfolio' ? 'inv-tab-active' : ''}`} onClick={() => setActiveTab('portfolio')}>
          💼 Portfolio
        </button>
        <button className={`inv-tab ${activeTab === 'logs' ? 'inv-tab-active' : ''}`} onClick={() => setActiveTab('logs')}>
          📋 Transaction logs
        </button>
      </div>

      {/* Transaction logs tab */}
      {activeTab === 'logs' && (
        <InvestmentTransactionLogs investments={investments} />
      )}

      {/* Investment list */}
      {activeTab === 'portfolio' && isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="inv-skeleton" />)}
        </div>
      ) : activeTab === 'portfolio' && investments.length === 0 ? (
        <motion.div className="inv-empty" variants={fadeUp} initial="initial" animate="animate">
          <div className="inv-empty-icon">💼</div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600, fontSize: 16 }}>No investments yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 16px' }}>
            Add your first investment to start tracking capital and returns.
          </p>
          <motion.button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={15} /> Add first investment
          </motion.button>
        </motion.div>
      ) : activeTab === 'portfolio' ? (
        <motion.div className="inv-list" variants={staggerContainer} initial="initial" animate="animate">
          {investments.map((inv) => {
            const remainingToPay = inv.committed_amount != null && inv.total_paid != null
              ? Math.max(0, inv.committed_amount - inv.total_paid)
              : null
            const roi = inv.roi_percent
            const pl = inv.profit_loss ?? 0
            const progressPct = inv.committed_amount && inv.total_returned
              ? Math.min(100, (inv.total_returned / inv.committed_amount) * 100)
              : 0

            return (
              <motion.div
                key={inv.id}
                className="inv-card"
                variants={staggerItem}
                layout
                onClick={() => navigate({ to: '/investments/$investmentId', params: { investmentId: inv.id } })}
                style={{ cursor: 'pointer' }}
              >
                <div className="inv-card-header">
                  <div className="inv-card-icon">
                    {CATEGORY_ICONS[inv.category ?? ''] ?? '💼'}
                  </div>

                  <div className="inv-card-info">
                    <div className="inv-card-name-row">
                      <span className="inv-card-name">{inv.name}</span>
                      {inv.category && <span className="inv-card-cat">{inv.category}</span>}
                      {inv.company_name && <span className="inv-card-company">{inv.company_name}</span>}
                    </div>

                    <div className="inv-card-meta">
                      {inv.start_date && <span>{formatDate(inv.start_date)}</span>}
                      {inv.end_date && <span>→ {formatDate(inv.end_date)}</span>}
                    </div>

                    {inv.committed_amount && (
                      <>
                        <div className="inv-card-progress-bar">
                          <div
                            className="inv-card-progress-fill"
                            style={{
                              width: `${progressPct}%`,
                              background: pl >= 0
                                ? 'linear-gradient(90deg,#10B981,#06B6D4)'
                                : 'linear-gradient(90deg,#F97316,#EF4444)',
                            }}
                          />
                        </div>
                        <div className="inv-card-amounts">
                          <span className="inv-card-committed">Committed: {formatCurrency(inv.committed_amount)}</span>
                          {(inv.total_paid ?? 0) > 0 && (
                            <span className="inv-card-paid">Paid: {formatCurrency(inv.total_paid!)}</span>
                          )}
                          {remainingToPay !== null && remainingToPay > 0 && (
                            <span className="inv-card-remaining-pay">Due: {formatCurrency(remainingToPay)}</span>
                          )}
                          {(inv.total_returned ?? 0) > 0 && (
                            <span className="inv-card-returned">↩ {formatCurrency(inv.total_returned!)}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ROI + actions */}
                  <div className="inv-card-right" onClick={(e) => e.stopPropagation()}>
                    {roi !== undefined && (
                      <div className={`inv-roi ${roi >= 0 ? 'inv-roi-pos' : 'inv-roi-neg'}`}>
                        <span className="inv-roi-pct">{roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</span>
                        <span className="inv-roi-label">ROI</span>
                      </div>
                    )}
                    <div className="inv-card-actions">
                      <button
                        className="inv-action-btn inv-action-pay"
                        onClick={(e) => { e.stopPropagation(); setLoggingPaymentFor(inv) }}
                      >
                        <CreditCard size={13} /> Pay
                      </button>
                      <button
                        className="inv-action-btn inv-action-return"
                        onClick={(e) => { e.stopPropagation(); setLoggingReturnFor(inv) }}
                      >
                        <PlusCircle size={13} /> Return
                      </button>
                      <button
                        className="inv-action-btn inv-action-edit"
                        onClick={(e) => { e.stopPropagation(); setEditingInv(inv) }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <DeleteButton
                        onConfirm={() => deleteInvestment(inv.id)}
                        className="inv-action-btn inv-action-del"
                        iconSize={13}
                      />
                      {inv.doc_link && (
                        <a
                          href={inv.doc_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inv-action-btn inv-action-doc"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      ) : null}

      {/* Modals */}
      <AnimatePresence>
        {(showForm || editingInv) && (
          <InvestmentForm
            editing={editingInv}
            onClose={() => { setShowForm(false); setEditingInv(null) }}
          />
        )}
        {loggingReturnFor && (
          <ReturnForm
            investment={loggingReturnFor}
            onClose={() => setLoggingReturnFor(null)}
          />
        )}
        {loggingPaymentFor && (
          <InvestmentPaymentForm
            investment={loggingPaymentFor}
            onClose={() => setLoggingPaymentFor(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .inv-page { max-width: 960px; }
        .inv-header-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

        /* Summary grid */
        .inv-summary-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;
        }
        @media (max-width: 800px) { .inv-summary-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 400px) { .inv-summary-grid { grid-template-columns: 1fr; gap: 8px; } }
        .inv-sum-card {
          border-radius: 14px; padding: 16px; border: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 5px;
        }
        .inv-sum-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
        .inv-sum-label { font-size: 11px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .inv-sum-value { font-size: 20px; font-weight: 700; }
        .inv-sum-sub { font-size: 11px; color: var(--text-muted); }

        .inv-sum-amber { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.15); }
        .inv-sum-amber .inv-sum-icon { background: rgba(245,158,11,0.15); color: #F59E0B; }
        .inv-sum-amber .inv-sum-value { color: #F59E0B; }
        .inv-sum-teal { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.12); }
        .inv-sum-teal .inv-sum-icon { background: rgba(16,185,129,0.15); color: var(--accent-teal); }
        .inv-sum-teal .inv-sum-value { color: var(--accent-teal); }
        .inv-sum-coral { background: rgba(249,115,22,0.06); border-color: rgba(249,115,22,0.12); }
        .inv-sum-coral .inv-sum-icon { background: rgba(249,115,22,0.15); color: var(--accent-coral); }
        .inv-sum-purple { background: rgba(108,99,255,0.06); border-color: rgba(108,99,255,0.12); }
        .inv-sum-purple .inv-sum-icon { background: rgba(108,99,255,0.15); color: var(--accent-primary); }
        .inv-sum-purple .inv-sum-value { color: var(--accent-primary); }

        /* Card list */
        /* Tabs */
        .inv-tabs { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .inv-tab {
          padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .inv-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
        .inv-tab-active { background: linear-gradient(135deg,#F59E0B,#F97316); border-color: transparent; color: #fff; }

        .inv-list { display: flex; flex-direction: column; gap: 10px; }
        .inv-empty { display: flex; flex-direction: column; align-items: center; padding: 64px 20px; text-align: center; }
        .inv-empty-icon { font-size: 48px; margin-bottom: 12px; }
        .inv-skeleton {
          height: 90px; border-radius: 14px;
          background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
          background-size: 200% 100%; animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer { to { background-position: -200% 0; } }

        .inv-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .inv-card:hover { border-color: rgba(245,158,11,0.25); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
        .inv-card-header { display: flex; align-items: flex-start; gap: 10px; padding: 14px; flex-wrap: wrap; }
        @media (max-width: 400px) { .inv-card-header { padding: 12px; gap: 8px; } }
        .inv-card-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          background: rgba(245,158,11,0.12); display: flex; align-items: center; justify-content: center;
          font-size: 22px;
        }
        .inv-card-info { flex: 1; min-width: 0; }
        .inv-card-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 3px; }
        .inv-card-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
        .inv-card-cat {
          font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px;
          background: rgba(245,158,11,0.12); color: #F59E0B;
        }
        .inv-card-company { font-size: 12px; color: var(--text-muted); }
        .inv-card-meta { font-size: 12px; color: var(--text-muted); display: flex; gap: 6px; margin-bottom: 8px; }

        .inv-card-progress-bar {
          height: 5px; border-radius: 3px; background: var(--bg-elevated); overflow: hidden; margin-bottom: 5px;
        }
        .inv-card-progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
        .inv-card-amounts { display: flex; gap: 12px; flex-wrap: wrap; }
        .inv-card-committed { font-size: 12px; color: var(--text-muted); }
        .inv-card-paid { font-size: 12px; color: var(--accent-coral); font-weight: 500; }
        .inv-card-remaining-pay { font-size: 12px; color: #F59E0B; font-weight: 500; }
        .inv-card-returned { font-size: 12px; color: var(--accent-teal); font-weight: 500; }

        .inv-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
        .inv-roi { display: flex; flex-direction: column; align-items: flex-end; }
        .inv-roi-pct { font-size: 18px; font-weight: 800; }
        .inv-roi-pos .inv-roi-pct { color: var(--accent-teal); }
        .inv-roi-neg .inv-roi-pct { color: var(--accent-coral); }
        .inv-roi-label { font-size: 10px; color: var(--text-muted); }

        .inv-card-actions { display: flex; gap: 5px; flex-wrap: wrap; }
        .inv-action-btn {
          height: 28px; padding: 0 9px; border-radius: 7px; gap: 4px;
          display: flex; align-items: center; font-size: 12px; font-weight: 600;
          background: var(--bg-elevated); border: 1px solid var(--border);
          cursor: pointer; transition: background 0.12s, color 0.12s;
          text-decoration: none; white-space: nowrap;
        }
        .inv-action-pay { color: var(--accent-coral); }
        .inv-action-pay:hover { background: rgba(249,115,22,0.12); border-color: rgba(249,115,22,0.3); }
        .inv-action-return { color: var(--accent-teal); }
        .inv-action-return:hover { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); }
        .inv-action-edit { color: var(--text-secondary); }
        .inv-action-edit:hover { background: rgba(108,99,255,0.12); color: var(--accent-primary); border-color: rgba(108,99,255,0.3); }
        .inv-action-del { color: var(--text-muted); }
        .inv-action-del:hover { background: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.3); }
        .inv-action-doc { color: var(--accent-primary); }
        .inv-action-doc:hover { background: rgba(108,99,255,0.12); }
      `}</style>
    </motion.div>
  )
}
