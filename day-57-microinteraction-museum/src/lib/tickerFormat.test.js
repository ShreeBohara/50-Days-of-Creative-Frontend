import { describe, expect, it } from 'vitest'
import {
  TICKER_MAX_CENTS,
  TICKER_MIN_CENTS,
  formatCurrencyCents,
  randomCurrencyCents,
  tokenizeCurrency,
} from './tickerFormat.js'

describe('formatCurrencyCents', () => {
  it('formats the initial and boundary values as USD', () => {
    expect(formatCurrencyCents(1_248_620)).toBe('$12,486.20')
    expect(formatCurrencyCents(TICKER_MIN_CENTS)).toBe('$48.00')
    expect(formatCurrencyCents(TICKER_MAX_CENTS)).toBe('$1,250,000.99')
  })
})

describe('randomCurrencyCents', () => {
  it('maps deterministic samples to the inclusive range', () => {
    expect(randomCurrencyCents(() => 0)).toBe(TICKER_MIN_CENTS)
    expect(randomCurrencyCents(() => 1)).toBe(TICKER_MAX_CENTS)
    expect(randomCurrencyCents(() => 0.5)).toBeGreaterThan(TICKER_MIN_CENTS)
  })
})

describe('tokenizeCurrency', () => {
  it('keeps digit identities stable from the right edge', () => {
    const shortValue = tokenizeCurrency(4_800)
    const longValue = tokenizeCurrency(125_000_099)

    expect(shortValue.tokens.filter(({ type }) => type === 'digit').map(({ id }) => id))
      .toEqual(['digit-3', 'digit-2', 'digit-1', 'digit-0'])
    expect(longValue.tokens.filter(({ type }) => type === 'digit').at(-1).id).toBe('digit-0')
    expect(longValue.tokens.filter(({ type }) => type === 'digit').at(-3).id).toBe('digit-2')
  })

  it('gives commas stable identities based on digits to their right', () => {
    const { tokens } = tokenizeCurrency(125_000_099)
    expect(tokens.filter(({ type }) => type === 'separator').map(({ id }) => id))
      .toEqual(['comma-8', 'comma-5'])
  })
})
