import { describe, it, expect } from 'vitest'
import { evaluate, hasOperator } from '@/lib/calculator'

describe('evaluate', () => {
  it('parses a plain number', () => {
    expect(evaluate('42')).toEqual({ ok: true, value: 42 })
  })

  it('handles decimals starting with a dot', () => {
    expect(evaluate('.5')).toEqual({ ok: true, value: 0.5 })
  })

  it('respects operator precedence', () => {
    expect(evaluate('2+3*4')).toEqual({ ok: true, value: 14 })
  })

  it('respects parentheses', () => {
    expect(evaluate('(2+3)*4')).toEqual({ ok: true, value: 20 })
  })

  it('supports the inline-expression case from the SmartAmountInput UX (60*4)', () => {
    expect(evaluate('60*4')).toEqual({ ok: true, value: 240 })
  })

  it('applies unary minus', () => {
    expect(evaluate('-5+10')).toEqual({ ok: true, value: 5 })
  })

  it('treats % as divide-by-100, not "percent of" (TODO.md §3.10 — documented, intentional)', () => {
    expect(evaluate('1000+15%')).toEqual({ ok: true, value: 1000.15 })
  })

  it('accepts the × and ÷ operator-chip glyphs as aliases', () => {
    expect(evaluate('6×7')).toEqual({ ok: true, value: 42 })
    expect(evaluate('20÷4')).toEqual({ ok: true, value: 5 })
  })

  it('rejects empty input', () => {
    expect(evaluate('')).toEqual({ ok: false, reason: 'empty' })
    expect(evaluate('   ')).toEqual({ ok: false, reason: 'empty' })
  })

  it('rejects division by zero', () => {
    expect(evaluate('5/0')).toEqual({ ok: false, reason: 'div-by-zero' })
  })

  it('rejects malformed input', () => {
    expect(evaluate('2+')).toEqual({ ok: false, reason: 'invalid' })
    expect(evaluate('2 3')).toEqual({ ok: false, reason: 'invalid' })
    expect(evaluate('abc')).toEqual({ ok: false, reason: 'invalid' })
    expect(evaluate('(2+3')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('rejects input over the max length', () => {
    expect(evaluate('1'.repeat(65))).toEqual({ ok: false, reason: 'invalid' })
  })
})

describe('hasOperator', () => {
  it('detects any binary/postfix operator, including the chip glyphs', () => {
    expect(hasOperator('60*4')).toBe(true)
    expect(hasOperator('1000+15%')).toBe(true)
    expect(hasOperator('6×7')).toBe(true)
    expect(hasOperator('1500')).toBe(false)
  })
})
