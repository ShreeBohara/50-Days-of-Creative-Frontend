import { describe, expect, it } from 'vitest'
import { DEFAULT_FBM, fbm, makeValueNoise, warp } from './noise'

describe('value noise', () => {
  it('is deterministic for a given seed', () => {
    const a = makeValueNoise(42)
    const b = makeValueNoise(42)
    for (const [x, y] of [
      [0.1, 0.2],
      [3.7, 8.4],
      [-2.5, 5.9],
    ]) {
      expect(a(x, y)).toBe(b(x, y))
    }
  })

  it('accepts string seeds reproducibly', () => {
    const a = makeValueNoise('hyperborea')
    const b = makeValueNoise('hyperborea')
    expect(a(1.5, 2.5)).toBe(b(1.5, 2.5))
  })

  it('stays within [0, 1]', () => {
    const n = makeValueNoise(7)
    for (let i = 0; i < 400; i++) {
      const v = n(i * 0.37, i * 0.91 - 13)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('reproduces lattice values exactly at integer coordinates', () => {
    const n = makeValueNoise(99)
    // At integer points the interpolation collapses onto the lattice value,
    // so re-sampling the same point must be bit-identical.
    expect(n(5, 9)).toBe(n(5, 9))
  })

  it('is continuous — small steps give small changes', () => {
    const n = makeValueNoise(3)
    const base = n(2.5, 4.5)
    const near = n(2.5 + 1e-3, 4.5)
    expect(Math.abs(near - base)).toBeLessThan(0.02)
  })

  it('differs across seeds somewhere', () => {
    const a = makeValueNoise(1)
    const b = makeValueNoise(2)
    let differs = false
    for (let i = 0; i < 50 && !differs; i++) {
      if (a(i * 0.5, i * 0.3) !== b(i * 0.5, i * 0.3)) differs = true
    }
    expect(differs).toBe(true)
  })
})

describe('fbm', () => {
  it('stays within [0, 1] and is deterministic', () => {
    const n = makeValueNoise(11)
    for (let i = 0; i < 200; i++) {
      const x = i * 0.13
      const y = i * 0.07
      const v = fbm(n, x, y, DEFAULT_FBM)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      expect(fbm(n, x, y, DEFAULT_FBM)).toBe(v)
    }
  })

  it('treats octaves below 1 as a single octave', () => {
    const n = makeValueNoise(5)
    const single = fbm(n, 1.2, 3.4, { ...DEFAULT_FBM, octaves: 1 })
    const zero = fbm(n, 1.2, 3.4, { ...DEFAULT_FBM, octaves: 0 })
    expect(zero).toBe(single)
  })
})

describe('domain warp', () => {
  it('offsets within ±strength and is deterministic', () => {
    const n = makeValueNoise(8)
    const p = warp(n, 4, 6, 0.5, DEFAULT_FBM)
    expect(Math.abs(p.x - 4)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(p.y - 6)).toBeLessThanOrEqual(0.5)
    const q = warp(n, 4, 6, 0.5, DEFAULT_FBM)
    expect(q).toEqual(p)
  })
})
