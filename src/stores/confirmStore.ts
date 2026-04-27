import { create } from 'zustand'

interface ConfirmConfig {
  title: string
  description: string
  itemName?: string    // e.g. "John's lent entry of ৳500"
  confirmLabel?: string
}

interface ConfirmState {
  open: boolean
  step: 1 | 2
  config: ConfirmConfig | null
  _resolve: ((ok: boolean) => void) | null

  confirm: (config: ConfirmConfig) => Promise<boolean>
  next: () => void       // step 1 → step 2
  accept: () => void     // step 2 confirmed → resolve(true)
  cancel: () => void     // any cancel → resolve(false)
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  step: 1,
  config: null,
  _resolve: null,

  confirm: (config) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, step: 1, config, _resolve: resolve })
    }),

  next: () => set({ step: 2 }),

  accept: () => {
    const resolve = get()._resolve
    set({ open: false, step: 1, config: null, _resolve: null })
    resolve?.(true)
  },

  cancel: () => {
    const resolve = get()._resolve
    set({ open: false, step: 1, config: null, _resolve: null })
    resolve?.(false)
  },
}))
