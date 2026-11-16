import { describe, it, expect } from 'vitest'
import {
  round2, parseDate, getCurrentMonthRange, toISODateString, resolveDateRange, isSafeHttpUrl,
  formatCurrency, getActiveCurrencySymbol, setActiveCurrency,
} from '@/lib/utils'
import { sanitizeSpreadsheetCell } from '@/lib/export'

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

describe('resolveDateRange', () => {
  it('defaults to the current month when no filters or omitted bounds are given', () => {
    const month = getCurrentMonthRange()
    expect(resolveDateRange()).toEqual(month)
    expect(resolveDateRange({})).toEqual(month)
  })

  it('treats an explicit null as an intentionally unbounded side', () => {
    const month = getCurrentMonthRange()
    expect(resolveDateRange({ from: null, to: null })).toEqual({ from: null, to: null })
    expect(resolveDateRange({ from: '2026-01-01', to: null })).toEqual({ from: '2026-01-01', to: null })
    expect(resolveDateRange({ from: null })).toEqual({ from: null, to: month.to })
  })

  it('defaults each side independently', () => {
    const month = getCurrentMonthRange()
    expect(resolveDateRange({ from: '2026-02-01' })).toEqual({ from: '2026-02-01', to: month.to })
  })
})

describe('isSafeHttpUrl', () => {
  it('accepts valid http and https URLs', () => {
    expect(isSafeHttpUrl('https://example.com/doc.pdf')).toBe(true)
    expect(isSafeHttpUrl('http://localhost:3000/test')).toBe(true)
    expect(isSafeHttpUrl('  https://drive.google.com/file/d/123  ')).toBe(true)
  })

  it('rejects javascript:, data:, vbscript:, and invalid or empty values', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('JAVASCRIPT:alert(document.domain)')).toBe(false)
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeHttpUrl('vbscript:msgbox(1)')).toBe(false)
    expect(isSafeHttpUrl('not a url')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
    expect(isSafeHttpUrl(null)).toBe(false)
    expect(isSafeHttpUrl(undefined)).toBe(false)
  })
})

describe('sanitizeSpreadsheetCell', () => {
  it('prefixes formula-triggering leading characters with a single quote', () => {
    expect(sanitizeSpreadsheetCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(sanitizeSpreadsheetCell('+cmd|"/c calc"!A0')).toBe("'+cmd|\"/c calc\"!A0")
    expect(sanitizeSpreadsheetCell('-1+1')).toBe("'-1+1")
    expect(sanitizeSpreadsheetCell('@SUM(1,2)')).toBe("'@SUM(1,2)")
    expect(sanitizeSpreadsheetCell('\tcmd')).toBe("'\tcmd")
    expect(sanitizeSpreadsheetCell('\rcmd')).toBe("'\rcmd")
  })

  it('leaves safe text unchanged', () => {
    expect(sanitizeSpreadsheetCell('Lunch at cafe')).toBe('Lunch at cafe')
    expect(sanitizeSpreadsheetCell('100.50')).toBe('100.50')
    expect(sanitizeSpreadsheetCell('')).toBe('')
  })
})

describe('formatCurrency & active currency', () => {
  it('uses active currency when currency argument is omitted', () => {
    setActiveCurrency('USD')
    try {
      expect(formatCurrency(1250)).toBe('$1,250')
      expect(getActiveCurrencySymbol()).toBe('$')
    } finally {
      setActiveCurrency('BDT')
    }
    expect(formatCurrency(1250)).toBe('৳1,250')
    expect(getActiveCurrencySymbol()).toBe('৳')
  })
})
