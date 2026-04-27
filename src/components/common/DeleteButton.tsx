import { Trash2 } from 'lucide-react'
import { useConfirmStore } from '@/stores/confirmStore'

interface DeleteButtonProps {
  onConfirm: () => void
  /** Short description shown in the dialog, e.g. "This will remove the entry permanently." */
  description?: string
  /** Highlighted item name shown in the dialog, e.g. "John's lent entry — ৳500" */
  itemName?: string
  /** Extra CSS class on the trigger button */
  className?: string
  iconSize?: number
}

export default function DeleteButton({
  onConfirm,
  description = 'This entry will be permanently removed.',
  itemName,
  className = '',
  iconSize = 13,
}: DeleteButtonProps) {
  const confirm = useConfirmStore((s) => s.confirm)

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirm({
      title: 'Delete this entry?',
      description,
      itemName,
    })
    if (ok) onConfirm()
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
      onClick={handleClick}
    >
      <Trash2 size={iconSize} />
    </button>
  )
}
