import type { PaymentMethod, Account, Relationship, LedgerType, LedgerStatus } from '@/lib/constants'

export interface Person {
  id: string
  user_id: string
  name: string
  relationship: Relationship | null
  phone: string | null
  notes: string | null
  created_at: string
}

export interface PersonLedger {
  id: string
  user_id: string
  person_id: string
  ledger_type: LedgerType
  total_amount: number
  start_date: string
  reason: string | null
  payment_method: PaymentMethod | null
  account: Account | null
  settled_date: string | null
  doc_link: string | null
  notes: string | null
  created_at: string
  // joined
  person?: Person
  payments?: LedgerPayment[]
  // computed
  paid_amount?: number
  remaining?: number
  status?: LedgerStatus
}

export interface LedgerPayment {
  id: string
  ledger_id: string
  user_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod | null
  account: Account | null
  notes: string | null
  created_at: string
}

export interface PersonWithLedgers extends Person {
  ledgers: PersonLedger[]
  total_lent: number
  total_debt: number
  total_outstanding_lent: number
  total_outstanding_debt: number
}

export interface LedgerFormData {
  person_id: string
  ledger_type: LedgerType
  total_amount: number
  start_date: string
  reason?: string
  payment_method?: PaymentMethod
  account?: Account
  doc_link?: string
  notes?: string
}

export interface PaymentFormData {
  ledger_id: string
  amount: number
  payment_date: string
  payment_method?: PaymentMethod
  account?: Account
  notes?: string
}
