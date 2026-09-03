import type { PaymentMethod, Account, TxnType, RecurringCadence } from '@/lib/constants'
import type { Category } from '@/types/expense.types'

export interface RecurringRule {
  id: string
  user_id: string
  category_id: string | null
  type: TxnType
  amount: number
  description: string | null
  cadence: RecurringCadence
  start_date: string
  end_date: string | null
  payment_method: PaymentMethod | null
  account: Account | null
  is_active: boolean
  // Furthest date this rule has already generated a transaction for —
  // materialization resumes the day after this, not from start_date, so
  // re-running it on every app open doesn't re-create past occurrences.
  // NULL means never materialized yet.
  last_materialized_date: string | null
  created_at: string
  // joined
  category?: Category | null
}

export interface RecurringRuleFormData {
  type: TxnType
  amount: number
  category_id: string
  description?: string
  cadence: RecurringCadence
  start_date: string
  end_date?: string
  payment_method?: PaymentMethod
  account?: Account
}
