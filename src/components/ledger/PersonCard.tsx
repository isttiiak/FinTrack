import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { Edit2, Trash2, ChevronRight, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useDeletePerson } from '@/hooks/useLedger'
import { useUIStore } from '@/stores/uiStore'
import { useDemoStore } from '@/stores/demoStore'
import type { PersonWithLedgers, PersonLedger } from '@/types/ledger.types'

const RELATIONSHIP_COLORS: Record<string, string> = {
  Friend:           '#6C63FF',
  Family:           '#10B981',
  'Business Partner': '#F59E0B',
  Colleague:        '#06B6D4',
  Self:             '#A855F7',
  Other:            '#9D9AB8',
}

interface PersonCardProps {
  person: PersonWithLedgers
  onEdit: (person: PersonWithLedgers) => void
  onLogPayment?: (entry: PersonLedger) => void
}

export default function PersonCard({ person, onEdit, onLogPayment }: PersonCardProps) {
  const navigate = useNavigate()
  const { mutate: deletePerson } = useDeletePerson()
  const addToast = useUIStore((s) => s.addToast)
  const isDemo = useDemoStore((s) => s.isDemo)
  const [showActions, setShowActions] = useState(false)

  const hasOutstanding = person.total_outstanding_lent > 0 || person.total_outstanding_debt > 0
  const netPosition = person.total_outstanding_lent - person.total_outstanding_debt
  const relColor = RELATIONSHIP_COLORS[person.relationship ?? ''] ?? '#9D9AB8'

  function handleDelete() {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    deletePerson(person.id)
  }

  const allSettled = person.ledgers.length > 0
    && person.ledgers.every((l) => l.status === 'Settled')

  return (
    <motion.div
      className="pc-card"
      style={{ opacity: allSettled ? 0.6 : 1 }}
      whileHover={{ scale: 1.005 }}
      onHoverStart={() => setShowActions(true)}
      onHoverEnd={() => setShowActions(false)}
      layout
    >
      <button
        className="pc-main"
        onClick={() => navigate({ to: '/ledger/$personId', params: { personId: person.id } })}
      >
        {/* Avatar */}
        <div className="pc-avatar" style={{ background: `linear-gradient(135deg, ${relColor}33, ${relColor}55)`, color: relColor }}>
          {person.name[0]?.toUpperCase()}
        </div>

        {/* Info */}
        <div className="pc-info">
          <div className="pc-name-row">
            <span className="pc-name">{person.name}</span>
            {person.relationship && (
              <span className="pc-rel-badge" style={{ background: `${relColor}22`, color: relColor, borderColor: `${relColor}44` }}>
                {person.relationship}
              </span>
            )}
          </div>

          {person.ledgers.length === 0 ? (
            <span className="pc-no-entries">No entries yet</span>
          ) : (
            <div className="pc-amounts">
              {person.total_outstanding_lent > 0 && (
                <span className="pc-lent">+{formatCurrency(person.total_outstanding_lent)} they owe</span>
              )}
              {person.total_outstanding_debt > 0 && (
                <span className="pc-debt">−{formatCurrency(person.total_outstanding_debt)} you owe</span>
              )}
              {allSettled && <span className="pc-settled-label">All settled ✓</span>}
            </div>
          )}
        </div>

        {/* Net amount */}
        {hasOutstanding && (
          <div className={`pc-net ${netPosition >= 0 ? 'pc-net-positive' : 'pc-net-negative'}`}>
            <span className="pc-net-amount">{formatCurrency(Math.abs(netPosition))}</span>
            <span className="pc-net-dir">{netPosition >= 0 ? '↑ owed to you' : '↓ you owe'}</span>
          </div>
        )}

        <ChevronRight size={16} className="pc-chevron" />
      </button>

      {/* Hover actions */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            className="pc-actions"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.12 }}
          >
            {(() => {
              const pendingEntry = onLogPayment && person.ledgers.find((l) => l.status !== 'Settled')
              return pendingEntry ? (
                <button
                  className="pc-action-btn pc-pay"
                  onClick={(e) => { e.stopPropagation(); onLogPayment(pendingEntry) }}
                  data-tooltip={pendingEntry.ledger_type === 'Lent' ? 'Log repayment' : 'Log your payment'}
                >
                  <CreditCard size={14} />
                </button>
              ) : null
            })()}
            <button
              className="pc-action-btn pc-edit"
              onClick={(e) => { e.stopPropagation(); onEdit(person) }}
              data-tooltip="Edit person"
            >
              <Edit2 size={14} />
            </button>
            <button
              className="pc-action-btn pc-delete"
              onClick={(e) => { e.stopPropagation(); handleDelete() }}
              data-tooltip="Delete person"
            >
              <Trash2 size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .pc-card {
          position: relative;
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pc-card:hover { border-color: rgba(108,99,255,0.25); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
        .pc-main {
          display: flex; align-items: center; gap: 14px; padding: 16px;
          width: 100%; background: none; border: none; cursor: pointer; text-align: left;
        }
        .pc-avatar {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700;
        }
        .pc-info { flex: 1; min-width: 0; }
        .pc-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .pc-name { font-size: 15px; font-weight: 600; color: var(--text-primary); }
        .pc-rel-badge {
          font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; border: 1px solid;
          white-space: nowrap;
        }
        .pc-amounts { display: flex; gap: 10px; flex-wrap: wrap; }
        .pc-lent { font-size: 12px; color: var(--accent-teal); font-weight: 500; }
        .pc-debt { font-size: 12px; color: var(--accent-coral); font-weight: 500; }
        .pc-no-entries { font-size: 12px; color: var(--text-muted); }
        .pc-settled-label { font-size: 12px; color: var(--accent-teal); }
        .pc-net { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
        .pc-net-amount { font-size: 16px; font-weight: 700; }
        .pc-net-positive .pc-net-amount { color: var(--accent-teal); }
        .pc-net-negative .pc-net-amount { color: var(--accent-coral); }
        .pc-net-dir { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
        .pc-chevron { color: var(--text-muted); margin-left: 4px; flex-shrink: 0; }
        .pc-actions {
          position: absolute; right: 56px; top: 50%; transform: translateY(-50%);
          display: flex; gap: 6px; z-index: 2;
        }
        .pc-action-btn {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--border); cursor: pointer; backdrop-filter: blur(8px);
          background: var(--bg-elevated); transition: background 0.12s, color 0.12s;
        }
        .pc-pay { color: var(--accent-teal); }
        .pc-pay:hover { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); }
        .pc-edit { color: var(--text-secondary); }
        .pc-edit:hover { background: rgba(108,99,255,0.15); color: var(--accent-primary); border-color: rgba(108,99,255,0.3); }
        .pc-delete { color: var(--text-muted); }
        .pc-delete:hover { background: rgba(239,68,68,0.12); color: var(--accent-red); border-color: rgba(239,68,68,0.3); }
      `}</style>
    </motion.div>
  )
}
