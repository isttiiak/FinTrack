import { describe, it, expect } from 'vitest'
import { round2, parseDate, getCurrentMonthRange, toISODateString } from '@/lib/utils'

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(1.004)).toBe(1)
  })

  it('guards against float drift when summing many money values', () => {
    // Classic float trap: 0.1 + 0.2 !== 0.3 in raw JS
    const sum = [0.1, 0.2].reduce((s, n) => s + n, 0)
    expect(sum).not.toBe(0.3)
    expect(round2(sum)).toBe(0.3)
  })

  it('is a no-op on already-clean values', () => {
    expect(round2(100)).toBe(100)
    expect(round2(0)).toBe(0)
  })
})

describe('parseDate', () => {
  it('parses a date-only string (YYYY-MM-DD) as local time, not UTC', () => {
    // The bug this guards: `new Date('2026-07-01')` parses as UTC midnight,
    // which renders as 2026-06-30 in any UTC+ timezone (incl. Asia/Dhaka).
    const d = parseDate('2026-07-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6) // 0-indexed: July
    expect(d.getDate()).toBe(1)
  })

  it('passes a Date instance through unchanged', () => {
    const original = new Date(2026, 5, 15)
    expect(parseDate(original)).toBe(original)
  })

  it('falls back to native parsing for non-date-only strings', () => {
    const d = parseDate('2026-07-01T10:30:00Z')
    expect(d.getTime()).toBe(new Date('2026-07-01T10:30:00Z').getTime())
  })
})

describe('getCurrentMonthRange', () => {
  it('returns the first and last day of the current month as YYYY-MM-DD', () => {
    const { from, to } = getCurrentMonthRange()
    const now = new Date()
    const expectedFrom = toISODateString(new Date(now.getFullYear(), now.getMonth(), 1))
    const expectedTo = toISODateString(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    expect(from).toBe(expectedFrom)
    expect(to).toBe(expectedTo)
  })
})

describe('toISODateString', () => {
  it('formats a Date as YYYY-MM-DD using local components', () => {
    expect(toISODateString(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODateString(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})
