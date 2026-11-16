import { create } from 'zustand'
import type { Transaction, Category, BudgetLimit } from '@/types/expense.types'
import type { Person, PersonLedger, LedgerPayment } from '@/types/ledger.types'
import type { Investment, InvestmentReturn, InvestmentPayment } from '@/types/investment.types'
import type { RecurringRule } from '@/types/recurring.types'
import type {
  HouseholdDetail, HouseholdMember, HouseholdSettlement, SharedExpense, SharedExpenseInput,
} from '@/types/household.types'
import { DEMO_HOUSEHOLD, DEMO_MEMBER_ID } from '@/lib/demoHousehold'
import { toISODateString } from '@/lib/utils'

interface DemoState {
  isDemo: boolean
  transactions: Transaction[]
  categories: Category[]
  budgets: BudgetLimit[]
  persons: Person[]
  ledgers: PersonLedger[]
  payments: LedgerPayment[]
  investments: Investment[]
  investmentReturns: InvestmentReturn[]
  investmentPayments: InvestmentPayment[]
  recurringRules: RecurringRule[]
  households: Record<string, HouseholdDetail>
  enterDemo: () => void
  exitDemo: () => void
  addTransaction: (txn: Transaction) => void
  updateTransaction: (id: string, fields: Partial<Transaction>) => Transaction | undefined
  removeTransaction: (id: string) => void
  addCategory: (cat: Category) => void
  updateCategory: (id: string, fields: Partial<Category>) => void
  removeCategory: (id: string) => void
  renameMainGroup: (oldName: string, newName: string) => void
  deleteMainGroup: (groupName: string) => void
  upsertBudget: (data: { category_id: string; monthly_limit: number; rollover?: boolean }) => BudgetLimit
  removeBudget: (id: string) => void
  addRecurringRule: (rule: RecurringRule) => void
  updateRecurringRule: (id: string, fields: Partial<RecurringRule>) => RecurringRule | undefined
  removeRecurringRule: (id: string) => void
  addPerson: (person: Person) => void
  updatePerson: (id: string, fields: Partial<Person>) => Person | undefined
  removePerson: (id: string) => void
  addLedger: (entry: PersonLedger) => void
  updateLedger: (id: string, fields: Partial<PersonLedger>) => PersonLedger | undefined
  removeLedger: (id: string) => void
  addPayment: (payment: LedgerPayment) => void
  updatePayment: (id: string, fields: Partial<LedgerPayment>) => LedgerPayment | undefined
  removePayment: (id: string) => void
  addInvestment: (inv: Investment) => void
  updateInvestment: (id: string, fields: Partial<Investment>) => Investment | undefined
  removeInvestment: (id: string) => void
  addInvestmentPayment: (payment: InvestmentPayment) => void
  updateInvestmentPayment: (id: string, fields: Partial<InvestmentPayment>) => InvestmentPayment | undefined
  removeInvestmentPayment: (id: string) => void
  addInvestmentReturn: (ret: InvestmentReturn) => void
  updateInvestmentReturn: (id: string, fields: Partial<InvestmentReturn>) => InvestmentReturn | undefined
  removeInvestmentReturn: (id: string) => void
  createHousehold: (v: { name: string; currency: string; myName?: string }) => string
  saveSharedExpense: (v: SharedExpenseInput) => string
  deleteSharedExpense: (v: { id: string; householdId: string }) => void
  saveSettlement: (v: Omit<HouseholdSettlement, 'id' | 'created_by' | 'created_at'> & { id?: string }) => void
  deleteSettlement: (v: { id: string; householdId: string }) => void
  addHouseholdMember: (v: { householdId: string; name: string }) => void
  removeHouseholdMember: (v: { id: string; householdId: string }) => void
  rotateHouseholdInviteCode: (householdId: string) => string
  deleteHousehold: (householdId: string) => void
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
    { id: 'c3', user_id: 'demo', name: 'Rickshaw Fare', main_group: 'Transport', type: 'Expense', color_hex: '#6C63FF', is_default: true, created_at: '' },
    { id: 'c4', user_id: 'demo', name: 'Salary',      main_group: 'Income',    type: 'Income',  color_hex: '#10B981', is_default: true, created_at: '' },
    { id: 'c5', user_id: 'demo', name: 'Shopping',    main_group: 'Shopping',  type: 'Expense', color_hex: '#A855F7', is_default: true, created_at: '' },
    { id: 'c6', user_id: 'demo', name: 'Medical',     main_group: 'Medical',   type: 'Expense', color_hex: '#EF4444', is_default: true, created_at: '' },
    { id: 'c7', user_id: 'demo', name: 'Uber/Pathao', main_group: 'Transport', type: 'Expense', color_hex: '#06B6D4', is_default: true, created_at: '' },
    { id: 'c8', user_id: 'demo', name: 'Phone Bill',  main_group: 'Utility',   type: 'Expense', color_hex: '#0EA5E9', is_default: true, created_at: '' },
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

