// "Saved — Undo" toasts for more than deletes (TODO.md §5.7). The undo
// writes straight to the database rather than going back through a mutation
// hook, so undoing never raises a second "saved" toast with its own Undo.
import type { Toast } from '@/stores/uiStore'

type AddToast = (toast: Omit<Toast, 'id'>) => void

export const UNDO_TOAST_MS = 6000

export function toastWithUndo(
  addToast: AddToast,
  message: string,
  undo: () => Promise<void>,
  undoneMessage = 'Undone',
) {
  addToast({
    type: 'success',
    message,
    duration: UNDO_TOAST_MS,
    action: {
      label: 'Undo',
      onClick: () => {
        undo()
          .then(() => addToast({ type: 'info', message: undoneMessage }))
          .catch((err: Error) => addToast({ type: 'error', message: `Couldn't undo: ${err.message}` }))
      },
    },
  })
}
