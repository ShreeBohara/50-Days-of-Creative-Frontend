import { describe, it, expect } from 'vitest'
import {
  SEVERITY,
  DROP_TICKS,
  classifyImpact,
  speedForHeight,
  heightForSpeed,
  HAIRLINE_SPEED,
  DROP_SPEED,
  FLING_SPEED,
  THROW_SPEED,
} from './severity.js'

describe('classifyImpact', () => {
  it('buckets impact speed at the exact thresholds', () => {
    expect(classifyImpact({ impactSpeed: 0 })).toBe(SEVERITY.SET)
    expect(classifyImpact({ impactSpeed: 1.2999 })).toBe(SEVERITY.SET)
    expect(classifyImpact({ impactSpeed: 1.3 })).toBe(SEVERITY.HAIRLINE)
    expect(classifyImpact({ impactSpeed: 1.8999 })).toBe(SEVERITY.HAIRLINE)
    expect(classifyImpact({ impactSpeed: 1.9 })).toBe(SEVERITY.DROP)
    expect(classifyImpact({ impactSpeed: 2.9999 })).toBe(SEVERITY.DROP)
    expect(classifyImpact({ impactSpeed: 3.0 })).toBe(SEVERITY.FLING)
    expect(classifyImpact({ impactSpeed: 12 })).toBe(SEVERITY.FLING)
  })

  it('promotes a breaking throw to fling', () => {
    expect(classifyImpact({ impactSpeed: 1.9, releaseSpeed: THROW_SPEED })).toBe(SEVERITY.FLING)
    expect(classifyImpact({ impactSpeed: 2.5, releaseSpeed: 4 })).toBe(SEVERITY.FLING)
    // Just under the throw threshold stays a drop.
    expect(classifyImpact({ impactSpeed: 2.5, releaseSpeed: 2.1999 })).toBe(SEVERITY.DROP)
  })

  it('does not promote throws that land too softly to break', () => {
    expect(classifyImpact({ impactSpeed: 1.5, releaseSpeed: 5 })).toBe(SEVERITY.HAIRLINE)
    expect(classifyImpact({ impactSpeed: 0.8, releaseSpeed: 5 })).toBe(SEVERITY.SET)
  })

  it('treats non-finite or negative impact speeds as a set-down', () => {
    for (const impactSpeed of [NaN, Infinity, -Infinity, -2, undefined, null, '3']) {
      expect(classifyImpact({ impactSpeed, releaseSpeed: 5 })).toBe(SEVERITY.SET)
    }
    expect(classifyImpact()).toBe(SEVERITY.SET)
  })

  it('ignores a garbage release speed', () => {
    expect(classifyImpact({ impactSpeed: 2.5, releaseSpeed: NaN })).toBe(SEVERITY.DROP)
    expect(classifyImpact({ impactSpeed: 2.5, releaseSpeed: -9 })).toBe(SEVERITY.DROP)
    expect(classifyImpact({ impactSpeed: 2.5, releaseSpeed: Infinity })).toBe(SEVERITY.DROP)
  })

  it('exports thresholds in ascending order', () => {
    expect(HAIRLINE_SPEED).toBeLessThan(DROP_SPEED)
    expect(DROP_SPEED).toBeLessThan(FLING_SPEED)
  })
})

describe('speedForHeight / heightForSpeed', () => {
  it('matches v = sqrt(2gh)', () => {
    expect(speedForHeight(1)).toBeCloseTo(Math.sqrt(2 * 9.81), 10)
    expect(speedForHeight(0.3)).toBeCloseTo(2.4261, 4)
  })

  it('round-trips', () => {
    for (const h of [0.01, 0.15, 0.3, 0.45, 2]) {
      expect(heightForSpeed(speedForHeight(h))).toBeCloseTo(h, 12)
    }
    for (const v of [0.5, 1.3, 1.9, 3]) {
      expect(speedForHeight(heightForSpeed(v))).toBeCloseTo(v, 12)
    }
  })

  it('returns 0 for zero, negative and non-finite input', () => {
    for (const x of [0, -1, NaN, Infinity, undefined]) {
      expect(speedForHeight(x)).toBe(0)
      expect(heightForSpeed(x)).toBe(0)
    }
  })

  it('tick marks land on hairline, drop, drop', () => {
    expect(DROP_TICKS).toEqual([0.15, 0.3, 0.45])
    const sev = DROP_TICKS.map((h) => classifyImpact({ impactSpeed: speedForHeight(h) }))
    expect(sev).toEqual([SEVERITY.HAIRLINE, SEVERITY.DROP, SEVERITY.DROP])
  })

  it('threshold heights line up with the speed buckets', () => {
    const h = heightForSpeed(DROP_SPEED)
    expect(classifyImpact({ impactSpeed: speedForHeight(h * 1.001) })).toBe(SEVERITY.DROP)
    expect(classifyImpact({ impactSpeed: speedForHeight(h * 0.999) })).toBe(SEVERITY.HAIRLINE)
  })
})
