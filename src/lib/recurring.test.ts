import { describe, it, expect } from 'vitest'
import { generateOccurrences, getDueOccurrences, getNextOccurrence } from '@/lib/recurring'

describe('generateOccurrences', () => {
  it('includes the anchor date itself when it falls in range', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-05', end_date: null }
    const occ = generateOccurrences(rule, new Date(2026, 0, 1), new Date(2026, 0, 31))
    expect(occ).toEqual(['2026-01-05'])
  })

  it('steps weekly by exactly 7 days, no month-boundary drift', () => {
    const rule = { cadence: 'Weekly' as const, start_date: '2026-01-01', end_date: null }
    const occ = generateOccurrences(rule, new Date(2026, 0, 1), new Date(2026, 1, 1))
    expect(occ).toEqual(['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29'])
  })

  it('clamps a Jan-31 monthly anchor to the last day of shorter months', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-31', end_date: null }
    const occ = generateOccurrences(rule, new Date(2026, 0, 1), new Date(2026, 3, 30))
    // Feb 2026 has 28 days, Mar has 31 (back to the 31st), Apr has 30
    expect(occ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('clamps a Feb-29 yearly anchor to Feb 28 on non-leap years', () => {
    // 2024 was a leap year; 2025-2027 are not
    const rule = { cadence: 'Yearly' as const, start_date: '2024-02-29', end_date: null }
    const occ = generateOccurrences(rule, new Date(2024, 0, 1), new Date(2027, 11, 31))
    expect(occ).toEqual(['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28'])
  })

  it('stops at end_date even if the range extends further', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-01', end_date: '2026-03-01' }
    const occ = generateOccurrences(rule, new Date(2026, 0, 1), new Date(2026, 11, 31))
    expect(occ).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })

  it('returns nothing for a range entirely before start_date', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-06-01', end_date: null }
    const occ = generateOccurrences(rule, new Date(2026, 0, 1), new Date(2026, 2, 31))
    expect(occ).toEqual([])
  })
})

describe('getDueOccurrences', () => {
  it('with no history yet, everything from start_date through today is due', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-01', end_date: null, last_materialized_date: null }
    const due = getDueOccurrences(rule, new Date(2026, 2, 15)) // Mar 15
    expect(due).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })

  it('resumes the day after last_materialized_date, not from start_date', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-01', end_date: null, last_materialized_date: '2026-02-01' }
    const due = getDueOccurrences(rule, new Date(2026, 3, 1)) // Apr 1
    expect(due).toEqual(['2026-03-01', '2026-04-01'])
  })

  it('is empty once fully caught up', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-01', end_date: null, last_materialized_date: '2026-03-01' }
    const due = getDueOccurrences(rule, new Date(2026, 2, 15)) // Mar 15, nothing new due until Apr 1
    expect(due).toEqual([])
  })
})

describe('getNextOccurrence', () => {
  it('finds the first occurrence strictly after the given date', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-01', end_date: null }
    expect(getNextOccurrence(rule, new Date(2026, 2, 15))).toBe('2026-04-01')
  })

  it('returns null once past end_date', () => {
    const rule = { cadence: 'Monthly' as const, start_date: '2026-01-01', end_date: '2026-02-01' }
    expect(getNextOccurrence(rule, new Date(2026, 2, 1))).toBeNull()
  })
})
