import { describe, it, expect } from 'vitest'
import { envelopeCoef, follow } from './envelope.js'

const DT = 1 / 60

describe('envelopeCoef', () => {
  it('is between 0 and 1 for positive time constants', () => {
    const c = envelopeCoef(0.2, DT)
    expect(c).toBeGreaterThan(0)
    expect(c).toBeLessThan(1)
  })

  it('jumps immediately when the time constant is zero', () => {
    expect(envelopeCoef(0, DT)).toBe(1)
  })

  it('is frame-rate independent: two half-steps equal one full step', () => {
    const tc = 0.2
    const oneStep = envelopeCoef(tc, DT)
    const half = envelopeCoef(tc, DT / 2)
    const twoHalves = 1 - (1 - half) * (1 - half)
    expect(twoHalves).toBeCloseTo(oneStep, 10)
  })
})

describe('follow', () => {
  const opts = { attack: 0.03, release: 0.25 }

  it('attacks much faster than it releases', () => {
    const up = follow(0, 1, DT, opts) // rising: uses attack
    const down = 1 - follow(1, 0, DT, opts) // falling: uses release
    expect(up).toBeGreaterThan(down * 3)
  })

  it('converges to the target from both directions', () => {
    let v = 0
    for (let i = 0; i < 600; i += 1) v = follow(v, 0.8, DT, opts)
    expect(v).toBeCloseTo(0.8, 3)
    for (let i = 0; i < 600; i += 1) v = follow(v, 0.1, DT, opts)
    expect(v).toBeCloseTo(0.1, 3)
  })

  it('never overshoots', () => {
    const v = follow(0.2, 0.9, 5, opts) // absurdly long frame
    expect(v).toBeLessThanOrEqual(0.9)
  })
})
