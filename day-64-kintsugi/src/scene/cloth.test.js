import { describe, expect, it } from 'vitest'
import { BOWL_TOP, Cloth, GRID, TICK, bowlRadiusAt } from './cloth.js'

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

describe('fixed clock', () => {
  // Drive `ticks` ticks with frames drawn from `frame()` (seconds); the corner is
  // held at one spot so the only input is time.
  function run(frame, ticks = 120) {
    const c = Cloth.draped()
    c.grab(GRID * GRID - 1, [0.2, 0.12, 0.05])
    let done = 0
    let frames = 0
    while (done < ticks) {
      done += c.advance(Math.min(frame(frames++), (ticks - done) * TICK))
    }
    return c
  }

  it('moves the same at 60 Hz, 144 Hz and on a jittery clock', () => {
    const at60 = run(() => 1 / 60)
    const at144 = run(() => 1 / 144)
    let seed = 7
    const jitter = run(() => {
      seed = (seed * 16807) % 2147483647
      return (4 + (seed / 2147483647) * 26) / 1000 // 4–30 ms frames
    })
    expect(Array.from(at144.pos)).toEqual(Array.from(at60.pos))
    expect(Array.from(jitter.pos)).toEqual(Array.from(at60.pos))
  })

  it('runs no tick until a whole one has elapsed, then banks the remainder', () => {
    const c = Cloth.draped()
    expect(c.advance(TICK * 0.6)).toBe(0)
    expect(c.advance(TICK * 0.6)).toBe(1)
    expect(c.acc).toBeCloseTo(TICK * 0.2, 12)
  })

  it('after a hitch runs at most 4 ticks and drops the backlog', () => {
    const c = Cloth.draped()
    expect(c.advance(1)).toBe(4)
    expect(c.acc).toBeLessThan(TICK)
    expect(c.advance(0)).toBe(0)
  })

  it('draws between the last two ticks by the time left over', () => {
    const c = Cloth.draped()
    c.grab(0, [0.3, 0.2, 0.1])
    c.advance(TICK * 1.5)
    const out = c.lerpInto(new Float32Array(c.pos.length))
    const i = 0
    expect(out[i]).toBeCloseTo((c.last[i] + c.pos[i]) / 2, 5)
    expect(out[i]).not.toBeCloseTo(c.pos[i], 5)
    c.advance(TICK * 0.5 - 1e-12)
    c.lerpInto(out)
    expect(out[i]).toBeCloseTo(c.pos[i], 5)
  })
})
