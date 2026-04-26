import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, TrendingUp, TrendingDown, ArrowRightLeft, UserPlus } from 'lucide-react'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { formatCurrency } from '@/lib/utils'
import { usePersons } from '@/hooks/useLedger'
import { useDemoStore } from '@/stores/demoStore'
import { useUIStore } from '@/stores/uiStore'
import PersonCard from '@/components/ledger/PersonCard'
import PersonForm from '@/components/ledger/PersonForm'
import PaymentForm from '@/components/ledger/PaymentForm'
import QuickLedgerEntry from '@/components/ledger/QuickLedgerEntry'
import LedgerPaymentLogs from '@/components/ledger/LedgerPaymentLogs'
import LedgerSummaryTab from '@/components/ledger/LedgerSummaryTab'
import type { PersonWithLedgers, PersonLedger } from '@/types/ledger.types'

type Tab = 'lent' | 'debt' | 'all' | 'logs' | 'summary'

export default function LedgerPage() {
  const { data: persons = [], isLoading } = usePersons()
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)

  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [editingPerson, setEditingPerson] = useState<PersonWithLedgers | null>(null)
  const [quickPayEntry, setQuickPayEntry] = useState<PersonLedger | null>(null)

  // Aggregate totals
  const totalOutstandingLent = persons.reduce((s, p) => s + p.total_outstanding_lent, 0)
  const totalOutstandingDebt = persons.reduce((s, p) => s + p.total_outstanding_debt, 0)
  const netPosition = totalOutstandingLent - totalOutstandingDebt

  // Filter by tab — "lent" = persons who owe me, "debt" = persons I owe
  const filtered = persons.filter((p) => {
    if (activeTab === 'lent') return p.total_outstanding_lent > 0 || p.ledgers.some((l) => l.ledger_type === 'Lent')
    if (activeTab === 'debt') return p.total_outstanding_debt > 0 || p.ledgers.some((l) => l.ledger_type === 'Debt')
    return true
  })

  function handleAddEntry() {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    setShowAddEntry(true)
  }

  function handleAddPerson() {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    setShowAddPerson(true)
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
            onClick={handleAddPerson}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            title="Add person without an entry"
          >
            <UserPlus size={15} /> Person
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
            <div className="ledger-sum-label">They owe you</div>
            <div className="ledger-sum-value">{formatCurrency(totalOutstandingLent)}</div>
          </motion.div>
          <motion.div className="ledger-sum-card ledger-sum-debt" variants={staggerItem}>
            <div className="ledger-sum-icon"><TrendingDown size={18} /></div>
            <div className="ledger-sum-label">You owe them</div>
            <div className="ledger-sum-value">{formatCurrency(totalOutstandingDebt)}</div>
          </motion.div>
          <motion.div className={`ledger-sum-card ${netPosition >= 0 ? 'ledger-sum-net-positive' : 'ledger-sum-net-negative'}`} variants={staggerItem}>
            <div className="ledger-sum-icon"><ArrowRightLeft size={18} /></div>
            <div className="ledger-sum-label">Net position</div>
            <div className="ledger-sum-value">{netPosition >= 0 ? '+' : '−'}{formatCurrency(Math.abs(netPosition))}</div>
          </motion.div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="ledger-tabs">
        {([['all', 'All'], ['lent', '💸 They owe me'], ['debt', '🏦 I owe them'], ['summary', '📊 Summary'], ['logs', '💳 Payment logs']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            className={`ledger-tab ${activeTab === t ? 'ledger-tab-active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {label}
          </button>
        ))}
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
                onEdit={(p) => setEditingPerson(p)}
                onLogPayment={(entry) => setQuickPayEntry(entry)}
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
        {(showAddPerson || editingPerson) && (
          <PersonForm
            editing={editingPerson}
            onClose={() => { setShowAddPerson(false); setEditingPerson(null) }}
          />
        )}
        {quickPayEntry && (
          <PaymentForm
            entry={quickPayEntry}
            onClose={() => setQuickPayEntry(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        .ledger-page { max-width: 900px; }
        .ledger-header-row { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .page-title { font-size: 28px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); margin: 0; }

        .ledger-summary-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;
        }
        @media (max-width: 640px) { .ledger-summary-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 400px) { .ledger-summary-grid { grid-template-columns: 1fr; gap: 8px; } }

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

        .ledger-sum-net-positive { background: rgba(16,185,129,0.04); border-color: rgba(16,185,129,0.12); }
        .ledger-sum-net-positive .ledger-sum-icon { background: rgba(16,185,129,0.12); color: var(--accent-teal); }
        .ledger-sum-net-positive .ledger-sum-value { color: var(--accent-teal); }
        .ledger-sum-net-negative { background: rgba(239,68,68,0.04); border-color: rgba(239,68,68,0.12); }
        .ledger-sum-net-negative .ledger-sum-icon { background: rgba(239,68,68,0.12); color: var(--accent-red); }
        .ledger-sum-net-negative .ledger-sum-value { color: var(--accent-red); }

        .ledger-tabs { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
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
