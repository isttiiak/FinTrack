import { motion } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, CreditCard, HandCoins } from 'lucide-react'
import DeleteButton from '@/components/common/DeleteButton'
import { formatCurrency } from '@/lib/utils'
import { useDeletePerson } from '@/hooks/useLedger'
import { useUIStore } from '@/stores/uiStore'
import { useDemoStore } from '@/stores/demoStore'
import type { PersonWithLedgers } from '@/types/ledger.types'
import type { LedgerType } from '@/lib/constants'

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
  onLogPayment?: (personId: string, personName: string, ledgerType: LedgerType, remaining: number) => void
}

export default function PersonCard({ person, onLogPayment }: PersonCardProps) {
  const navigate = useNavigate()
  const { mutate: deletePerson } = useDeletePerson()
  const addToast = useUIStore((s) => s.addToast)
  const isDemo = useDemoStore((s) => s.isDemo)

  const hasOutstanding = person.total_outstanding_lent > 0 || person.total_outstanding_debt > 0
  const netPosition = person.total_outstanding_lent - person.total_outstanding_debt
  const relColor = RELATIONSHIP_COLORS[person.relationship ?? ''] ?? '#9D9AB8'

  function handleDelete() {
    if (isDemo) { addToast({ type: 'info', message: 'Demo mode — changes are not saved' }); return }
    deletePerson(person.id)
  }

  const allSettled = person.ledgers.length > 0
    && person.total_outstanding_lent === 0
    && person.total_outstanding_debt === 0

  return (
    <motion.div
      className="pc-card"
      style={{ opacity: allSettled ? 0.6 : 1 }}
      whileHover={{ scale: 1.005 }}
      layout
    >
      <div className="pc-inner">
        {/* Clickable left portion — navigates to detail */}
        <button
          className="pc-main"
          onClick={() => navigate({ to: '/ledger/$personId', params: { personId: person.id } })}
        >
          <div className="pc-avatar" style={{ background: `linear-gradient(135deg, ${relColor}33, ${relColor}55)`, color: relColor }}>
            {person.name[0]?.toUpperCase()}
          </div>
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
                {person.overpaid_lent > 0 && (
                  <span className="pc-overpaid">Overpaid by {formatCurrency(person.overpaid_lent)}</span>
                )}
                {person.overpaid_debt > 0 && (
                  <span className="pc-overpaid">Overpaid by {formatCurrency(person.overpaid_debt)}</span>
                )}
                {allSettled && <span className="pc-settled-label">All settled ✓</span>}
              </div>
            )}
          </div>
        </button>

        {/* Right side: net amount + fixed actions */}
        <div className="pc-right">
          {hasOutstanding && (
            <div className={`pc-net ${netPosition >= 0 ? 'pc-net-positive' : 'pc-net-negative'}`}>
              <span className="pc-net-amount">{formatCurrency(Math.abs(netPosition))}</span>
              <span className="pc-net-dir">{netPosition >= 0 ? '↑ owed to you' : '↓ you owe'}</span>
            </div>
          )}
          <div className="pc-actions">
            {onLogPayment && person.total_outstanding_lent > 0 && (
              <button
                className="pc-action-btn pc-collect"
                onClick={() => onLogPayment(person.id, person.name, 'Lent', person.total_outstanding_lent)}
              >
                <HandCoins size={13} /> Collect
              </button>
            )}
            {onLogPayment && person.total_outstanding_debt > 0 && (
              <button
                className="pc-action-btn pc-pay"
                onClick={() => onLogPayment(person.id, person.name, 'Debt', person.total_outstanding_debt)}
              >
                <CreditCard size={13} /> Pay
              </button>
            )}
            <DeleteButton onConfirm={handleDelete} iconSize={14} />
          </div>
        </div>

        <ChevronRight size={16} className="pc-chevron"
          onClick={() => navigate({ to: '/ledger/$personId', params: { personId: person.id } })}
        />
      </div>

      <style>{`
        .pc-card {
          background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pc-card:hover { border-color: rgba(108,99,255,0.25); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
        .pc-inner { display: flex; align-items: center; gap: 0; }
        .pc-main {
          display: flex; align-items: center; gap: 14px; padding: 14px 12px 14px 16px;
          flex: 1; min-width: 0; background: none; border: none; cursor: pointer; text-align: left;
        }
        .pc-right {
          display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
          padding: 12px 8px 12px 0; flex-shrink: 0;
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
        .pc-overpaid { font-size: 12px; color: var(--accent-amber); font-weight: 500; }
        .pc-no-entries { font-size: 12px; color: var(--text-muted); }
        .pc-settled-label { font-size: 12px; color: var(--accent-teal); }
        .pc-net { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
        .pc-net-amount { font-size: 16px; font-weight: 700; }
        .pc-net-positive .pc-net-amount { color: var(--accent-teal); }
        .pc-net-negative .pc-net-amount { color: var(--accent-coral); }
        .pc-net-dir { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
        .pc-chevron { color: var(--text-muted); margin-left: 4px; flex-shrink: 0; }
        .pc-actions { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
        .pc-chevron { color: var(--text-muted); margin: 0 10px 0 4px; flex-shrink: 0; cursor: pointer; }
        .pc-action-btn {
          height: 30px; padding: 0 10px; border-radius: 8px; gap: 5px;
          display: flex; align-items: center; font-size: 12px; font-weight: 600;
          border: 1px solid var(--border); cursor: pointer; backdrop-filter: blur(8px);
          background: var(--bg-elevated); transition: background 0.12s, color 0.12s; white-space: nowrap;
        }
        .pc-collect { color: var(--accent-teal); }
        .pc-collect:hover { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); }
        .pc-pay { color: var(--accent-coral); }
        .pc-pay:hover { background: rgba(249,115,22,0.12); border-color: rgba(249,115,22,0.3); }
        .pc-delete { color: var(--text-muted); padding: 0 8px; }
        .pc-delete:hover { background: rgba(239,68,68,0.12); color: var(--accent-red); border-color: rgba(239,68,68,0.3); }
      `}</style>
    </motion.div>
  )
}