  const recurringRules: RecurringRule[] = [
    {
      id: 'r1', user_id: 'demo', category_id: 'c4', type: 'Income', amount: 45000,
      description: 'Monthly salary', cadence: 'Monthly',
      start_date: daysAgo(95), end_date: null,
      payment_method: 'Bank Transfer', account: 'BRAC Bank Savings',
      is_active: true, last_materialized_date: daysAgo(35), created_at: '',
      category: categories.find((c) => c.id === 'c4') ?? null,
    },
    {
      id: 'r2', user_id: 'demo', category_id: 'c8', type: 'Expense', amount: 599,
      description: 'Phone bill', cadence: 'Monthly',
      start_date: daysAgo(65), end_date: null,
      payment_method: 'MFS - bKash', account: 'bKash',
      is_active: true, last_materialized_date: daysAgo(35), created_at: '',
      category: categories.find((c) => c.id === 'c8') ?? null,
    },
    {
      id: 'r3', user_id: 'demo', category_id: 'c1', type: 'Expense', amount: 800,
      description: 'Weekly groceries', cadence: 'Weekly',
      start_date: daysAgo(30), end_date: null,
      payment_method: 'Cash', account: 'Cash',
      is_active: true, last_materialized_date: daysAgo(2), created_at: '',
      category: categories.find((c) => c.id === 'c1') ?? null,
    },
  ]

  const budgets: BudgetLimit[] = [
    {
      id: 'b1', user_id: 'demo', category_id: 'c1', monthly_limit: 5000,
      rollover: false, created_at: daysAgo(60), category: categories.find((c) => c.id === 'c1') ?? null,
    },
    {
      id: 'b2', user_id: 'demo', category_id: 'c2', monthly_limit: 1500,
      rollover: false, created_at: daysAgo(60), category: categories.find((c) => c.id === 'c2') ?? null,
    },
    {
      id: 'b3', user_id: 'demo', category_id: 'c5', monthly_limit: 4000,
      rollover: false, created_at: daysAgo(60), category: categories.find((c) => c.id === 'c5') ?? null,
    },
  ]

  const households: Record<string, HouseholdDetail> = {
    [DEMO_HOUSEHOLD.household.id]: structuredClone(DEMO_HOUSEHOLD),
  }

  return { transactions, categories, budgets, persons, ledgers, payments, investments, investmentReturns, investmentPayments, recurringRules, households }
}

