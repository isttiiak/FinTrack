import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, TrendingUp, Wallet, BarChart3,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useInvestments } from '@/hooks/useInvestments'
import InvestmentForm from '@/components/investments/InvestmentForm'
import InvestmentTransactionLogs from '@/components/investments/InvestmentTransactionLogs'
import ErrorBanner from '@/components/common/ErrorBanner'
import SearchToggle from '@/components/common/SearchToggle'
import './InvestmentsPage.css'

type InvTab = 'portfolio' | 'logs'


const CATEGORY_ICONS: Record<string, string> = {
  'Real Estate': '🏢', 'Shared Business': '🤝', 'Garments': '👕',
  'Farming': '🌾', 'Stocks': '📈', 'Crypto': '₿',
  'Fixed Deposit': '🏦', 'Savings Bond': '📄', 'Other': '💼',
}



export default function InvestmentsPage() {
  const investmentsQ = useInvestments()
  const { data: investments = [], isLoading } = investmentsQ

  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<InvTab>('portfolio')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const visibleInvestments = search.trim()
    ? investments.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()))
    : investments

  // Portfolio summary
  const totalCommitted  = investments.reduce((s, i) => s + (i.committed_amount ?? 0), 0)
  const totalReturned   = investments.reduce((s, i) => s + (i.total_returned ?? 0), 0)
  // Only sum investments where the user actually entered a market_value —
  // falling back to committed_amount made "Portfolio value" silently equal
  // "Total committed" whenever nobody had set a valuation, which read as a
  // contradiction next to a correctly negative ROI.
  const valuedInvestments = investments.filter((i) => i.market_value != null)
  const totalMarketValue = valuedInvestments.reduce((s, i) => s + (i.market_value ?? 0), 0)
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

      {investmentsQ.isError && <ErrorBanner onRetry={() => investmentsQ.refetch()} />}

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
            <div className="inv-sum-value">
              {valuedInvestments.length > 0 ? formatCurrency(totalMarketValue) : '—'}
            </div>
            <div className="inv-sum-sub">
              {valuedInvestments.length === 0
                ? 'No valuations entered yet'
                : valuedInvestments.length === investments.length
                  ? 'current value'
                  : `valued: ${valuedInvestments.length} of ${investments.length}`}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="inv-tabs" style={{ marginBottom: 0, flex: '1 1 auto' }}>
          <button className={`inv-tab ${activeTab === 'portfolio' ? 'inv-tab-active' : ''}`} onClick={() => setActiveTab('portfolio')}>
            💼 Portfolio
          </button>
          <button className={`inv-tab ${activeTab === 'logs' ? 'inv-tab-active' : ''}`} onClick={() => setActiveTab('logs')}>
            📋 Transaction logs
          </button>
        </div>
        {activeTab === 'portfolio' && (
          <SearchToggle value={search} onChange={setSearch} placeholder="Search investments…" />
        )}
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
      ) : activeTab === 'portfolio' && visibleInvestments.length === 0 ? (
        <motion.div className="inv-empty" variants={fadeUp} initial="initial" animate="animate">
          <div className="inv-empty-icon">🔍</div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600, fontSize: 16 }}>No matches</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            No investments match "{search}".
          </p>
        </motion.div>
      ) : activeTab === 'portfolio' ? (
        <motion.div className="inv-list" variants={staggerContainer} initial="initial" animate="animate">
          {visibleInvestments.map((inv) => {
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
                                ? 'linear-gradient(90deg,#4FA981,#3E9B72)'
                                : 'linear-gradient(90deg,#C9736E,#C25B55)',
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

                  {/* ROI + doc link */}
                  <div className="inv-card-right">
                    {roi !== undefined && (
                      <div className={`inv-roi ${roi >= 0 ? 'inv-roi-pos' : 'inv-roi-neg'}`}>
                        <span className="inv-roi-pct">{roi >= 0 ? '+' : ''}{roi.toFixed(1)}%</span>
                        <span className="inv-roi-label">ROI</span>
                      </div>
                    )}
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
              </motion.div>
            )
          })}
        </motion.div>
      ) : null}

      {/* Modal */}
      <AnimatePresence>
        {showForm && (
          <InvestmentForm
            editing={null}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

    </motion.div>
  )
}
