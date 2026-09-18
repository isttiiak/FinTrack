import type { HouseholdSettlement, SharedExpense } from '@/types/household.types'

// Like formatCurrency, but shows two decimals whenever the amount has cents —
// splits routinely produce values like 64.5 or 33.34, and "£64.5" reads wrong.
export function formatMoney(amount: number, currency: string): string {
  const digits = Number.isInteger(amount) ? 0 : 2
  if (currency === 'BDT') {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: 2 }).format(amount)
}

// All arithmetic is done in integer cents so shares always add up exactly and
// balances across many expenses never drift by a fraction.
const toCents = (n: number) => Math.round(n * 100)
const fromCents = (c: number) => c / 100

// Splits `amount` equally across `count` people. Any leftover cents go to the
// first people (one each), so the shares always sum to exactly `amount` —
// 100 across 3 is 33.34 / 33.33 / 33.33, not three 33.33s that lose a cent.
export function splitEqual(amount: number, count: number): number[] {
  if (count <= 0) return []
  const total = toCents(amount)
  const base = Math.floor(total / count)
  const extra = total - base * count
  return Array.from({ length: count }, (_, i) => fromCents(base + (i < extra ? 1 : 0)))
}

// Net position per member id. Positive = the group owes them; negative = they
// owe the group. Everyone's balances sum to zero.
export function computeBalances(
  memberIds: string[],
  expenses: Pick<SharedExpense, 'paid_by' | 'amount' | 'splits'>[],
  settlements: Pick<HouseholdSettlement, 'from_member' | 'to_member' | 'amount'>[],
): Map<string, number> {
  const cents = new Map<string, number>(memberIds.map((id) => [id, 0]))
  const add = (id: string, c: number) => cents.set(id, (cents.get(id) ?? 0) + c)

  for (const e of expenses) {
    add(e.paid_by, toCents(e.amount))
    for (const s of e.splits) add(s.member_id, -toCents(s.share))
  }
  // Someone paying a settlement reduces what they owe (or increases what
  // they're owed back); the receiver's position moves the opposite way.
  for (const s of settlements) {
    add(s.from_member, toCents(s.amount))
    add(s.to_member, -toCents(s.amount))
  }
  return new Map([...cents].map(([id, c]) => [id, fromCents(c)]))
}

export interface SuggestedTransfer {
  from: string
  to: string
  amount: number
}

// The fewest payments that clear everyone: repeatedly match the biggest
// debtor with the biggest creditor. Not always the mathematical minimum, but
// at household scale it is, and it's easy to explain.
export function suggestSettlements(balances: Map<string, number>): SuggestedTransfer[] {
  const debtors: { id: string; c: number }[] = []
  const creditors: { id: string; c: number }[] = []
  for (const [id, b] of balances) {
    const c = toCents(b)
    if (c < 0) debtors.push({ id, c: -c })
    else if (c > 0) creditors.push({ id, c })
  }
  const byBiggest = (a: { c: number }, b: { c: number }) => b.c - a.c
  debtors.sort(byBiggest)
  creditors.sort(byBiggest)

  const out: SuggestedTransfer[] = []
  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const pay = Math.min(debtors[d].c, creditors[c].c)
    out.push({ from: debtors[d].id, to: creditors[c].id, amount: fromCents(pay) })
    debtors[d].c -= pay
    creditors[c].c -= pay
    if (debtors[d].c === 0) d++
    if (creditors[c].c === 0) c++
  }
  return out
}

export type MyPosition =
  | { kind: 'lent'; amount: number }      // I paid; others owe me this much
  | { kind: 'borrowed'; amount: number }  // someone else paid; I owe this much
  | { kind: 'none' }                      // I'm not involved / paid only for myself

// What one expense means for me, in one line: the whole point of the list view
// is that nobody has to read a full split table to know where they stand.
export function positionOn(
  expense: Pick<SharedExpense, 'paid_by' | 'amount' | 'splits'>,
  meId: string | null,
): MyPosition {
  if (!meId) return { kind: 'none' }
  const myShare = toCents(expense.splits.find((s) => s.member_id === meId)?.share ?? 0)
  if (expense.paid_by === meId) {
    const others = toCents(expense.amount) - myShare
    return others > 0 ? { kind: 'lent', amount: fromCents(others) } : { kind: 'none' }
  }
  return myShare > 0 ? { kind: 'borrowed', amount: fromCents(myShare) } : { kind: 'none' }
}
