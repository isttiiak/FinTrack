import { parseDate, toISODateString } from '@/lib/utils'
import type { RecurringCadence } from '@/lib/constants'

export interface RecurringOccurrenceInput {
  cadence: RecurringCadence
  start_date: string
  end_date: string | null
}

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

// The k-th occurrence after start_date (k=0 is start_date itself). Monthly
// and Yearly clamp to the last day of the target month when the anchor day
// doesn't exist there (e.g. a Jan 31 rule's Feb occurrence lands on Feb 28)
// instead of letting `Date` roll over into the following month.
function addCadence(start: Date, cadence: RecurringCadence, k: number): Date {
  if (cadence === 'Weekly') {
    const d = new Date(start)
    d.setDate(d.getDate() + 7 * k)
    return d
  }
  if (cadence === 'Monthly') {
    const totalMonths = start.getMonth() + k
    const year = start.getFullYear() + Math.floor(totalMonths / 12)
    const month = ((totalMonths % 12) + 12) % 12
    return new Date(year, month, Math.min(start.getDate(), daysInMonth(year, month)))
  }
  // Yearly
  const year = start.getFullYear() + k
  const month = start.getMonth()
  return new Date(year, month, Math.min(start.getDate(), daysInMonth(year, month)))
}

// Safety bound on the occurrence walk below — comfortably covers decades of
// weekly billing (the shortest cadence) without risking a runaway loop.
const MAX_OCCURRENCES = 2000

// Every calendar occurrence of `rule` that falls within [rangeStart, rangeEnd]
// (inclusive), also clamped to the rule's own start_date/end_date.
export function generateOccurrences(
  rule: RecurringOccurrenceInput,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const start = parseDate(rule.start_date)
  const end = rule.end_date ? parseDate(rule.end_date) : null
  const occurrences: string[] = []

  for (let k = 0; k < MAX_OCCURRENCES; k++) {
    const date = addCadence(start, rule.cadence, k)
    if (date > rangeEnd) break
    if (end && date > end) break
    if (date >= rangeStart && date >= start) occurrences.push(toISODateString(date))
  }
  return occurrences
}

// Occurrences due for materialization: everything after the last
// materialized date (or from start_date, if never materialized) up through
// `today`. This is what "3 recurring transactions added" is built from.
export function getDueOccurrences(
  rule: RecurringOccurrenceInput & { last_materialized_date: string | null },
  today: Date,
): string[] {
  const start = parseDate(rule.start_date)
  const from = rule.last_materialized_date
    ? addDays(parseDate(rule.last_materialized_date), 1)
    : start
  return generateOccurrences(rule, from, today)
}

// First occurrence strictly after `after` — used for "Next: Oct 1" display
// and doesn't need last_materialized_date, just the rule's own schedule.
export function getNextOccurrence(rule: RecurringOccurrenceInput, after: Date): string | null {
  const start = parseDate(rule.start_date)
  const end = rule.end_date ? parseDate(rule.end_date) : null
  for (let k = 0; k < MAX_OCCURRENCES; k++) {
    const date = addCadence(start, rule.cadence, k)
    if (end && date > end) return null
    if (date > after) return toISODateString(date)
  }
  return null
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}
