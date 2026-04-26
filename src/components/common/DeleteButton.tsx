import { useState } from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteButtonProps {
  onConfirm: () => void
  /** Extra CSS class forwarded to the trigger button */
  className?: string
  iconSize?: number
}

export default function DeleteButton({ onConfirm, className = '', iconSize = 13 }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--accent-red)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          Sure?
        </span>
        <button
          type="button"
          style={{
            padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            color: 'var(--accent-red)', transition: 'background 0.1s', whiteSpace: 'nowrap',
          }}
          onClick={(e) => { e.stopPropagation(); onConfirm(); setConfirming(false) }}
        >
          Yes
        </button>
        <button
          type="button"
          style={{
            padding: '2px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', whiteSpace: 'nowrap',
          }}
          onClick={(e) => { e.stopPropagation(); setConfirming(false) }}
        >
          No
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      className={className}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', color: 'var(--text-muted)',
        cursor: 'pointer', padding: 0,
      }}
      onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
    >
      <Trash2 size={iconSize} />
    </button>
  )
}
