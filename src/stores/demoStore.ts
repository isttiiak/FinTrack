import { create } from 'zustand'
import type { Transaction, Category } from '@/types/expense.types'
import type { Person, PersonLedger, LedgerPayment } from '@/types/ledger.types'
import type { Investment, InvestmentReturn, InvestmentPayment } from '@/types/investment.types'
import { toISODateString } from '@/lib/utils'

interface DemoState {
  isDemo: boolean
  transactions: Transaction[]
  categories: Category[]
  persons: Person[]
  ledgers: PersonLedger[]
  payments: LedgerPayment[]
  investments: Investment[]
  investmentReturns: InvestmentReturn[]
  investmentPayments: InvestmentPayment[]
  enterDemo: () => void
  exitDemo: () => void
  addTransaction: (txn: Transaction) => void
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
    { id: 't1',  user_id: 'demo', category_id: 'c4', txn_date: daysAgo(1),  type: 'Income'  as const, amount: 45000, description: 'Monthly salary',      payment_method: 'Bank Transfer' as const, account: 'BRAC Bank Savings' as const, created_at: '' },
    { id: 't2',  user_id: 'demo', category_id: 'c1', txn_date: daysAgo(1),  type: 'Expense' as const, amount: 280,   description: 'Lunch at office',     payment_method: 'Cash'          as const, account: 'Cash'               as const, created_at: '' },
    { id: 't3',  user_id: 'demo', category_id: 'c2', txn_date: daysAgo(1),  type: 'Expense' as const, amount: 120,   description: 'Morning coffee',      payment_method: 'MFS - bKash'   as const, account: 'bKash'              as const, created_at: '' },
    { id: 't4',  user_id: 'demo', category_id: 'c3', txn_date: daysAgo(2),  type: 'Expense' as const, amount: 40,    description: 'To office',           payment_method: 'Cash'          as const, account: 'Cash'               as const, created_at: '' },
    { id: 't5',  user_id: 'demo', category_id: 'c5', txn_date: daysAgo(3),  type: 'Expense' as const, amount: 1800,  description: 'New shirt',           payment_method: 'Card'          as const, account: 'BRAC Bank Savings' as const, created_at: '' },
    { id: 't6',  user_id: 'demo', category_id: 'c1', txn_date: daysAgo(4),  type: 'Expense' as const, amount: 350,   description: 'Dinner',              payment_method: 'Cash'          as const, account: 'Cash'               as const, created_at: '' },
    { id: 't7',  user_id: 'demo', category_id: 'c7', txn_date: daysAgo(5),  type: 'Expense' as const, amount: 180,   description: 'Pathao to Dhanmondi', payment_method: 'MFS - bKash'   as const, account: 'bKash'              as const, created_at: '' },
    { id: 't8',  user_id: 'demo', category_id: 'c6', txn_date: daysAgo(7),  type: 'Expense' as const, amount: 600,   description: 'Pharmacy',            payment_method: 'Cash'          as const, account: 'Cash'               as const, created_at: '' },
    { id: 't9',  user_id: 'demo', category_id: 'c2', txn_date: daysAgo(8),  type: 'Expense' as const, amount: 250,   description: 'Starbucks',           payment_method: 'Card'          as const, account: 'BRAC Bank Savings' as const, created_at: '' },
    { id: 't10', user_id: 'demo', category_id: 'c1', txn_date: daysAgo(10), type: 'Expense' as const, amount: 480,   description: 'Dinner with friend',  payment_method: 'Cash'          as const, account: 'Cash'               as const, created_at: '' },
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

  // Rafiq Bhai has TWO separate Lent entries — demonstrates the aggregate
  // balance model: the person's true remaining is the sum across both
  // entries minus all their payments, not any single entry's amount.
  const rawLedgers = [
    { id: 'l1',  user_id: 'demo', person_id: 'p1', ledger_type: 'Lent' as const, total_amount: 5000,  start_date: daysAgo(30), reason: 'Borrowed for medical', payment_method: 'MFS - bKash'   as const, account: 'bKash'              as const, settled_date: null, doc_link: null, notes: null, created_at: '' },
    { id: 'l1b', user_id: 'demo', person_id: 'p1', ledger_type: 'Lent' as const, total_amount: 1000,  start_date: daysAgo(10), reason: 'Emergency top-up',     payment_method: 'MFS - bKash'   as const, account: 'bKash'              as const, settled_date: null, doc_link: null, notes: null, created_at: '' },
    { id: 'l2',  user_id: 'demo', person_id: 'p2', ledger_type: 'Lent' as const, total_amount: 10000, start_date: daysAgo(60), reason: 'House expense',        payment_method: 'Bank Transfer' as const, account: 'BRAC Bank Savings' as const, settled_date: null, doc_link: null, notes: null, created_at: '' },
    { id: 'l3',  user_id: 'demo', person_id: 'p3', ledger_type: 'Debt' as const, total_amount: 15000, start_date: daysAgo(45), reason: 'Business capital',     payment_method: 'Bank Transfer' as const, account: 'BRAC Bank Savings' as const, settled_date: null, doc_link: null, notes: null, created_at: '' },
    { id: 'l4',  user_id: 'demo', person_id: 'p4', ledger_type: 'Lent' as const, total_amount: 800,   start_date: daysAgo(10), reason: 'Lunch split',          payment_method: 'Cash'          as const, account: 'Cash'               as const, settled_date: daysAgo(3), doc_link: null, notes: null, created_at: '' },
    { id: 'l5',  user_id: 'demo', person_id: 'p5', ledger_type: 'Debt' as const, total_amount: 2000,  start_date: daysAgo(20), reason: 'Petty cash advance',   payment_method: 'Cash'          as const, account: 'Cash'               as const, settled_date: null, doc_link: null, notes: null, created_at: '' },
  ]
  const ledgers: PersonLedger[] = rawLedgers.map((l) => ({ ...l, person: persons.find((p) => p.id === l.person_id) }))

