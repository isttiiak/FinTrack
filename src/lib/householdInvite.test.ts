import { describe, expect, it } from 'vitest'
import { normalizeInviteCode } from './householdInvite'

describe('normalizeInviteCode', () => {
  it('lower-cases and trims a typed code', () => {
    expect(normalizeInviteCode('  A1b2C3d4e5 ')).toBe('a1b2c3d4e5')
  })

  it('pulls the code out of a pasted invite link', () => {
    expect(normalizeInviteCode('https://example.com/household?join=a1b2c3d4e5')).toBe('a1b2c3d4e5')
    expect(normalizeInviteCode('https://example.com/household?x=1&join=A1B2#top')).toBe('a1b2')
  })

  it('drops stray punctuation from copy-paste', () => {
    expect(normalizeInviteCode('"a1b2c3d4e5".')).toBe('a1b2c3d4e5')
  })

  it('returns empty for blank input', () => {
    expect(normalizeInviteCode('   ')).toBe('')
  })
})
