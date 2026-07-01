import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'BDT'): string {
  if (currency === 'BDT') {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Date-only strings (e.g. "2026-07-01") must be parsed as local-time y/m/d
// components — passing them straight to `new Date(...)` parses as UTC
// midnight, which then renders as the previous day for any UTC+ timezone
// (including Asia/Dhaka, this app's default).
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function parseDate(date: string | Date): Date {
  if (date instanceof Date) return date
  if (DATE_ONLY_RE.test(date)) {
    const [y, m, d] = date.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(date)
}

export function formatDate(date: string | Date): string {
  const d = parseDate(date)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(date: string | Date): string {
  const d = parseDate(date)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function formatDateLabel(date: string | Date): string {
  const d = parseDate(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, yesterday)) return 'Yesterday'
  return formatDate(d)
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(d)
}

export function toISODateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toISODateString(from), to: toISODateString(to) }
}

// Rounds to 2 decimals, guarding against float drift when summing many
// money values (e.g. across a person's lend/debt entries and payments).
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
