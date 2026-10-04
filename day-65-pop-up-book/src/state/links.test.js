import { describe, expect, it } from 'vitest'
import { hashFor, parseHash } from './links.js'
import { SPREADS } from '../spreads/index.js'

describe('deep links', () => {
  it('round-trips every spread', () => {
    SPREADS.forEach((s, k) => expect(parseHash(hashFor(k))).toEqual({ spread: k }))
  })

  it('opens a day in its own chapter', () => {
    expect(parseHash('#day-18')).toEqual({ spread: 1, day: 18 })
    expect(parseHash('#day64')).toEqual({ spread: 9, day: 64 })
    expect(parseHash('#DAY-03')).toEqual({ spread: 1, day: 3 })
  })

  it('ignores anything else', () => {
    for (const h of ['', '#', '#day-65', '#day-0', '#nope', '#day-123', '#%E0%A4%A', '#day-1%']) expect(parseHash(h)).toBe(null)
    expect(hashFor(-1)).toBe('')
  })
})
