import { describe, expect, it } from 'vitest'
import { currencyForCountry, detectCountry, formatPaymentMethod, regionForCurrency } from './region'

describe('regionForCurrency', () => {
  it('keeps Bangladesh presets for BDT and global ones otherwise', () => {
    expect(regionForCurrency('BDT')).toBe('bd')
    expect(regionForCurrency('USD')).toBe('global')
    expect(regionForCurrency(undefined)).toBe('global')
  })
})

describe('detectCountry', () => {
  it('prefers the timezone — a student abroad keeps their home language', () => {
    expect(detectCountry(['en-BD'], 'Europe/London')).toBe('GB')
    expect(detectCountry(['bn-BD'], 'Asia/Dhaka')).toBe('BD')
  })

  it('falls back to the language region for unmapped timezones', () => {
    expect(detectCountry(['en-AU'], 'Australia/Perth')).toBe('AU')
  })

  it('treats unmapped American zones as the US', () => {
    expect(detectCountry(['en'], 'America/Chicago')).toBe('US')
  })

  it('returns null when nothing is known', () => {
    expect(detectCountry(['en'], 'Etc/UTC')).toBeNull()
  })
})

describe('currencyForCountry', () => {
  it('maps known countries and falls back to USD', () => {
    expect(currencyForCountry('BD')).toBe('BDT')
    expect(currencyForCountry('DE')).toBe('EUR')
    expect(currencyForCountry('ZZ')).toBe('USD')
    expect(currencyForCountry(null)).toBe('USD')
  })
})

describe('formatPaymentMethod', () => {
  it('drops the internal wallet prefix only', () => {
    expect(formatPaymentMethod('MFS - bKash')).toBe('bKash')
    expect(formatPaymentMethod('MFS - PayPal')).toBe('PayPal')
    expect(formatPaymentMethod('Bank Transfer')).toBe('Bank Transfer')
  })
})
