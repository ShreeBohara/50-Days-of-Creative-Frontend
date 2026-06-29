import { describe, expect, it } from 'vitest'
import { createRng, hashSeed, mulberry32, randInt, randRange } from './random'

describe('random', () => {
  it('is deterministic for a numeric seed', () => {
    const a = mulberry32(12345)
    const b = mulberry32(12345)
    const seqA = [a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('hashes equal strings to equal seeds and differs otherwise', () => {
    expect(hashSeed('rose-window')).toBe(hashSeed('rose-window'))
    expect(hashSeed('rose-window')).not.toBe(hashSeed('phase-beat'))
  })

  it('createRng accepts strings and numbers reproducibly', () => {
    const s1 = createRng('lissajous')
    const s2 = createRng('lissajous')
    expect([s1(), s1()]).toEqual([s2(), s2()])
  })

  it('randRange and randInt stay within bounds', () => {
    const rng = createRng('bounds')
    for (let i = 0; i < 200; i++) {
      const r = randRange(rng, -3, 5)
      expect(r).toBeGreaterThanOrEqual(-3)
      expect(r).toBeLessThanOrEqual(5)
      const n = randInt(rng, 2, 6)
      expect(n).toBeGreaterThanOrEqual(2)
      expect(n).toBeLessThanOrEqual(6)
      expect(Number.isInteger(n)).toBe(true)
    }
  })
})
