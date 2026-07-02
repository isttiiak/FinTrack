export const DEFAULT_CATEGORIES = [
  // Food
  { name: 'Food',           main_group: 'Food',          type: 'Expense' as const },
  { name: 'Restaurants',    main_group: 'Food',          type: 'Expense' as const },
  { name: 'Fruits',         main_group: 'Food',          type: 'Expense' as const },
  { name: 'Dry Food',       main_group: 'Food',          type: 'Expense' as const },
  { name: 'Chicken',        main_group: 'Food',          type: 'Expense' as const },
  // Coffee (tracked separately)
  { name: 'Coffee',         main_group: 'Coffee',        type: 'Expense' as const },
  // Transport
  { name: 'Ricksha Fare',   main_group: 'Transport',     type: 'Expense' as const },
  { name: 'Bus Fare',       main_group: 'Transport',     type: 'Expense' as const },
  { name: 'Uber/Pathao',    main_group: 'Transport',     type: 'Expense' as const },
  // Utility
  { name: 'Phone Bill',     main_group: 'Utility',       type: 'Expense' as const },
  { name: 'Internet Bill',  main_group: 'Utility',       type: 'Expense' as const },
  { name: 'Laundry',        main_group: 'Utility',       type: 'Expense' as const },
  // Health
  { name: 'Medical',        main_group: 'Medical',       type: 'Expense' as const },
  // Lifestyle
  { name: 'Entertainment',  main_group: 'Entertainment', type: 'Expense' as const },
  { name: 'Education',      main_group: 'Education',     type: 'Expense' as const },
  { name: 'Shopping',       main_group: 'Shopping',      type: 'Expense' as const },
  { name: 'Fragrance',      main_group: 'Lifestyle',     type: 'Expense' as const },
  { name: 'Treats',         main_group: 'Lifestyle',     type: 'Expense' as const },
  // Giving
  { name: 'Donate',         main_group: 'Donate',        type: 'Expense' as const },
  { name: 'Gift',           main_group: 'Gift',          type: 'Expense' as const },
  // Others
  { name: 'Others',         main_group: 'Others',        type: 'Expense' as const },
  { name: 'Cashout Charge', main_group: 'Others',        type: 'Expense' as const },
  // Income
  { name: 'Salary',         main_group: 'Income',        type: 'Income' as const },
  { name: 'Savings',        main_group: 'Income',        type: 'Income' as const },
  { name: 'Business',       main_group: 'Income',        type: 'Income' as const },
  { name: 'Gift Received',  main_group: 'Income',        type: 'Income' as const },
] as const

export const PAYMENT_METHODS = [
  'Cash',
  'MFS - bKash',
  'MFS - Nagad',
  'MFS - Rocket',
  'Bank Transfer',
  'Card',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const ACCOUNTS = [
  'Cash',
  'bKash',
  'Nagad',
  'Rocket',
  'BRAC Bank Savings',
  'Prime Bank',
  'Islami Bank',
  'Dutch Bangla Bank',
  'Other',
] as const
export type Account = (typeof ACCOUNTS)[number]

// Card and Bank Transfer both draw from the same real-world set of bank
// accounts — there's no reason to make a user maintain "BRAC Bank Savings"
// as two separate custom entries. This is the single shared default list;
// user customization (add/hide/reorder) is also shared via
// lib/paymentMethodPrefs.ts's `getBankAccounts()`/`setBankAccounts()`.
export const BANK_ACCOUNTS = ['BRAC Bank Savings', 'Islami Bank', 'Prime Bank', 'Dutch Bangla Bank', 'Other'] as Account[]

// UI grouping: method group → specific methods + default accounts
export const PAYMENT_METHOD_GROUPS = {
  Cash: {
    label: 'Cash', icon: '💵',
    methods: ['Cash'] as PaymentMethod[],
    accounts: ['Cash'] as Account[],
    autoAccount: 'Cash' as Account,
  },
  MFS: {
    label: 'MFS', icon: '📱',
    methods: ['MFS - bKash', 'MFS - Nagad', 'MFS - Rocket'] as PaymentMethod[],
    accounts: ['bKash', 'Nagad', 'Rocket'] as Account[],
    autoAccount: null,
  },
  Card: {
    label: 'Card', icon: '💳',
    methods: ['Card'] as PaymentMethod[],
    accounts: BANK_ACCOUNTS,
    autoAccount: null,
  },
  'Bank Transfer': {
    label: 'Bank Transfer', icon: '🏦',
    methods: ['Bank Transfer'] as PaymentMethod[],
    accounts: BANK_ACCOUNTS,
    autoAccount: null,
  },
} as const

export type PaymentMethodGroup = keyof typeof PAYMENT_METHOD_GROUPS

export function getMethodGroup(method: string | null | undefined): PaymentMethodGroup | null {
  if (!method) return null
  for (const [group, cfg] of Object.entries(PAYMENT_METHOD_GROUPS)) {
    if ((cfg.methods as readonly string[]).includes(method)) return group as PaymentMethodGroup
  }
  return null
}

export const RELATIONSHIPS = [
  'Friend',
  'Family',
  'Business Partner',
  'Colleague',
  'Self',
  'Other',
] as const
export type Relationship = (typeof RELATIONSHIPS)[number]

export const TXN_TYPES = ['Expense', 'Income'] as const
export type TxnType = (typeof TXN_TYPES)[number]

export const LEDGER_TYPES = ['Lent', 'Debt'] as const
export type LedgerType = (typeof LEDGER_TYPES)[number]

export const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'INR'] as const
export type Currency = (typeof CURRENCIES)[number]

export const LEDGER_STATUSES = ['Pending', 'Partial', 'Settled'] as const
export type LedgerStatus = (typeof LEDGER_STATUSES)[number]
