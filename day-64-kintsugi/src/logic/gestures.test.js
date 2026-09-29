import { describe, it, expect } from 'vitest'
import { STOP_MS, classify, releaseVelocity, rubEnergy, throwVelocity } from './gestures.js'

// Evenly spaced samples along a straight line, every `dt` ms.
function line({ from = [0, 0], to = [100, 0], ms = 200, dt = 16, t0 = 0 } = {}) {
  const steps = Math.max(1, Math.round(ms / dt))
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = i / steps
    return { x: from[0] + (to[0] - from[0]) * u, y: from[1] + (to[1] - from[1]) * u, t: t0 + ms * u }
  })
}

describe('releaseVelocity', () => {
  it('recovers a constant velocity exactly', () => {
    const { vx, vy } = releaseVelocity(line({ to: [160, -80], ms: 200 }))
    expect(vx).toBeCloseTo(0.8, 9)
    expect(vy).toBeCloseTo(-0.4, 9)
  })

  it('looks only at the trailing window', () => {
    const slow = line({ to: [20, 0], ms: 400 })
    const fast = line({ from: [20, 0], to: [220, 0], ms: 100, t0: 400 }).slice(1)
    expect(releaseVelocity([...slow, ...fast]).vx).toBeCloseTo(2, 6)
    // Widen the window and the slow part drags the estimate down.
    expect(releaseVelocity([...slow, ...fast], 1000).vx).toBeLessThan(1)
  })

  it('pulls in one earlier sample when the window holds just one', () => {
    const v = releaseVelocity([
      { x: 0, y: 0, t: 0 },
      { x: 50, y: 0, t: 200 },
    ])
    expect(v.vx).toBeCloseTo(0.25, 9)
  })

  it('reaches back past samples that share the final timestamp', () => {
    // pointerup stamped the same ms as the last move, nothing else in the window.
    const v = releaseVelocity([
      { x: 0, y: 0, t: 0 },
      { x: 40, y: 0, t: 200 },
      { x: 40, y: 0, t: 200 },
    ])
    expect(v.vx).toBeCloseTo(0.2, 9)
  })

  it('is zero for 0 or 1 samples, or samples sharing a timestamp', () => {
    expect(releaseVelocity([])).toEqual({ vx: 0, vy: 0 })
    expect(releaseVelocity([{ x: 5, y: 5, t: 10 }])).toEqual({ vx: 0, vy: 0 })
    expect(releaseVelocity([{ x: 0, y: 0, t: 10 }, { x: 50, y: 0, t: 10 }])).toEqual({ vx: 0, vy: 0 })
    expect(releaseVelocity(undefined)).toEqual({ vx: 0, vy: 0 })
  })

  it('smooths jitter (least squares, not endpoints)', () => {
    const pts = line({ to: [80, 0], ms: 80, dt: 8 }).map((p, i) => ({ ...p, x: p.x + (i % 2 ? 3 : -3) }))
    expect(releaseVelocity(pts).vx).toBeCloseTo(1, 0)
    // Endpoint difference would read (83 - (-3)) / 80 ≈ 1.075.
    expect(Math.abs(releaseVelocity(pts).vx - 1)).toBeLessThan(0.075)
  })

  it('skips malformed samples', () => {
    const pts = [...line({ to: [80, 0], ms: 100 }), { x: NaN, y: 0, t: 120 }, null]
    expect(releaseVelocity(pts).vx).toBeCloseTo(0.8, 9)
  })
})

describe('classify', () => {
  it('tap: small and quick, with exclusive boundaries', () => {
    expect(classify([{ x: 0, y: 0, t: 0 }, { x: 3, y: 4, t: 120 }])).toBe('tap')
    expect(classify([{ x: 0, y: 0, t: 0 }, { x: 5.99, y: 0, t: 219 }])).toBe('tap')
    expect(classify([{ x: 0, y: 0, t: 0 }, { x: 6, y: 0, t: 219 }])).not.toBe('tap')
    expect(classify([{ x: 0, y: 0, t: 0 }, { x: 1, y: 0, t: 220 }])).not.toBe('tap')
    expect(classify([{ x: 1, y: 1, t: 0 }])).toBe('tap')
    expect(classify([])).toBe('tap')
  })

  it('uses furthest excursion, not net displacement, for tap slop', () => {
    const wobble = [{ x: 0, y: 0, t: 0 }, { x: 20, y: 0, t: 60 }, { x: 0, y: 0, t: 120 }]
    expect(classify(wobble)).not.toBe('tap')
  })

  it('a still long-press is a drag', () => {
    expect(classify([{ x: 0, y: 0, t: 0 }, { x: 1, y: 0, t: 600 }])).toBe('drag')
  })

  it('flick: fast release in any direction', () => {
    expect(classify(line({ to: [0, -300], ms: 160 }))).toBe('flick')
    expect(classify(line({ to: [250, 250], ms: 200 }))).toBe('flick')
    // Slow drag, then a whip at the end.
    const whip = [...line({ to: [30, 0], ms: 500 }), ...line({ from: [30, 0], to: [30, -150], ms: 80, t0: 500 }).slice(1)]
    expect(classify(whip)).toBe('flick')
  })

  it('a fast move that stops before release is not a flick', () => {
    const stop = [...line({ to: [0, -300], ms: 160 }), { x: 0, y: -300, t: 260 }, { x: 0, y: -300, t: 300 }]
    expect(classify(stop)).toBe('drag')
  })

  it('swipe: quick, flat, horizontal — decelerating so it is not a flick', () => {
    const swipe = [
      ...line({ to: [280, 6], ms: 150 }),
      ...line({ from: [280, 6], to: [300, 6], ms: 100, t0: 150 }).slice(1),
    ]
    expect(classify(swipe)).toBe('swipe')
    const leftward = swipe.map((p) => ({ ...p, x: -p.x }))
    expect(classify(leftward)).toBe('swipe')
  })

  it('too steep or too slow for a swipe is a drag', () => {
    const steep = [
      ...line({ to: [280, 120], ms: 150 }),
      ...line({ from: [280, 120], to: [300, 120], ms: 100, t0: 150 }).slice(1),
    ]
    expect(classify(steep)).toBe('drag')
    expect(classify(line({ to: [200, 0], ms: 800 }))).toBe('drag')
  })
})