  const payments: LedgerPayment[] = [
    { id: 'pay1', person_id: 'p1', ledger_type: 'Lent' as const, user_id: 'demo', amount: 2000, payment_date: daysAgo(15), payment_method: 'MFS - bKash', account: 'bKash', notes: null, created_at: '' },
    { id: 'pay2', person_id: 'p3', ledger_type: 'Debt' as const, user_id: 'demo', amount: 5000, payment_date: daysAgo(20), payment_method: 'Bank Transfer', account: 'BRAC Bank Savings', notes: null, created_at: '' },
    { id: 'pay3', person_id: 'p4', ledger_type: 'Lent' as const, user_id: 'demo', amount: 800,  payment_date: daysAgo(3),  payment_method: 'Cash', account: 'Cash', notes: 'Settled in full', created_at: '' },
  ]

  const investments: Investment[] = [
    { id: 'inv1', user_id: 'demo', name: 'Bashundhara Land Plot', category: 'Real Estate', company_name: null, committed_amount: 800000, start_date: daysAgo(300), end_date: null, market_value: 950000, doc_link: null, notes: null, created_at: '' },
    { id: 'inv2', user_id: 'demo', name: 'DSE Stock Portfolio',   category: 'Stocks',      company_name: 'Grameenphone, BRAC Bank', committed_amount: 150000, start_date: daysAgo(200), end_date: null, market_value: 172000, doc_link: null, notes: null, created_at: '' },
    { id: 'inv3', user_id: 'demo', name: 'Islami Bank FDR',       category: 'Fixed Deposit', company_name: 'Islami Bank Bangladesh', committed_amount: 300000, start_date: daysAgo(180), end_date: daysAgo(-185), market_value: null, doc_link: null, notes: null, created_at: '' },
  ]

  const investmentPayments: InvestmentPayment[] = [
    { id: 'ip1', investment_id: 'inv1', user_id: 'demo', amount: 500000, payment_date: daysAgo(300), payment_method: 'Bank Transfer', account: 'BRAC Bank Savings', notes: 'Booking amount', created_at: '' },
    { id: 'ip2', investment_id: 'inv1', user_id: 'demo', amount: 300000, payment_date: daysAgo(200), payment_method: 'Bank Transfer', account: 'BRAC Bank Savings', notes: 'Final installment', created_at: '' },
    { id: 'ip3', investment_id: 'inv2', user_id: 'demo', amount: 150000, payment_date: daysAgo(200), payment_method: 'Bank Transfer', account: 'Prime Bank', notes: null, created_at: '' },
    { id: 'ip4', investment_id: 'inv3', user_id: 'demo', amount: 300000, payment_date: daysAgo(180), payment_method: 'Bank Transfer', account: 'Islami Bank', notes: null, created_at: '' },
  ]

  const investmentReturns: InvestmentReturn[] = [
    { id: 'ir1', investment_id: 'inv1', user_id: 'demo', amount: 15000, return_date: daysAgo(240), return_type: 'Rent', payment_method: 'MFS - bKash', account: 'bKash', notes: 'Q1 rent', created_at: '' },
    { id: 'ir2', investment_id: 'inv1', user_id: 'demo', amount: 15000, return_date: daysAgo(150), return_type: 'Rent', payment_method: 'MFS - bKash', account: 'bKash', notes: 'Q2 rent', created_at: '' },
    { id: 'ir3', investment_id: 'inv1', user_id: 'demo', amount: 15000, return_date: daysAgo(60),  return_type: 'Rent', payment_method: 'MFS - bKash', account: 'bKash', notes: 'Q3 rent', created_at: '' },
    { id: 'ir4', investment_id: 'inv2', user_id: 'demo', amount: 3200,  return_date: daysAgo(90),  return_type: 'Dividend', payment_method: 'Bank Transfer', account: 'Prime Bank', notes: null, created_at: '' },
    { id: 'ir5', investment_id: 'inv2', user_id: 'demo', amount: 8000,  return_date: daysAgo(30),  return_type: 'Profit', payment_method: 'Bank Transfer', account: 'Prime Bank', notes: 'Partial share sale', created_at: '' },
  ]

  return { transactions, categories, persons, ledgers, payments, investments, investmentReturns, investmentPayments }
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemo: false,
  transactions: [],
  categories: [],
  persons: [],
  ledgers: [],
  payments: [],
  investments: [],
  investmentReturns: [],
  investmentPayments: [],

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
    investments: [],
    investmentReturns: [],
    investmentPayments: [],
  }),

  // Demo mode is otherwise entirely read-only (every other mutation is
  // blocked by useDemoGuard with a "not saved" toast) — expense creation is
  // the one exception, so the app's most-tried interaction actually works
  // in the demo rather than silently faking success. In-memory only, lost
  // on exitDemo()/reload, same as the rest of the seed data.
  addTransaction: (txn) => set((s) => ({ transactions: [txn, ...s.transactions] })),
}))
