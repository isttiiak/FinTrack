export interface Household {
  id: string
  name: string
  currency: string
  invite_code: string
  created_by: string | null
  created_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  // null = a named placeholder with no account (yet)
  user_id: string | null
  name: string
  role: 'owner' | 'member'
  created_at: string
}

export interface ExpenseSplit {
  member_id: string
  share: number
}

export interface SharedExpense {
  id: string
  household_id: string
  paid_by: string           // household_members.id
  amount: number
  description: string
  category: string | null
  expense_date: string
  notes: string | null
  created_by: string | null
  created_at: string
  splits: ExpenseSplit[]
}

export interface HouseholdSettlement {
  id: string
  household_id: string
  from_member: string       // paid
  to_member: string         // received
  amount: number
  settled_on: string
  note: string | null
  created_by: string | null
  created_at: string
}

export interface HouseholdDetail {
  household: Household
  members: HouseholdMember[]
  expenses: SharedExpense[]
  settlements: HouseholdSettlement[]
}

export interface SharedExpenseInput {
  id?: string               // present = edit
  household_id: string
  paid_by: string
  amount: number
  description: string
  category: string | null
  expense_date: string
  notes: string | null
  splits: ExpenseSplit[]
}
