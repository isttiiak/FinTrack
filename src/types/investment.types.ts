export const INVESTMENT_CATEGORIES = [
  'Real Estate', 'Shared Business', 'Garments', 'Farming',
  'Stocks', 'Crypto', 'Fixed Deposit', 'Savings Bond', 'Other',
] as const
export type InvestmentCategory = (typeof INVESTMENT_CATEGORIES)[number]

export const RETURN_TYPES = ['Profit', 'Capital Return', 'Dividend', 'Rent', 'Other'] as const
export type ReturnType = (typeof RETURN_TYPES)[number]

export interface Investment {
  id: string
  user_id: string
  name: string
  category: InvestmentCategory | null
  company_name: string | null
  committed_amount: number | null
  start_date: string | null
  end_date: string | null
  market_value: number | null
  doc_link: string | null
  notes: string | null
  created_at: string
  // joined
  returns?: InvestmentReturn[]
  payments?: InvestmentPayment[]
  // computed
  total_returned?: number
  total_paid?: number       // sum of installment payments made
  roi_percent?: number
  profit_loss?: number
}

export interface InvestmentReturn {
  id: string
  investment_id: string
  user_id: string
  amount: number
  return_date: string
  return_type: ReturnType | null
  payment_method: string | null
  account: string | null
  notes: string | null
  created_at: string
}

export interface InvestmentPayment {
  id: string
  investment_id: string
  user_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  account: string | null
  notes: string | null
  created_at: string
}