export const useDemoStore = create<DemoState>((set, get) => ({
  isDemo: false,
  transactions: [],
  categories: [],
  budgets: [],
  persons: [],
  ledgers: [],
  payments: [],
  investments: [],
  investmentReturns: [],
  investmentPayments: [],
  recurringRules: [],
  households: {},

  enterDemo: () => {
    const data = buildDemoData()
    set({ isDemo: true, ...data })
  },

  exitDemo: () => set({
    isDemo: false,
    transactions: [],
    categories: [],
    budgets: [],
    persons: [],
    ledgers: [],
    payments: [],
    investments: [],
    investmentReturns: [],
    investmentPayments: [],
    recurringRules: [],
    households: {},
  }),

  // Demo mode mutations operate strictly in memory — session changes remain
  // interactive and reset on exitDemo() or page reload.
  addTransaction: (txn) => set((s) => ({ transactions: [txn, ...s.transactions] })),
  updateTransaction: (id, fields) => {
    let updated: Transaction | undefined
    set((s) => ({
      transactions: s.transactions.map((t) => {
        if (t.id !== id) return t
        const nextCategory = fields.category_id !== undefined
          ? (s.categories.find((c) => c.id === fields.category_id) ?? null)
          : t.category
        updated = { ...t, ...fields, category: nextCategory }
        return updated
      }),
    }))
    return updated ?? get().transactions.find((t) => t.id === id)
  },
  removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

  addCategory: (cat) => set((s) => ({ categories: [...s.categories, cat] })),
  updateCategory: (id, fields) => set((s) => {
    const categories = s.categories.map((c) => (c.id === id ? { ...c, ...fields } : c))
    const transactions = s.transactions.map((t) => (
      t.category_id === id && t.category
        ? { ...t, category: { ...t.category, ...fields } }
        : t
    ))
    return { categories, transactions }
  }),
  removeCategory: (id) => set((s) => ({
    categories: s.categories.filter((c) => c.id !== id),
    budgets: s.budgets.filter((b) => b.category_id !== id),
    transactions: s.transactions.map((t) => (
      t.category_id === id ? { ...t, category_id: null, category: null } : t
    )),
  })),
  renameMainGroup: (oldName, newName) => set((s) => ({
    categories: s.categories.map((c) => (c.main_group === oldName ? { ...c, main_group: newName } : c)),
    transactions: s.transactions.map((t) => (
      t.category?.main_group === oldName
        ? { ...t, category: { ...t.category, main_group: newName } }
        : t
    )),
  })),
  deleteMainGroup: (groupName) => set((s) => {
    const removedIds = new Set(s.categories.filter((c) => c.main_group === groupName).map((c) => c.id))
    return {
      categories: s.categories.filter((c) => c.main_group !== groupName),
      budgets: s.budgets.filter((b) => !removedIds.has(b.category_id)),
      transactions: s.transactions.map((t) => (
        t.category_id && removedIds.has(t.category_id) ? { ...t, category_id: null, category: null } : t
      )),
    }
  }),

  upsertBudget: (data) => {
    let result: BudgetLimit | undefined
    set((s) => {
      const cat = s.categories.find((c) => c.id === data.category_id) ?? null
      const existing = s.budgets.find((b) => b.category_id === data.category_id)
      if (existing) {
        result = {
          ...existing,
          monthly_limit: data.monthly_limit,
          ...(data.rollover !== undefined && { rollover: data.rollover }),
          category: cat,
        }
        return { budgets: s.budgets.map((b) => (b.id === existing.id ? result! : b)) }
      }
      result = {
        id: `demo-budget-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: 'demo',
        category_id: data.category_id,
        monthly_limit: data.monthly_limit,
        rollover: data.rollover ?? false,
        created_at: new Date().toISOString(),
        category: cat,
      }
      return { budgets: [...s.budgets, result] }
    })
    return result!
  },
  removeBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

  addRecurringRule: (rule) => set((s) => ({ recurringRules: [rule, ...s.recurringRules] })),
  updateRecurringRule: (id, fields) => {
    let updated: RecurringRule | undefined
    set((s) => ({
      recurringRules: s.recurringRules.map((r) => {
        if (r.id !== id) return r
        const nextCategory = fields.category_id !== undefined
          ? (s.categories.find((c) => c.id === fields.category_id) ?? null)
          : r.category
        updated = { ...r, ...fields, category: nextCategory }
        return updated
      }),
    }))
    return updated ?? get().recurringRules.find((r) => r.id === id)
  },
  removeRecurringRule: (id) => set((s) => ({ recurringRules: s.recurringRules.filter((r) => r.id !== id) })),

  addPerson: (person) => set((s) => ({ persons: [...s.persons, person] })),
  updatePerson: (id, fields) => {
    let updated: Person | undefined
    set((s) => ({
      persons: s.persons.map((p) => {
        if (p.id !== id) return p
        updated = { ...p, ...fields }
        return updated
      }),
    }))
    return updated ?? get().persons.find((p) => p.id === id)
  },
  removePerson: (id) => set((s) => ({
    persons: s.persons.filter((p) => p.id !== id),
    ledgers: s.ledgers.filter((l) => l.person_id !== id),
    payments: s.payments.filter((pay) => pay.person_id !== id),
  })),

  addLedger: (entry) => set((s) => ({ ledgers: [entry, ...s.ledgers] })),
  updateLedger: (id, fields) => {
    let updated: PersonLedger | undefined
    set((s) => ({
      ledgers: s.ledgers.map((l) => {
        if (l.id !== id) return l
        updated = { ...l, ...fields }
        return updated
      }),
    }))
    return updated ?? get().ledgers.find((l) => l.id === id)
  },
  removeLedger: (id) => set((s) => {
    const target = s.ledgers.find((l) => l.id === id)
    const ledgers = s.ledgers.filter((l) => l.id !== id)
    if (!target) return { ledgers }
    const hasRemaining = ledgers.some(
      (l) => l.person_id === target.person_id && l.ledger_type === target.ledger_type,
    )
    const payments = hasRemaining
      ? s.payments
      : s.payments.filter((p) => !(p.person_id === target.person_id && p.ledger_type === target.ledger_type))
    return { ledgers, payments }
  }),

  addPayment: (payment) => set((s) => ({ payments: [...s.payments, payment] })),
  updatePayment: (id, fields) => {
    let updated: LedgerPayment | undefined
    set((s) => ({
      payments: s.payments.map((p) => {
        if (p.id !== id) return p
        updated = { ...p, ...fields }
        return updated
      }),
    }))
    return updated ?? get().payments.find((p) => p.id === id)
  },
  removePayment: (id) => set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),

  addInvestment: (inv) => set((s) => ({ investments: [inv, ...s.investments] })),
  updateInvestment: (id, fields) => {
    let updated: Investment | undefined
    set((s) => ({
      investments: s.investments.map((i) => {
        if (i.id !== id) return i
        updated = { ...i, ...fields }
        return updated
      }),
    }))
    return updated ?? get().investments.find((i) => i.id === id)
  },
  removeInvestment: (id) => set((s) => ({
    investments: s.investments.filter((i) => i.id !== id),
    investmentPayments: s.investmentPayments.filter((p) => p.investment_id !== id),
    investmentReturns: s.investmentReturns.filter((r) => r.investment_id !== id),
  })),

  addInvestmentPayment: (payment) => set((s) => ({
    investmentPayments: [...s.investmentPayments, payment],
  })),
  updateInvestmentPayment: (id, fields) => {
    let updated: InvestmentPayment | undefined
    set((s) => ({
      investmentPayments: s.investmentPayments.map((p) => {
        if (p.id !== id) return p
        updated = { ...p, ...fields }
        return updated
      }),
    }))
    return updated ?? get().investmentPayments.find((p) => p.id === id)
  },
  removeInvestmentPayment: (id) => set((s) => ({
    investmentPayments: s.investmentPayments.filter((p) => p.id !== id),
  })),

  addInvestmentReturn: (ret) => set((s) => ({
    investmentReturns: [...s.investmentReturns, ret],
  })),
  updateInvestmentReturn: (id, fields) => {
    let updated: InvestmentReturn | undefined
    set((s) => ({
      investmentReturns: s.investmentReturns.map((r) => {
        if (r.id !== id) return r
        updated = { ...r, ...fields }
        return updated
      }),
    }))
    return updated ?? get().investmentReturns.find((r) => r.id === id)
  },
  removeInvestmentReturn: (id) => set((s) => ({
    investmentReturns: s.investmentReturns.filter((r) => r.id !== id),
  })),

  createHousehold: (v) => {
    const id = `demo-h-${crypto.randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    const owner: HouseholdMember = {
      id: DEMO_MEMBER_ID,
      household_id: id,
      user_id: 'demo',
      name: v.myName?.trim() || 'You',
      role: 'owner',
      created_at: now,
    }
    const detail: HouseholdDetail = {
      household: {
        id,
        name: v.name.trim(),
        currency: v.currency,
        invite_code: inviteCode,
        created_by: 'demo',
        created_at: now,
      },
      members: [owner],
      expenses: [],
      settlements: [],
    }
    set((s) => ({ households: { ...s.households, [id]: detail } }))
    return id
  },

  saveSharedExpense: (v) => {
    const id = v.id ?? `demo-e-${crypto.randomUUID().slice(0, 8)}`
    const now = new Date().toISOString()
    set((s) => {
      const target = s.households[v.household_id]
      if (!target) return s
      const existing = v.id ? target.expenses.find((e) => e.id === v.id) : undefined
      const saved: SharedExpense = {
        id,
        household_id: v.household_id,
        paid_by: v.paid_by,
        amount: v.amount,
        description: v.description,
        category: v.category,
        expense_date: v.expense_date,
        notes: v.notes,
        created_by: existing?.created_by ?? 'demo',
        created_at: existing?.created_at ?? now,
        splits: v.splits.map((sp) => ({ ...sp })),
      }
      const nextExpenses = existing
        ? target.expenses.map((e) => (e.id === v.id ? saved : e))
        : [saved, ...target.expenses]
      nextExpenses.sort((a, b) => b.expense_date.localeCompare(a.expense_date))
      return {
        households: {
          ...s.households,
          [v.household_id]: { ...target, expenses: nextExpenses },
        },
      }
    })
    return id
  },

  deleteSharedExpense: ({ id, householdId }) => set((s) => {
    const target = s.households[householdId]
    if (!target) return s
    return {
      households: {
        ...s.households,
        [householdId]: {
          ...target,
          expenses: target.expenses.filter((e) => e.id !== id),
        },
      },
    }
  }),

  saveSettlement: (v) => set((s) => {
    const target = s.households[v.household_id]
    if (!target) return s
    const now = new Date().toISOString()
    const existing = v.id ? target.settlements.find((st) => st.id === v.id) : undefined
    const saved: HouseholdSettlement = {
      id: v.id ?? `demo-s-${crypto.randomUUID().slice(0, 8)}`,
      household_id: v.household_id,
      from_member: v.from_member,
      to_member: v.to_member,
      amount: v.amount,
      settled_on: v.settled_on,
      note: v.note,
      created_by: existing?.created_by ?? 'demo',
      created_at: existing?.created_at ?? now,
    }
    const nextSettlements = existing
      ? target.settlements.map((st) => (st.id === v.id ? saved : st))
      : [saved, ...target.settlements]
    nextSettlements.sort((a, b) => b.settled_on.localeCompare(a.settled_on))
    return {
      households: {
        ...s.households,
        [v.household_id]: { ...target, settlements: nextSettlements },
      },
    }
  }),

  deleteSettlement: ({ id, householdId }) => set((s) => {
    const target = s.households[householdId]
    if (!target) return s
    return {
      households: {
        ...s.households,
        [householdId]: {
          ...target,
          settlements: target.settlements.filter((st) => st.id !== id),
        },
      },
    }
  }),

  addHouseholdMember: ({ householdId, name }) => set((s) => {
    const target = s.households[householdId]
    if (!target) return s
    const member: HouseholdMember = {
      id: `demo-m-${crypto.randomUUID().slice(0, 8)}`,
      household_id: householdId,
      user_id: null,
      name: name.trim(),
      role: 'member',
      created_at: new Date().toISOString(),
    }
    return {
      households: {
        ...s.households,
        [householdId]: { ...target, members: [...target.members, member] },
      },
    }
  }),

  removeHouseholdMember: ({ id, householdId }) => {
    const target = get().households[householdId]
    if (!target) return
    const referenced =
      target.expenses.some((e) => e.paid_by === id || e.splits.some((sp) => sp.member_id === id)) ||
      target.settlements.some((st) => st.from_member === id || st.to_member === id)
    if (referenced) {
      throw Object.assign(new Error('Member referenced in expenses or settlements'), { code: '23503' })
    }
    set((s) => {
      const current = s.households[householdId]
      if (!current) return s
      return {
        households: {
          ...s.households,
          [householdId]: {
            ...current,
            members: current.members.filter((m) => m.id !== id),
          },
        },
      }
    })
  },

  rotateHouseholdInviteCode: (householdId) => {
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    set((s) => {
      const target = s.households[householdId]
      if (!target) return s
      return {
        households: {
          ...s.households,
          [householdId]: {
            ...target,
            household: { ...target.household, invite_code: code },
          },
        },
      }
    })
    return code
  },

  deleteHousehold: (householdId) => set((s) => {
    const next = { ...s.households }
    delete next[householdId]
    return { households: next }
  }),
}))
