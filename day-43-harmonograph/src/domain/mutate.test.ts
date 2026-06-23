import { describe, expect, it } from 'vitest'
import { createDefaultParams } from './defaults'
import { PARAM_RANGES, type Pendulum } from './harmonograph'
import { mutate, randomFigure } from './mutate'

function inRange(v: number, r: { min: number; max: number }) {
  return v >= r.min && v <= r.max
}

function assertBounded(pendulums: Pendulum[]) {
  for (const p of pendulums) {
    expect(inRange(p.freq, PARAM_RANGES.freq)).toBe(true)
    expect(inRange(p.amp, PARAM_RANGES.amp)).toBe(true)
    expect(inRange(p.phase, PARAM_RANGES.phase)).toBe(true)
    expect(inRange(p.damping, PARAM_RANGES.damping)).toBe(true)
  }
}

describe('mutate', () => {
  it('is the identity at amount 0', () => {
    const base = createDefaultParams()
    const out = mutate(base, 'seed-a', 0)
    expect(out.x).toEqual(base.x)
    expect(out.y).toEqual(base.y)
  })

  it('is deterministic for the same seed', () => {
    const base = createDefaultParams()
    expect(mutate(base, 'seed-b')).toEqual(mutate(base, 'seed-b'))
  })

  it('produces different figures for different seeds', () => {
    const base = createDefaultParams()
    expect(mutate(base, 'seed-c')).not.toEqual(mutate(base, 'seed-d'))
  })

  it('keeps every parameter within bounds', () => {
    const base = createDefaultParams()
    const out = mutate(base, 'seed-e', 1)
    assertBounded(out.x)
    assertBounded(out.y)
  })

  it('records the seed for reproducibility', () => {
    expect(mutate(createDefaultParams(), 'tag-9').seed).toBe('tag-9')
  })
})

describe('randomFigure', () => {
  it('is deterministic for a seed', () => {
    expect(randomFigure('rose')).toEqual(randomFigure('rose'))
  })

  it('has two oscillators per axis, all within bounds', () => {
    const fig = randomFigure('bloom')
    expect(fig.x).toHaveLength(2)
    expect(fig.y).toHaveLength(2)
    assertBounded(fig.x)
    assertBounded(fig.y)
  })

  it('differs across seeds', () => {
    expect(randomFigure('one')).not.toEqual(randomFigure('two'))
  })
})