describe('rubEnergy', () => {
  it('is plain path length for a one-way stroke', () => {
    expect(rubEnergy(line({ to: [30, 40], ms: 100 }))).toBeCloseTo(50, 9)
  })

  it('weights each reversal ×1.5', () => {
    const rub = [0, 10, 0, 10].map((x, i) => ({ x, y: 0, t: i * 16 }))
    expect(rubEnergy(rub)).toBeCloseTo(10 + 15 + 15, 9)
  })

  it('a right-angle turn is not a reversal', () => {
    const corner = [{ x: 0, y: 0, t: 0 }, { x: 10, y: 0, t: 1 }, { x: 10, y: 10, t: 2 }]
    expect(rubEnergy(corner)).toBeCloseTo(20, 9)
  })

  it('pauses do not reset the direction memory', () => {
    const pause = [0, 10, 10, 0].map((x, i) => ({ x, y: 0, t: i * 16 }))
    expect(rubEnergy(pause)).toBeCloseTo(25, 9)
  })

  it('burnishing beats a drag of the same path length', () => {
    const scrub = Array.from({ length: 11 }, (_, i) => ({ x: i % 2 ? 20 : 0, y: 0, t: i * 16 }))
    const drag = line({ to: [200, 0], ms: 160 })
    expect(rubEnergy(scrub)).toBeGreaterThan(rubEnergy(drag))
  })

  it('is 0 for nothing', () => {
    expect(rubEnergy([])).toBe(0)
    expect(rubEnergy([{ x: 1, y: 1, t: 0 }])).toBe(0)
    expect(rubEnergy(null)).toBe(0)
  })
})

describe('throwVelocity', () => {
  // A 100 px/100 ms flick with the pointerup `gap` ms after the last move.
  const flick = (gap = 4) => {
    const pts = line({ to: [100, -50], ms: 100, dt: 8 })
    const last = pts[pts.length - 1]
    return { pts, end: { x: last.x, y: last.y, t: last.t + gap } }
  }

  it('carries a flick released while moving', () => {
    const { pts, end } = flick(2)
    const { vx, vy } = throwVelocity(pts, end)
    expect(vx).toBeGreaterThan(0.9)
    expect(vx).toBeLessThanOrEqual(1)
    expect(vy).toBeCloseTo(vx / -2, 9)
  })

  it('is exactly zero once the pointer rested longer than STOP_MS', () => {
    const { pts, end } = flick(STOP_MS + 1)
    expect(throwVelocity(pts, end)).toEqual({ vx: 0, vy: 0 })
  })

  it('a pause just short of the cut-off throws softer, never harder', () => {
    const still = throwVelocity(flick(1).pts, flick(1).end).vx
    const paused = throwVelocity(flick(STOP_MS - 5).pts, flick(STOP_MS - 5).end).vx
    expect(paused).toBeGreaterThan(0)
    expect(paused).toBeLessThan(still * 0.8)
  })

  it('fits only the trailing window', () => {
    const slow = line({ to: [20, 0], ms: 400 })
    const fast = line({ from: [20, 0], to: [220, 0], ms: 100, t0: 400 }).slice(1)
    const last = fast[fast.length - 1]
    expect(throwVelocity([...slow, ...fast], { ...last, t: last.t }).vx).toBeCloseTo(2, 6)
  })

  it('without a pointerup sample it falls back to the move trace', () => {
    expect(throwVelocity(line({ to: [80, 0], ms: 100 })).vx).toBeCloseTo(0.8, 9)
    expect(throwVelocity(line({ to: [80, 0], ms: 100 }), { x: NaN, y: 0, t: 1e9 }).vx).toBeCloseTo(0.8, 9)
  })

  it('is zero for no samples or garbage, and does not touch the caller\'s trace', () => {
    expect(throwVelocity([], { x: 0, y: 0, t: 0 })).toEqual({ vx: 0, vy: 0 })
    expect(throwVelocity(null)).toEqual({ vx: 0, vy: 0 })
    expect(throwVelocity([{ x: 1, y: 1, t: 5 }], { x: 1, y: 1, t: 5 })).toEqual({ vx: 0, vy: 0 })
    const { pts, end } = flick()
    const n = pts.length
    throwVelocity(pts, end)
    expect(pts.length).toBe(n)
  })
})
