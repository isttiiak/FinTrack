import { create } from 'zustand'
import type { Transaction, Category } from '@/types/expense.types'
import type { Person, PersonLedger, LedgerPayment } from '@/types/ledger.types'
import { toISODateString } from '@/lib/utils'

interface DemoState {
  isDemo: boolean
  transactions: Transaction[]
  categories: Category[]
  persons: Person[]
  ledgers: PersonLedger[]
  payments: LedgerPayment[]
  enterDemo: () => void
  exitDemo: () => void
}

// Demo seed data — realistic BDT transactions over ~3 months
function buildDemoData() {
  const now = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return toISODateString(d)
  }

  const categories: Category[] = [
    { id: 'c1', user_id: 'demo', name: 'Food',        main_group: 'Food',      type: 'Expense', color_hex: '#F97316', is_default: true, created_at: '' },
    { id: 'c2', user_id: 'demo', name: 'Coffee',      main_group: 'Coffee',    type: 'Expense', color_hex: '#F59E0B', is_default: true, created_at: '' },
    { id: 'c3', user_id: 'demo', name: 'Ricksha Fare',main_group: 'Transport', type: 'Expense', color_hex: '#6C63FF', is_default: true, created_at: '' },
    { id: 'c4', user_id: 'demo', name: 'Salary',      main_group: 'Income',    type: 'Income',  color_hex: '#10B981', is_default: true, created_at: '' },
    { id: 'c5', user_id: 'demo', name: 'Shopping',    main_group: 'Shopping',  type: 'Expense', color_hex: '#A855F7', is_default: true, created_at: '' },
    { id: 'c6', user_id: 'demo', name: 'Medical',     main_group: 'Medical',   type: 'Expense', color_hex: '#EF4444', is_default: true, created_at: '' },
    { id: 'c7', user_id: 'demo', name: 'Uber/Pathao', main_group: 'Transport', type: 'Expense', color_hex: '#06B6D4', is_default: true, created_at: '' },
  ]

  const rawTransactions = [
    { id: 't1',  user_id: 'demo', category_id: 'c4', txn_date: daysAgo(1),  type: 'Income'  as const, amount: 45000, description: 'Monthly salary',      payment_method: 'Bank Transfer' as const, account: 'BRAC Bank Savings' as const, no_spend_flag: false, created_at: '' },
    { id: 't2',  user_id: 'demo', category_id: 'c1', txn_date: daysAgo(1),  type: 'Expense' as const, amount: 280,   description: 'Lunch at office',     payment_method: 'Cash'          as const, account: 'Cash'               as const, no_spend_flag: false, created_at: '' },
    { id: 't3',  user_id: 'demo', category_id: 'c2', txn_date: daysAgo(1),  type: 'Expense' as const, amount: 120,   description: 'Morning coffee',      payment_method: 'MFS - bKash'   as const, account: 'bKash'              as const, no_spend_flag: false, created_at: '' },
    { id: 't4',  user_id: 'demo', category_id: 'c3', txn_date: daysAgo(2),  type: 'Expense' as const, amount: 40,    description: 'To office',           payment_method: 'Cash'          as const, account: 'Cash'               as const, no_spend_flag: false, created_at: '' },
    { id: 't5',  user_id: 'demo', category_id: 'c5', txn_date: daysAgo(3),  type: 'Expense' as const, amount: 1800,  description: 'New shirt',           payment_method: 'Card'          as const, account: 'BRAC Bank Savings' as const, no_spend_flag: false, created_at: '' },
    { id: 't6',  user_id: 'demo', category_id: 'c1', txn_date: daysAgo(4),  type: 'Expense' as const, amount: 350,   description: 'Dinner',              payment_method: 'Cash'          as const, account: 'Cash'               as const, no_spend_flag: false, created_at: '' },
    { id: 't7',  user_id: 'demo', category_id: 'c7', txn_date: daysAgo(5),  type: 'Expense' as const, amount: 180,   description: 'Pathao to Dhanmondi', payment_method: 'MFS - bKash'   as const, account: 'bKash'              as const, no_spend_flag: false, created_at: '' },
    { id: 't8',  user_id: 'demo', category_id: 'c6', txn_date: daysAgo(7),  type: 'Expense' as const, amount: 600,   description: 'Pharmacy',            payment_method: 'Cash'          as const, account: 'Cash'               as const, no_spend_flag: false, created_at: '' },
    { id: 't9',  user_id: 'demo', category_id: 'c2', txn_date: daysAgo(8),  type: 'Expense' as const, amount: 250,   description: 'Starbucks',           payment_method: 'Card'          as const, account: 'BRAC Bank Savings' as const, no_spend_flag: false, created_at: '' },
    { id: 't10', user_id: 'demo', category_id: 'c1', txn_date: daysAgo(10), type: 'Expense' as const, amount: 480,   description: 'Dinner with friend',  payment_method: 'Cash'          as const, account: 'Cash'               as const, no_spend_flag: false, created_at: '' },
  ]
  const transactions: Transaction[] = rawTransactions.map((t) => ({
    ...t,
    category: categories.find((c) => c.id === t.category_id) ?? null,
  }))

  const persons: Person[] = [
    { id: 'p1', user_id: 'demo', name: 'Rafiq Bhai',  relationship: 'Friend',           phone: null, notes: null, created_at: '' },
    { id: 'p2', user_id: 'demo', name: 'Mama',        relationship: 'Family',           phone: null, notes: null, created_at: '' },
    { id: 'p3', user_id: 'demo', name: 'Tariq',       relationship: 'Business Partner', phone: null, notes: null, created_at: '' },
    { id: 'p4', user_id: 'demo', name: 'Sadia',       relationship: 'Friend',           phone: null, notes: null, created_at: '' },
    { id: 'p5', user_id: 'demo', name: 'Office Petty', relationship: 'Colleague',       phone: null, notes: null, created_at: '' },
  ]

  const rawLedgers = [
    { id: 'l1', user_id: 'demo', person_id: 'p1', ledger_type: 'Lent' as const, total_amount: 5000,  start_date: daysAgo(30), reason: 'Borrowed for medical', payment_method: 'MFS - bKash'   as const, account: 'bKash'              as const, settled_date: null,        doc_link: null, notes: null, created_at: '', paid_amount: 2000, remaining: 3000,  status: 'Partial'  as const },
    { id: 'l2', user_id: 'demo', person_id: 'p2', ledger_type: 'Lent' as const, total_amount: 10000, start_date: daysAgo(60), reason: 'House expense',        payment_method: 'Bank Transfer' as const, account: 'BRAC Bank Savings' as const, settled_date: null,        doc_link: null, notes: null, created_at: '', paid_amount: 0,    remaining: 10000, status: 'Pending'  as const },
    { id: 'l3', user_id: 'demo', person_id: 'p3', ledger_type: 'Debt' as const, total_amount: 15000, start_date: daysAgo(45), reason: 'Business capital',    payment_method: 'Bank Transfer' as const, account: 'BRAC Bank Savings' as const, settled_date: null,        doc_link: null, notes: null, created_at: '', paid_amount: 5000, remaining: 10000, status: 'Partial'  as const },
    { id: 'l4', user_id: 'demo', person_id: 'p4', ledger_type: 'Lent' as const, total_amount: 800,   start_date: daysAgo(10), reason: 'Lunch split',         payment_method: 'Cash'          as const, account: 'Cash'               as const, settled_date: daysAgo(3),  doc_link: null, notes: null, created_at: '', paid_amount: 800,  remaining: 0,     status: 'Settled'  as const },
    { id: 'l5', user_id: 'demo', person_id: 'p5', ledger_type: 'Debt' as const, total_amount: 2000,  start_date: daysAgo(20), reason: 'Petty cash advance',  payment_method: 'Cash'          as const, account: 'Cash'               as const, settled_date: null,        doc_link: null, notes: null, created_at: '', paid_amount: 0,    remaining: 2000,  status: 'Pending'  as const },
  ]
  const ledgers: PersonLedger[] = rawLedgers.map((l) => ({ ...l, person: persons.find((p) => p.id === l.person_id) }))

  const payments: LedgerPayment[] = [
    { id: 'pay1', ledger_id: 'l1', user_id: 'demo', amount: 2000, payment_date: daysAgo(15), payment_method: 'MFS - bKash', account: 'bKash', notes: null, created_at: '' },
    { id: 'pay2', ledger_id: 'l3', user_id: 'demo', amount: 5000, payment_date: daysAgo(20), payment_method: 'Bank Transfer', account: 'BRAC Bank Savings', notes: null, created_at: '' },
    { id: 'pay3', ledger_id: 'l4', user_id: 'demo', amount: 800,  payment_date: daysAgo(3),  payment_method: 'Cash', account: 'Cash', notes: 'Settled in full', created_at: '' },
  ]

  return { transactions, categories, persons, ledgers, payments }
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemo: false,
  transactions: [],
  categories: [],
  persons: [],
  ledgers: [],
  payments: [],

  enterDemo: () => {
    const data = buildDemoData()
    set({ isDemo: true, ...data })
  },

  exitDemo: () => set({
    isDemo: false,
    transactions: [],
    categories: [],
    persons: [],
    ledgers: [],
    payments: [],
  }),
}))
