import type { PaymentMethod, Account, TxnType } from '@/lib/constants'

export interface Category {
  id: string
  user_id: string
  name: string
  main_group: string
  type: TxnType
  color_hex: string | null
  is_default: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  txn_date: string
  type: TxnType
  amount: number
  description: string | null
  payment_method: PaymentMethod | null
  account: Account | null
  created_at: string
  // joined
  category?: Category | null
}

export interface BudgetLimit {
  id: string
  user_id: string
  category_id: string
  monthly_limit: number
  // Carry last month's unspent amount forward (017_budget_rollover.sql).
  // Absent on databases that haven't run 017 — treated as off.
  rollover?: boolean
  created_at: string
  // joined
  category?: Category | null
  // computed by useBudgets(month) — limit for the month being viewed
  carryover?: number
  effective_limit?: number
}

export interface TransactionFormData {
  amount: number
  category_id: string
  description?: string
  txn_date: string
  type: TxnType
  payment_method?: PaymentMethod
  account?: Account
}

export interface TransactionFilters {
  // Tri-state date bounds: omitted (undefined) = default to the current month;
  // null = deliberately unbounded on that side; string = that bound.
  from?: string | null
  to?: string | null
  category_ids?: string[]
  type?: TxnType | 'All'
  payment_method?: PaymentMethod | 'All'
  min_amount?: number   // inclusive bounds on amount
  max_amount?: number
  search?: string   // free-text match against description
}
