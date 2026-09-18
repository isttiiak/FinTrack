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
import './PersonCard.css'

// Literal hex (not CSS vars) — these get a hex-alpha suffix appended below
// (e.g. `${relColor}33`), which only works with plain hex strings.
const RELATIONSHIP_COLORS: Record<string, string> = {
  Friend:           '#4FA981',
  Family:           '#3E9B72',
  'Business Partner': '#C2A24E',
  Colleague:        '#B4923F',
  Self:             '#8A968C',
  Other:            '#5F6B62',
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
  const relColor = RELATIONSHIP_COLORS[person.relationship ?? ''] ?? '#8A968C'

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
          <div className="personcard-pc-actions">
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

    </motion.div>
  )
}
