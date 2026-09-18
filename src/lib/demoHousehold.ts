import type { HouseholdDetail } from '@/types/household.types'

// Read-only sample household for demo mode. A different currency from the
// rest of the demo data on purpose — households are single-currency but the
// app is for a global audience (students abroad, flatmates, families).
export const DEMO_MEMBER_ID = 'demo-m1'

const H = 'demo-h1'

export const DEMO_HOUSEHOLD: HouseholdDetail = {
  household: { id: H, name: 'Flat 4B', currency: 'GBP', invite_code: 'demo-invite', created_by: 'demo', created_at: '2026-08-01T00:00:00Z' },
  members: [
    { id: DEMO_MEMBER_ID, household_id: H, user_id: 'demo', name: 'You', role: 'owner', created_at: '2026-08-01T00:00:00Z' },
    { id: 'demo-m2', household_id: H, user_id: null, name: 'Sara', role: 'member', created_at: '2026-08-01T00:00:00Z' },
    { id: 'demo-m3', household_id: H, user_id: null, name: 'Tom', role: 'member', created_at: '2026-08-01T00:00:00Z' },
  ],
  expenses: [
    { id: 'demo-e1', household_id: H, paid_by: DEMO_MEMBER_ID, amount: 900, description: 'September rent', category: 'Rent', expense_date: '2026-09-01', notes: null, created_by: 'demo', created_at: '', splits: [{ member_id: DEMO_MEMBER_ID, share: 300 }, { member_id: 'demo-m2', share: 300 }, { member_id: 'demo-m3', share: 300 }] },
    { id: 'demo-e2', household_id: H, paid_by: 'demo-m2', amount: 64.5, description: 'Weekly groceries', category: 'Groceries', expense_date: '2026-09-12', notes: null, created_by: null, created_at: '', splits: [{ member_id: DEMO_MEMBER_ID, share: 21.5 }, { member_id: 'demo-m2', share: 21.5 }, { member_id: 'demo-m3', share: 21.5 }] },
    { id: 'demo-e3', household_id: H, paid_by: 'demo-m3', amount: 45, description: 'Broadband', category: 'Utilities', expense_date: '2026-09-15', notes: null, created_by: null, created_at: '', splits: [{ member_id: DEMO_MEMBER_ID, share: 15 }, { member_id: 'demo-m2', share: 15 }, { member_id: 'demo-m3', share: 15 }] },
    { id: 'demo-e4', household_id: H, paid_by: DEMO_MEMBER_ID, amount: 30, description: 'Takeaway night', category: 'Dining', expense_date: '2026-09-17', notes: 'Sara and I only', created_by: 'demo', created_at: '', splits: [{ member_id: DEMO_MEMBER_ID, share: 15 }, { member_id: 'demo-m2', share: 15 }] },
  ],
  settlements: [
    { id: 'demo-s1', household_id: H, from_member: 'demo-m3', to_member: DEMO_MEMBER_ID, amount: 100, settled_on: '2026-09-10', note: 'Part of rent', created_by: null, created_at: '' },
  ],
}
