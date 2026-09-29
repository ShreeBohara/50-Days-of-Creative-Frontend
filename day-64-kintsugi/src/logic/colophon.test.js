import { describe, it, expect } from 'vitest'
import { formatColophon, formatDate, piecesPhrase, goldMillimetres, shelfLabel } from './colophon.js'

// Local-time constructor, so the expected clock reading holds in
// whatever timezone the tests run.
const WHEN = new Date(2026, 8, 28, 19, 42, 31)

describe('formatColophon', () => {
  it('matches the reference line', () => {
    expect(formatColophon({ pieces: 23, goldMm: 611.4, date: WHEN })).toBe(
      '23 pieces · 611 mm of gold · 28 Sep 2026 · 19:42',
    )
  })

  it('says "a hairline" for a one-piece bowl, "1 piece" when forced', () => {
    expect(formatColophon({ pieces: 1, goldMm: 38, date: WHEN })).toBe(
      'a hairline · 38 mm of gold · 28 Sep 2026 · 19:42',
    )
    expect(formatColophon({ pieces: 1, goldMm: 38, date: WHEN, hairline: false })).toMatch(/^1 piece · /)
  })

  it('rounds gold to whole millimetres and never goes negative', () => {
    expect(formatColophon({ pieces: 2, goldMm: 0.49, date: WHEN })).toMatch(/ 0 mm of gold/)
    expect(formatColophon({ pieces: 2, goldMm: 99.5, date: WHEN })).toMatch(/ 100 mm of gold/)
    expect(formatColophon({ pieces: 2, goldMm: -3, date: WHEN })).toMatch(/ 0 mm of gold/)
    expect(formatColophon({ pieces: 2, goldMm: NaN, date: WHEN })).toMatch(/ 0 mm of gold/)
  })

  it('accepts a timestamp and omits an invalid date', () => {
    expect(formatColophon({ pieces: 4, goldMm: 1, date: WHEN.getTime() })).toMatch(/28 Sep 2026 · 19:42$/)
    expect(formatColophon({ pieces: 4, goldMm: 1, date: new Date('x') })).toBe('4 pieces · 1 mm of gold')
  })
})

describe('formatDate', () => {
  it('uses English month abbreviations and a padded 24h clock', () => {
    expect(formatDate(new Date(2026, 0, 5, 7, 3))).toBe('5 Jan 2026 · 07:03')
    expect(formatDate(new Date(2026, 11, 31, 23, 59))).toBe('31 Dec 2026 · 23:59')
    expect(formatDate(new Date(2027, 4, 1, 0, 0))).toBe('1 May 2027 · 00:00')
  })
})

describe('piecesPhrase', () => {
  it('pluralises and sanitises', () => {
    expect(piecesPhrase(2)).toBe('2 pieces')
    expect(piecesPhrase(1)).toBe('a hairline')
    expect(piecesPhrase(1, false)).toBe('1 piece')
    expect(piecesPhrase(7, true)).toBe('7 pieces')
    expect(piecesPhrase(0)).toBe('1 piece')
    expect(piecesPhrase(NaN)).toBe('1 piece')
    // The hairline default follows the rounded count, not the raw number.
    expect(piecesPhrase(1.2)).toBe('a hairline')
    expect(piecesPhrase(1.2, false)).toBe('1 piece')
  })

  it('formatColophon survives a missing argument', () => {
    expect(formatColophon()).toMatch(/^1 piece · 0 mm of gold · \d{1,2} [A-Z][a-z]{2} \d{4} · \d{2}:\d{2}$/)
  })
})

describe('goldMillimetres', () => {
  const seams = [{ length: 0.1 }, { length: 0.05 }, { length: 0.2 }]

  it('sums length × coverage in millimetres', () => {
    expect(goldMillimetres(seams, [1, 0.5, 0])).toBeCloseTo(125, 9)
    expect(goldMillimetres(seams, new Float32Array([1, 1, 1]))).toBeCloseTo(350, 4)
  })

  it('clamps coverage and skips missing entries', () => {
    expect(goldMillimetres(seams, [2, -1, NaN])).toBeCloseTo(100, 9)
    expect(goldMillimetres(seams, [1])).toBeCloseTo(100, 9)
    expect(goldMillimetres(seams, undefined)).toBe(0)
    expect(goldMillimetres([], [1])).toBe(0)
  })
})

describe('shelfLabel', () => {
  it('names the owner', () => {
    expect(shelfLabel({ variant: 0 }, true)).toBe('a bowl from a friend')
    expect(shelfLabel({ variant: 0 }, false)).toBe('your bowl')
    expect(shelfLabel({ friend: true })).toBe('a bowl from a friend')
    expect(shelfLabel(null)).toBe('your bowl')
  })
})
