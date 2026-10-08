// Pure maths behind the Investments analytics views — kept out of the
// components so it can be unit-tested (investmentAnalytics.test.ts).
import { parseDate, round2 } from './utils'
import type { Investment } from '@/types/investment.types'

export interface Cashflow {
  date: string    // YYYY-MM-DD
  amount: number  // negative = money in (you paid), positive = money back to you
}

const MS_PER_DAY = 86_400_000

// Whole days between two date-only strings, DST-safe (UTC day numbers).
export function daysBetween(from: string, to: string): number {
  const a = parseDate(from), b = parseDate(to)
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / MS_PER_DAY)
}

// ── XIRR ──────────────────────────────────────────────────────────────────
// The annual rate r at which the dated cashflows' net present value is zero.
// Unlike plain ROI it accounts for *when* money went in and came out, so a
// 3-year FD and a 3-month one with the same profit no longer look the same.
// Returns null when there's no answer (all flows one sign, or no root found).
export function xirr(flows: Cashflow[]): number | null {
  const nonZero = flows.filter((f) => f.amount !== 0)
  if (!nonZero.some((f) => f.amount < 0) || !nonZero.some((f) => f.amount > 0)) return null

  const t0 = nonZero.reduce((min, f) => (f.date < min ? f.date : min), nonZero[0].date)
  const years = nonZero.map((f) => daysBetween(t0, f.date) / 365)
  const npv = (r: number) => nonZero.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, years[i]), 0)
  const dNpv = (r: number) => nonZero.reduce((s, f, i) => s - (years[i] * f.amount) / Math.pow(1 + r, years[i] + 1), 0)

  // Newton from 10%, which converges in a handful of steps for normal data…
  let r = 0.1
  for (let i = 0; i < 50; i++) {
    const v = npv(r), d = dNpv(r)
    if (!isFinite(v) || !isFinite(d) || d === 0) break
    const next = r - v / d
    if (next <= -0.9999) break
    if (Math.abs(next - r) < 1e-9) return next
    r = next
  }

  // …otherwise fall back to bisection over a wide bracket.
  let lo = -0.9999, hi = 100
  let fLo = npv(lo)
  if (fLo * npv(hi) > 0) return null
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-7) return mid
    if (fLo * fMid < 0) hi = mid
    else { lo = mid; fLo = fMid }
  }
  return (lo + hi) / 2
}

// An investment's money in and out. Installment payments are the money in;
// if none were logged (common for older entries), the committed amount on the
// start date stands in for them. A current market value counts as if
// cashed out today.
export function investmentCashflows(inv: Investment, today: string): Cashflow[] {
  const flows: Cashflow[] = []
  const payments = inv.payments ?? []
  if (payments.length > 0) {
    for (const p of payments) flows.push({ date: p.payment_date, amount: -p.amount })
  } else if (inv.committed_amount && inv.start_date) {
    flows.push({ date: inv.start_date, amount: -inv.committed_amount })
  }
  for (const r of inv.returns ?? []) flows.push({ date: r.return_date, amount: r.amount })
  if (inv.market_value != null && inv.market_value > 0) flows.push({ date: today, amount: inv.market_value })
  return flows
}

// Annualised return needs a meaningful amount of history — over a few weeks
// one return compounds into an absurd yearly rate.
export const MIN_DAYS_FOR_ANNUALISED = 90

export function annualisedReturn(inv: Investment, today: string): number | null {
  const flows = investmentCashflows(inv, today)
  if (flows.length < 2) return null
  const dates = flows.map((f) => f.date).sort()
  if (daysBetween(dates[0], dates[dates.length - 1]) < MIN_DAYS_FOR_ANNUALISED) return null
  return xirr(flows)
}

// Total and yearly return for display, with a plain reason when either can't
// be worked out. Unlike the stored roi_percent (cash returned vs committed,
// which reads -100% for an FD that simply hasn't paid out yet), both include
// the current valuation — so they need one, or the money to have come back.
export interface ReturnSummary {
  total: number | null     // e.g. 0.22 = +22% overall
  annual: number | null    // XIRR
  note: string | null      // why a figure is missing
}

export function returnSummary(inv: Investment, today: string): ReturnSummary {
  const flows = investmentCashflows(inv, today)
  const paidIn = -flows.filter((f) => f.amount < 0).reduce((s, f) => s + f.amount, 0)
  const back = flows.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0)
  if (paidIn <= 0) return { total: null, annual: null, note: 'No money paid in yet' }
  if (inv.market_value == null) {
    return { total: null, annual: null, note: 'Add a current value to include it' }
  }
  const total = (back - paidIn) / paidIn
  const annual = annualisedReturn(inv, today)
  return { total, annual, note: annual == null ? `Under ${MIN_DAYS_FOR_ANNUALISED / 30} months of history` : null }
}

// ── Allocation ────────────────────────────────────────────────────────────
// What each investment is "worth" for the allocation donut: its current
// valuation if one is entered, otherwise the money actually put in, otherwise
// what was committed.
export function allocationValue(inv: Investment): number {
  if (inv.market_value != null) return inv.market_value
  if ((inv.total_paid ?? 0) > 0) return inv.total_paid ?? 0
  return inv.committed_amount ?? 0
}

export function allocationByCategory(investments: Investment[]): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const inv of investments) {
    const v = allocationValue(inv)
    if (v <= 0) continue
    const key = inv.category ?? 'Uncategorised'
    map.set(key, round2((map.get(key) ?? 0) + v))
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

// ── Maturity calendar ─────────────────────────────────────────────────────
export type MaturityStatus = 'matured' | 'soon' | 'later'
export const MATURITY_SOON_DAYS = 30

export interface MaturityItem {
  investment: Investment
  endDate: string
  daysLeft: number
  status: MaturityStatus
}

export function maturitySchedule(investments: Investment[], today: string): MaturityItem[] {
  return investments
    .filter((inv): inv is Investment & { end_date: string } => !!inv.end_date)
    .map((inv) => {
      const daysLeft = daysBetween(today, inv.end_date)
      const status: MaturityStatus = daysLeft < 0 ? 'matured' : daysLeft <= MATURITY_SOON_DAYS ? 'soon' : 'later'
      return { investment: inv, endDate: inv.end_date, daysLeft, status }
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
}

// ── Returns over time ─────────────────────────────────────────────────────
// Running totals of money paid in and money returned, one point per date that
// had activity — the detail page's line chart.
export function cumulativeSeries(inv: Investment): { date: string; paid: number; returned: number }[] {
  const byDate = new Map<string, { paid: number; returned: number }>()
  const add = (date: string, paid: number, returned: number) => {
    const cur = byDate.get(date) ?? { paid: 0, returned: 0 }
    byDate.set(date, { paid: cur.paid + paid, returned: cur.returned + returned })
  }
  for (const p of inv.payments ?? []) add(p.payment_date, p.amount, 0)
  for (const r of inv.returns ?? []) add(r.return_date, 0, r.amount)

  let paid = 0, returned = 0
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      paid = round2(paid + d.paid)
      returned = round2(returned + d.returned)
      return { date, paid, returned }
    })
}
