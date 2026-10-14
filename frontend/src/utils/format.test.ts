import { describe, expect, it } from 'vitest'
import { fmt } from './format'

// fmt() relies on Number#toLocaleString() with the runtime default locale.
// These expectations assume an en-US style locale (the default on CI / Node).
describe('fmt (Thai Baht currency)', () => {
  it('prefixes the amount with the ฿ symbol', () => {
    expect(fmt(100)).toBe('฿100')
  })

  it('formats zero as ฿0', () => {
    expect(fmt(0)).toBe('฿0')
  })

  it('does not add a thousands separator below 1,000', () => {
    expect(fmt(999)).toBe('฿999')
  })

  it('adds a thousands separator from 1,000 upward', () => {
    expect(fmt(1000)).toBe('฿1,000')
    expect(fmt(12500)).toBe('฿12,500')
  })

  it('groups large numbers every three digits', () => {
    expect(fmt(1234567)).toBe('฿1,234,567')
  })

  it('keeps decimals when present', () => {
    expect(fmt(1234.5)).toBe('฿1,234.5')
  })

  it('rounds to at most three decimal places (toLocaleString default)', () => {
    expect(fmt(1234.5678)).toBe('฿1,234.568')
  })

  it('puts the minus sign after the ฿ symbol for negative amounts', () => {
    // Documents current behavior: "฿-1,000", not "-฿1,000".
    expect(fmt(-1000)).toBe('฿-1,000')
  })

  it('returns a string', () => {
    expect(typeof fmt(1)).toBe('string')
  })
})
