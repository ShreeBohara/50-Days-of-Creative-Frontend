import { describe, expect, it } from 'vitest'
import { BOWL_TOP, Cloth, GRID, bowlRadiusAt } from './cloth.js'

function drape(c, steps = 260) {
  for (let i = 0; i < steps; i++) c.step(1 / 120, 8)
  return c
}

describe('bowl silhouette', () => {
  it('is widest near the rim and narrowest at the foot', () => {
    expect(bowlRadiusAt(0)).toBeLessThan(bowlRadiusAt(0.05))
    expect(bowlRadiusAt(0.07)).toBeGreaterThan(0.06)
    expect(bowlRadiusAt(1)).toBeCloseTo(bowlRadiusAt(BOWL_TOP), 6)
  })
})

describe('cloth', () => {
  it('drapes over the bowl without passing through it or the tray', () => {
    const c = drape(new Cloth())
    let inside = 0
    let below = 0
    for (let k = 0; k < c.n; k++) {
      const x = c.pos[k * 3]
      const y = c.pos[k * 3 + 1]
      const z = c.pos[k * 3 + 2]
      if (y < 0) below++
      if (y < BOWL_TOP && Math.hypot(x, z) < bowlRadiusAt(Math.max(0, y)) - 0.001) inside++
    }
    expect(below).toBe(0)
    expect(inside).toBe(0)
  })

  it('covers the mouth once draped', () => {
    expect(drape(new Cloth()).coverage()).toBeGreaterThan(0.5)
  })

  it('uncovers the bowl when a corner is pulled far away', () => {
    const c = drape(new Cloth())
    const k = GRID * GRID - 1
    for (let i = 0; i < 240; i++) {
      const t = Math.min(1, i / 120)
      c.grab(k, [0.05 + t * 0.4, 0.1 + t * 0.15, 0.05])
      c.step(1 / 120, 8)
    }
    c.release()
    for (let i = 0; i < 240; i++) c.step(1 / 120, 8)
    expect(c.coverage()).toBeLessThan(0.12)
  })

  it('stays finite under a violent yank', () => {
    const c = drape(new Cloth())
    c.grab(0, [2, 2, 2])
    for (let i = 0; i < 60; i++) c.step(1 / 60, 8)
    expect(c.pos.every(Number.isFinite)).toBe(true)
  })
})
