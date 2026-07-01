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
  settled_date: string | null   // optional, user-set only — not used in any computed status
  doc_link: string | null
  notes: string | null
  created_at: string
  // joined
  person?: Person
}

export interface LedgerPayment {
  id: string
  person_id: string
  ledger_type: LedgerType
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
  payments: LedgerPayment[]
  total_lent: number
  total_debt: number
  total_outstanding_lent: number
  total_outstanding_debt: number
  lent_count: number
  debt_count: number
  lent_status: LedgerStatus | null
  debt_status: LedgerStatus | null
  overpaid_lent: number
  overpaid_debt: number
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
  person_id: string
  ledger_type: LedgerType
  amount: number
  payment_date: string
  payment_method?: PaymentMethod
  account?: Account
  notes?: string
}
