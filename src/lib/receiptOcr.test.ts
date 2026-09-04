import { describe, it, expect } from 'vitest'
import { parseReceiptExtraction, buildReceiptUserPrompt } from '@/lib/receiptOcr'

describe('parseReceiptExtraction', () => {
  it('parses a clean JSON response', () => {
    const raw = '{"merchant":"Agora","amount":450.5,"date":"2026-09-04","categoryGuess":"Food","lineItems":["Rice","Eggs"]}'
    expect(parseReceiptExtraction(raw)).toEqual({
      merchant: 'Agora',
      amount: 450.5,
      date: '2026-09-04',
      categoryGuess: 'Food',
      lineItems: ['Rice', 'Eggs'],
    })
  })

  it('strips a markdown code fence around the JSON', () => {
    const raw = '```json\n{"merchant":"Shwapno","amount":1200,"date":"2026-09-01","categoryGuess":null,"lineItems":[]}\n```'
    const result = parseReceiptExtraction(raw)
    expect(result.merchant).toBe('Shwapno')
    expect(result.amount).toBe(1200)
  })

  it('ignores commentary the model adds before/after the JSON object', () => {
    const raw = 'Here is the receipt data:\n{"merchant":"Cafe","amount":300,"date":"2026-08-20","categoryGuess":"Coffee","lineItems":[]}\nLet me know if you need anything else.'
    const result = parseReceiptExtraction(raw)
    expect(result.merchant).toBe('Cafe')
    expect(result.amount).toBe(300)
  })

  it('rounds amount to 2 decimal places via round2', () => {
    const raw = '{"merchant":"X","amount":99.999,"date":null,"categoryGuess":null,"lineItems":[]}'
    expect(parseReceiptExtraction(raw).amount).toBe(100)
  })

  it('treats a non-positive amount as unreadable (null)', () => {
    const raw = '{"merchant":"X","amount":0,"date":"2026-01-01","categoryGuess":null,"lineItems":[]}'
    expect(parseReceiptExtraction(raw).amount).toBeNull()
  })

  it('rejects a malformed date instead of passing it through', () => {
    const raw = '{"merchant":"X","amount":50,"date":"04/09/2026","categoryGuess":null,"lineItems":[]}'
    expect(parseReceiptExtraction(raw).date).toBeNull()
  })

  it('filters non-string entries out of lineItems', () => {
    const raw = '{"merchant":"X","amount":50,"date":null,"categoryGuess":null,"lineItems":["Bread",42,null,"Milk"]}'
    expect(parseReceiptExtraction(raw).lineItems).toEqual(['Bread', 'Milk'])
  })

  it('throws a friendly error when no JSON object is present', () => {
    expect(() => parseReceiptExtraction('sorry, I cannot read this image')).toThrow(/couldn't read/i)
  })

  it('throws a friendly error when the JSON is malformed', () => {
    expect(() => parseReceiptExtraction('{merchant: "X", amount: }')).toThrow(/couldn't read/i)
  })

  it('throws when every field comes back empty (nothing usable extracted)', () => {
    const raw = '{"merchant":null,"amount":null,"date":null,"categoryGuess":null,"lineItems":[]}'
    expect(() => parseReceiptExtraction(raw)).toThrow(/couldn't find/i)
  })
})

describe('buildReceiptUserPrompt', () => {
  it('includes the given date', () => {
    expect(buildReceiptUserPrompt('2026-09-04')).toContain('2026-09-04')
  })
})
