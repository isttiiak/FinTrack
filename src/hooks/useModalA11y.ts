import { useEffect, useRef } from 'react'

const modalStack: Array<() => void> = []

/** Locks body scroll while open and closes only the topmost modal on Escape. */
export function useModalA11y(onClose: () => void, open = true) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return

    const closeHandler = () => closeRef.current()
    modalStack.push(closeHandler)
    if (modalStack.length === 1) {
      document.body.style.overflow = 'hidden'
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (modalStack[modalStack.length - 1] !== closeHandler) return
      e.stopPropagation()
      closeHandler()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      const idx = modalStack.lastIndexOf(closeHandler)
      if (idx !== -1) modalStack.splice(idx, 1)
      if (modalStack.length === 0) {
        document.body.style.overflow = ''
      }
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])
}
