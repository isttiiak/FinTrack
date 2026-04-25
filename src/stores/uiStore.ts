import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  quickAddOpen: boolean
  editingTransactionId: string | null
  editingLedgerId: string | null
  toasts: Toast[]
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setQuickAddOpen: (open: boolean) => void
  setEditingTransaction: (id: string | null) => void
  setEditingLedger: (id: string | null) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
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
  sidebarOpen: true,
  quickAddOpen: false,
  editingTransactionId: null,
  editingLedgerId: null,
  toasts: [],

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setQuickAddOpen: (open) => set({ quickAddOpen: open }),
  setEditingTransaction: (id) => set({ editingTransactionId: id }),
  setEditingLedger: (id) => set({ editingLedgerId: id }),

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
