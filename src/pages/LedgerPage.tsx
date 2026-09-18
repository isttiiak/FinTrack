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
import ErrorBanner from '@/components/common/ErrorBanner'
import SearchToggle from '@/components/common/SearchToggle'
import type { LedgerType } from '@/lib/constants'
import './LedgerPage.css'

type Tab = 'lent' | 'debt' | 'all' | 'logs' | 'summary'

export default function LedgerPage() {
  const navigate = useNavigate()
  const personsQ = usePersons()
  const { data: persons = [], isLoading } = personsQ
  const isDemo = useDemoStore((s) => s.isDemo)
  const addToast = useUIStore((s) => s.addToast)

  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [search, setSearch] = useState('')
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [quickPay, setQuickPay] = useState<{ personId: string; personName: string; ledgerType: LedgerType; remaining: number } | null>(null)

  // Aggregate totals
  const totalOutstandingLent = persons.reduce((s, p) => s + p.total_outstanding_lent, 0)
  const totalOutstandingDebt = persons.reduce((s, p) => s + p.total_outstanding_debt, 0)
  const netPosition = totalOutstandingLent - totalOutstandingDebt
  const lentPersonCount = persons.filter((p) => p.total_outstanding_lent > 0).length
  const debtPersonCount = persons.filter((p) => p.total_outstanding_debt > 0).length

  // Filter by tab
  const filtered = persons
    .filter((p) => {
      if (activeTab === 'lent') return p.total_outstanding_lent > 0 || p.ledgers.some((l) => l.ledger_type === 'Lent')
      if (activeTab === 'debt') return p.total_outstanding_debt > 0 || p.ledgers.some((l) => l.ledger_type === 'Debt')
      return true
    })
    .filter((p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()))
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

      {personsQ.isError && <ErrorBanner onRetry={() => personsQ.refetch()} />}

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
          <motion.div className="ledger-sum-card ledger-sum-people" variants={staggerItem}>
            <div className="ledger-sum-people-row">
              <div className="ledger-sum-icon ledger-sum-icon-sm"><TrendingUp size={14} /></div>
              <div>
                <div className="ledger-sum-people-value">{lentPersonCount}</div>
                <div className="ledger-sum-people-label">{lentPersonCount === 1 ? 'person owes' : 'people owe'} you</div>
              </div>
            </div>
            <div className="ledger-sum-people-divider" />
            <div className="ledger-sum-people-row">
              <div className="ledger-sum-icon ledger-sum-icon-sm ledger-sum-icon-coral"><TrendingDown size={14} /></div>
              <div>
                <div className="ledger-sum-people-value">{debtPersonCount}</div>
                <div className="ledger-sum-people-label">you owe {debtPersonCount === 1 ? 'person' : 'people'}</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Tabs + sort controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="ledgerpage-ledger-tabs" style={{ marginBottom: 0, flex: '1 1 240px', minWidth: 0 }}>
          {([['all', 'All'], ['lent', '💸 Lent'], ['debt', '🏦 Debt'], ['summary', '📊 Summary'], ['logs', '💳 Payment logs']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              className={`ledgerpage-ledger-tab ${activeTab === t ? 'ledger-tab-active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab !== 'summary' && activeTab !== 'logs' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
            <SearchToggle value={search} onChange={setSearch} placeholder="Search people…" />
            <div style={{ display: 'flex', gap: 4 }}>
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

    </motion.div>
  )
}
