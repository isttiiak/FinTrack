import { create } from 'zustand'
import { getCalculatorPosition, setCalculatorPosition as persistCalculatorPosition } from '@/lib/calculatorPrefs'

interface UIState {
  sidebarOpen: boolean
  quickAddOpen: boolean
  editingTransactionId: string | null
  editingLedgerId: string | null
  toasts: Toast[]
  calculatorOpen: boolean
  calculatorPosition: { x: number; y: number }
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setQuickAddOpen: (open: boolean) => void
  setEditingTransaction: (id: string | null) => void
  setEditingLedger: (id: string | null) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setCalculatorOpen: (open: boolean) => void
  setCalculatorPosition: (pos: { x: number; y: number }) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

let toastCounter = 0

export const useUIStore = create<UIState>((set) => ({
  // false: only gates the mobile drawer transform (see Sidebar.tsx's
  // @media max-width:768px block) — desktop's sidebar is unconditionally
  // visible regardless of this flag, so this has no effect there. Starting
  // true made the mobile drawer render open-over-content on every fresh
  // page load until the user tapped a nav link.
  sidebarOpen: false,
  quickAddOpen: false,
  editingTransactionId: null,
  editingLedgerId: null,
  toasts: [],
  calculatorOpen: false,
  calculatorPosition: getCalculatorPosition() ?? { x: 0, y: 0 },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  setEditingTransaction: (id) => set({ editingTransactionId: id }),
  setEditingLedger: (id) => set({ editingLedgerId: id }),
  setCalculatorOpen: (open) => set({ calculatorOpen: open }),
  setCalculatorPosition: (pos) => {
    persistCalculatorPosition(pos)
    set({ calculatorPosition: pos })
  },

  addToast: (toast) => {
    const id = String(++toastCounter)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
