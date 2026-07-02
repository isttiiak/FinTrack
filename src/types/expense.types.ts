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
  // Set only when entered in a non-default currency — `amount` above is
  // always already converted to the user's default currency.
  original_amount: number | null
  original_currency: string | null
  // joined
  category?: Category | null
}

export interface BudgetLimit {
  id: string
  user_id: string
  category_id: string
  monthly_limit: number
  created_at: string
  // joined
  category?: Category | null
}

export interface TransactionFormData {
  amount: number
  category_id: string
  description?: string
  txn_date: string
  type: TxnType
  payment_method?: PaymentMethod
  account?: Account
  original_amount?: number | null
  original_currency?: string | null
}

export interface TransactionFilters {
  from?: string
  to?: string
  category_ids?: string[]
  type?: TxnType | 'All'
  payment_method?: PaymentMethod | 'All'
}
