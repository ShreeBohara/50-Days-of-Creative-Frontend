import { describe, expect, it } from 'vitest'
import {
  DRAWER_FLING_VELOCITY,
  applyDrawerResistance,
  estimatePointerVelocity,
  rubberBand,
  shouldCloseDrawer,
} from './drawerPhysics.js'

describe('drawer physics', () => {
  it('compresses travel at a resisted edge', () => {
    expect(rubberBand(0, 600)).toBe(0)
    expect(rubberBand(240, 600)).toBeGreaterThan(0)
    expect(rubberBand(240, 600)).toBeLessThan(240)
  })

  it('applies resistance above zero and beyond the travel limit', () => {
    expect(applyDrawerResistance(-200, 600)).toBeGreaterThan(-200)
    expect(applyDrawerResistance(240, 600)).toBe(240)
    expect(applyDrawerResistance(800, 600)).toBeGreaterThan(600)
    expect(applyDrawerResistance(800, 600)).toBeLessThan(800)
  })

  it('closes at forty percent of the drawer height', () => {
    expect(shouldCloseDrawer({ offset: 239, height: 600, velocity: 0 })).toBe(false)
    expect(shouldCloseDrawer({ offset: 240, height: 600, velocity: 0 })).toBe(true)
  })

  it('closes on a fast downward fling but not an upward one', () => {
    expect(shouldCloseDrawer({ offset: 12, height: 600, velocity: DRAWER_FLING_VELOCITY })).toBe(true)
    expect(shouldCloseDrawer({ offset: 300, height: 1000, velocity: -900 })).toBe(false)
  })

  it('derives signed pointer velocity from timestamped samples', () => {
    expect(estimatePointerVelocity([
      { y: 100, time: 0 },
      { y: 180, time: 100 },
    ])).toBe(800)
    expect(estimatePointerVelocity([
      { y: 180, time: 0 },
      { y: 100, time: 100 },
    ])).toBe(-800)
  })
})
