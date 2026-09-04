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

export const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'INR', 'SEK', 'DKK'] as const
export type Currency = (typeof CURRENCIES)[number]

export const LEDGER_STATUSES = ['Pending', 'Partial', 'Settled'] as const
export type LedgerStatus = (typeof LEDGER_STATUSES)[number]

export const RECURRING_CADENCES = ['Weekly', 'Monthly', 'Yearly'] as const
export type RecurringCadence = (typeof RECURRING_CADENCES)[number]

// ── AI providers ─────────────────────────────────────────────────────────
// Multi-provider so one vendor's outage/shutdown never kills every AI
// feature at once — Groq decommissioned llama-3.1-8b-instant on 2026-08-16
// with no fallback (TODO.md §1.1). Groq stays the default so existing users
// notice nothing; OpenRouter is the fallback provider, and also the only one
// that can do vision (receipt OCR) — see OCR_MODELS below.
export type AIProvider = 'groq' | 'openrouter'

export interface AIModelOption {
  id: string
  label: string
  description: string
}

export const GROQ_MODELS: AIModelOption[] = [
  {
    id: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B — fast',
    description: 'Default. Fast and free-tier friendly — best for quick suggestions, digests, and analysis.',
  },
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT-OSS 120B — smarter',
    description: 'Larger, more capable model — better for Chat and the Goal Planner. Slower and lower free-tier throughput.',
  },
]
export const DEFAULT_GROQ_MODEL = GROQ_MODELS[0].id

export const OPENROUTER_MODELS: AIModelOption[] = [
  {
    id: 'qwen/qwen3.6-flash',
    label: 'Qwen3.6 Flash — fast & cheap',
    description: 'Default. Cheap per-token text model — good fallback for quick suggestions and digests.',
  },
  {
    id: 'qwen/qwen3.6-27b',
    label: 'Qwen3.6 27B — smarter',
    description: 'Larger model — better for Chat and the Goal Planner. Slower and pricier per token.',
  },
]
export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODELS[0].id

export interface AIProviderConfig {
  id: AIProvider
  label: string
  models: AIModelOption[]
  defaultModel: string
  keyPlaceholder: string
  keyHelp: string
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'groq',
    label: 'Groq',
    models: GROQ_MODELS,
    defaultModel: DEFAULT_GROQ_MODEL,
    keyPlaceholder: 'gsk_…',
    keyHelp: 'Free key at console.groq.com → API Keys → Create API key. 14,400 requests/day.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    models: OPENROUTER_MODELS,
    defaultModel: DEFAULT_OPENROUTER_MODEL,
    keyPlaceholder: 'sk-or-…',
    keyHelp: 'Key at openrouter.ai/keys. 50 requests/day free, 1,000/day after $10 spent — good fallback when Groq is unavailable.',
  },
]

// Vision-capable models for receipt scanning (TODO.md §5.4). OpenRouter
// only — Groq's free tier is text-only. Unlike the text models above these
// are NOT free (small per-token cost billed to the user's own OpenRouter
// key/credits), so they're kept in their own list rather than folded into
// OPENROUTER_MODELS above.
export const OCR_MODELS: AIModelOption[] = [
  {
    id: 'qwen/qwen3.6-27b',
    label: 'Qwen3.6 27B',
    description: 'Default. Native vision-language model, strong multilingual OCR. ~$0.30/$2 per M tokens.',
  },
  {
    id: 'qwen/qwen3.8-27b',
    label: 'Qwen3.8 27B',
    description: 'Newer, larger context window. ~$0.22/$2.42 per M tokens.',
  },
]
export const DEFAULT_OCR_MODEL = OCR_MODELS[0].id
