import type { LedgerStatus } from '@/lib/constants'

interface StatusBadgeProps {
  status: LedgerStatus
  size?: 'sm' | 'md'
}

const STATUS_CONFIG: Record<LedgerStatus, { label: string; bg: string; color: string }> = {
  Pending:  { label: '⏳ Pending',  bg: 'rgba(201, 115, 110,0.12)',  color: '#FB923C' },
  Partial:  { label: '🔄 Partial',  bg: 'rgba(79, 169, 129,0.12)', color: '#818CF8' },
  Settled:  { label: '✅ Settled',  bg: 'rgba(79, 169, 129,0.12)', color: '#34D399' },
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  const padding = size === 'sm' ? '2px 8px' : '4px 10px'
  const fontSize = size === 'sm' ? '11px' : '12px'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding,
      background: cfg.bg,
      color: cfg.color,
      borderRadius: 20,
      fontSize,
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}
