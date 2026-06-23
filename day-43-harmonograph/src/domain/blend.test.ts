import { describe, expect, it } from 'vitest'
import { blendAngle, blendParams } from './blend'
import { createDefaultParams } from './defaults'
import { randomFigure } from './mutate'

describe('blendAngle', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(blendAngle(0.5, 2.0, 0)).toBeCloseTo(0.5, 6)
    expect(blendAngle(0.5, 2.0, 1)).toBeCloseTo(2.0, 6)
  })

  it('takes the shortest arc across the wrap point', () => {
    // from 0.1 to 6.2 (~ -0.08 rad) the short way is backwards through 0
    const mid = blendAngle(0.1, 6.2, 0.5)
    expect(mid > 6.1 || mid < 0.2).toBe(true)
  })

  it('always returns a value within [0, 2π)', () => {
    const v = blendAngle(6.0, 0.2, 0.5)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(Math.PI * 2)
  })
})

describe('blendParams', () => {
  const a = createDefaultParams()
  const b = randomFigure('partner')

  it('reproduces parent A geometry at t=0', () => {
    const child = blendParams(a, b, 0)
    expect(child.x).toEqual(a.x)
    expect(child.y).toEqual(a.y)
    expect(child.duration).toBe(a.duration)
  })

  it('reproduces parent B geometry at t=1', () => {
    const child = blendParams(a, b, 1)
    expect(child.x).toEqual(b.x)
    expect(child.y).toEqual(b.y)
    expect(child.duration).toBe(b.duration)
  })

  it('takes the midpoint of frequencies at t=0.5', () => {
    const child = blendParams(a, b, 0.5)
    expect(child.x[0].freq).toBeCloseTo((a.x[0].freq + b.x[0].freq) / 2, 6)
  })

  it('is deterministic', () => {
    expect(blendParams(a, b, 0.37)).toEqual(blendParams(a, b, 0.37))
  })

  it('records both parent seeds and the mix', () => {
    expect(blendParams(a, b, 0.25).seed).toContain(a.seed)
    expect(blendParams(a, b, 0.25).seed).toContain(b.seed)
  })
})
