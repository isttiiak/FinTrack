import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, TrendingUp, TrendingDown, ArrowRightLeft, ArrowUp, ArrowDown } from 'lucide-react'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency } from '@/lib/utils'
import { usePersons } from '@/hooks/useLedger'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import PersonCard from '@/components/ledger/PersonCard'
import PaymentForm from '@/components/ledger/PaymentForm'
import QuickLedgerEntry from '@/components/ledger/QuickLedgerEntry'
import LedgerPaymentLogs from '@/components/ledger/LedgerPaymentLogs'
import LedgerSummaryTab from '@/components/ledger/LedgerSummaryTab'
import type { LedgerType } from '@/lib/constants'

type Tab = 'lent' | 'debt' | 'all' | 'logs' | 'summary'

export default function LedgerPage() {
  const navigate = useNavigate()
  const { data: persons = [], isLoading } = usePersons()
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)

  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [quickPay, setQuickPay] = useState<{ personId: string; personName: string; ledgerType: LedgerType; remaining: number } | null>(null)

  // Aggregate totals
  const totalOutstandingLent = persons.reduce((s, p) => s + p.total_outstanding_lent, 0)
  const totalOutstandingDebt = persons.reduce((s, p) => s + p.total_outstanding_debt, 0)
  const netPosition = totalOutstandingLent - totalOutstandingDebt

  // Filter by tab
  const filtered = persons
    .filter((p) => {
      if (activeTab === 'lent') return p.total_outstanding_lent > 0 || p.ledgers.some((l) => l.ledger_type === 'Lent')
      if (activeTab === 'debt') return p.total_outstanding_debt > 0 || p.ledgers.some((l) => l.ledger_type === 'Debt')
      return true
    })
    .slice()
    .sort((a, b) => {
      const latestDate = (p: typeof a) =>
        p.ledgers.reduce((max, l) => l.start_date > max ? l.start_date : max, '0000-00-00')
      const da = latestDate(a), db = latestDate(b)
      return sortOrder === 'newest' ? db.localeCompare(da) : da.localeCompare(db)
    })

  function handleAddEntry() {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    setShowAddEntry(true)
  }

  function handleOpenPeoplePanel() {
    navigate({ to: '/ledger/people' })
  }

  return (
    <motion.div variants={fadeUp} initial="initial" animate="animate" className="ledger-page">
      {/* Header */}
      <div className="ledger-header-row">
        <div>
          <h1 className="page-title">Lent &amp; Debt</h1>
          <p className="page-subtitle">Track money you've lent and owe</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            onClick={handleOpenPeoplePanel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Users size={15} /> People
          </motion.button>
          <motion.button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={handleAddEntry}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus size={16} /> Add entry
          </motion.button>
        </div>
      </div>

      {/* Summary cards */}
      {persons.length > 0 && (
        <motion.div className="ledger-summary-grid" variants={staggerContainer} initial="initial" animate="animate">
          <motion.div className="ledger-sum-card ledger-sum-lent" variants={staggerItem}>
            <div className="ledger-sum-icon"><TrendingUp size={18} /></div>
            <div className="ledger-sum-label">Total lent out</div>
            <div className="ledger-sum-value">{formatCurrency(totalOutstandingLent)}</div>
          </motion.div>
          <motion.div className="ledger-sum-card ledger-sum-debt" variants={staggerItem}>
            <div className="ledger-sum-icon"><TrendingDown size={18} /></div>
            <div className="ledger-sum-label">Total borrowed</div>
            <div className="ledger-sum-value">{formatCurrency(totalOutstandingDebt)}</div>
            <div className={`ledger-sum-net-inline ${netPosition >= 0 ? 'ledger-net-positive' : 'ledger-net-negative'}`}>
              <ArrowRightLeft size={11} /> Net: {netPosition >= 0 ? '+' : '−'}{formatCurrency(Math.abs(netPosition))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Tabs + sort controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="ledger-tabs" style={{ marginBottom: 0, flex: 1 }}>
          {([['all', 'All'], ['lent', '💸 Lent'], ['debt', '🏦 Debt'], ['summary', '📊 Summary'], ['logs', '💳 Payment logs']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              className={`ledger-tab ${activeTab === t ? 'ledger-tab-active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab !== 'summary' && activeTab !== 'logs' && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              className={`ledger-sort-btn ${sortOrder === 'newest' ? 'ledger-sort-active' : ''}`}
              onClick={() => setSortOrder('newest')}
              title="Newest first"
            >
              <ArrowDown size={13} /> Newest
            </button>
            <button
              className={`ledger-sort-btn ${sortOrder === 'oldest' ? 'ledger-sort-active' : ''}`}
              onClick={() => setSortOrder('oldest')}
              title="Oldest first"
            >
              <ArrowUp size={13} /> Oldest
            </button>
          </div>
        )}
      </div>

      {/* Summary tab */}
      {activeTab === 'summary' && <LedgerSummaryTab persons={persons} />}

      {/* Payment logs tab */}
      {activeTab === 'logs' && (
        <LedgerPaymentLogs persons={persons} />
      )}

      {activeTab !== 'logs' && activeTab !== 'summary' && isLoading ? (
        <div className="ledger-skeletons">
          {[1, 2, 3].map((i) => <div key={i} className="ledger-skeleton" />)}
        </div>
      ) : activeTab !== 'logs' && activeTab !== 'summary' && filtered.length === 0 ? (
        <motion.div className="ledger-empty" variants={fadeUp} initial="initial" animate="animate">
          <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontWeight: 600 }}>
            {persons.length === 0 ? 'No entries yet' : 'No entries in this category'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {persons.length === 0
              ? 'Click "Add person" to start tracking lent money and debts.'
              : 'Switch tabs to see other entries.'}
          </p>
          {persons.length === 0 && (
            <motion.button
              className="btn-primary"
              style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
              onClick={handleAddEntry}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <Plus size={15} /> Add first entry
            </motion.button>
          )}
        </motion.div>
      ) : activeTab !== 'logs' && activeTab !== 'summary' ? (
        <motion.div
          className="ledger-list"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {filtered.map((person) => (
            <motion.div key={person.id} variants={staggerItem} layout>
              <PersonCard
                person={person}
                onLogPayment={(personId, personName, ledgerType, remaining) =>
                  setQuickPay({ personId, personName, ledgerType, remaining })}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : null}

      {/* Modals */}
      <AnimatePresence>
        {showAddEntry && (
          <QuickLedgerEntry onClose={() => setShowAddEntry(false)} />
        )}
        {quickPay && (
          <PaymentForm
            personId={quickPay.personId}
            personName={quickPay.personName}
            ledgerType={quickPay.ledgerType}
            remaining={quickPay.remaining}
            onClose={() => setQuickPay(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .ledger-page { max-width: 900px; }
        .ledger-header-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

        .ledger-summary-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;
        }
        @media (max-width: 480px) { .ledger-summary-grid { grid-template-columns: 1fr; gap: 8px; } }

        .ledger-sum-card {
          border-radius: 14px; padding: 16px; border: 1px solid var(--border);
          display: flex; flex-direction: column; gap: 6px;
        }
        .ledger-sum-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 2px; }
        .ledger-sum-label { font-size: 11px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        .ledger-sum-value { font-size: 22px; font-weight: 700; }

        .ledger-sum-lent { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.15); }
        .ledger-sum-lent .ledger-sum-icon { background: rgba(16,185,129,0.15); color: var(--accent-teal); }
        .ledger-sum-lent .ledger-sum-value { color: var(--accent-teal); }

        .ledger-sum-debt { background: rgba(249,115,22,0.06); border-color: rgba(249,115,22,0.15); }
        .ledger-sum-debt .ledger-sum-icon { background: rgba(249,115,22,0.15); color: var(--accent-coral); }
        .ledger-sum-debt .ledger-sum-value { color: var(--accent-coral); }

        .ledger-sum-net-inline { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; margin-top: 2px; }
        .ledger-net-positive { color: var(--accent-teal); }
        .ledger-net-negative { color: var(--accent-red); }

        .ledger-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .ledger-sort-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted);
          transition: all 0.15s; white-space: nowrap;
        }
        .ledger-sort-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
        .ledger-sort-active { color: var(--accent-primary) !important; border-color: rgba(108,99,255,0.35) !important; background: rgba(108,99,255,0.08) !important; }
        @media (max-width: 400px) { .ledger-tab { font-size: 12px; padding: 6px 10px; } }
        .ledger-tab {
          padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; cursor: pointer;
          background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary);
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .ledger-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
        .ledger-tab-active {
          background: linear-gradient(135deg, #6C63FF, #A855F7);
          border-color: transparent; color: #fff;
        }

        .ledger-list { display: flex; flex-direction: column; gap: 10px; }
        .ledger-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; text-align: center; }
        .ledger-skeletons { display: flex; flex-direction: column; gap: 10px; }
        .ledger-skeleton {
          height: 74px; border-radius: 14px;
          background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-elevated) 50%, var(--bg-card) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer { to { background-position: -200% 0; } }
      `}</style>
    </motion.div>
  )
}
