import { describe, it, expect } from 'vitest'
import {
  buildAdjacency,
  canLock,
  lockReason,
  assemblyOrder,
  nextAutoFit,
  isAssembled,
  magnetPull,
  SNAP_TOL,
  MAGNET_RADIUS,
  SNAP_TOL_PX,
  MAGNET_EXIT,
  snapTolerance,
  magnetRadius,
  magnetHeld,
  magnetAssist,
  approachProgress,
} from './fitRules.js'

// 0 is the foot. 1 lists 3 but 3 forgets 1; 2–3 only appear as a
// seam; 4–5 form an island with no path to the foot.
const JSON_FIXTURE = {
  anchor: 0,
  shards: [
    { id: 0, anchor: true, neighbors: [1, 2] },
    { id: 1, neighbors: [0, 3, 1] },
    { id: 2, neighbors: [0] },
    { id: 3, neighbors: [] },
    { id: 4, neighbors: [] },
    { id: 5 },
  ],
  seams: [
    { id: 0, a: 2, b: 3 },
    { id: 1, a: 4, b: 5 },
  ],
}

const ids = (set) => [...set].sort((a, b) => a - b)

describe('buildAdjacency', () => {
  const adj = buildAdjacency(JSON_FIXTURE)

  it('unions neighbour lists and seams, symmetrically', () => {
    expect(ids(adj.get(0))).toEqual([1, 2])
    expect(ids(adj.get(1))).toEqual([0, 3])
    expect(ids(adj.get(2))).toEqual([0, 3])
    expect(ids(adj.get(3))).toEqual([1, 2])
    expect(ids(adj.get(4))).toEqual([5])
    for (const [a, nbs] of adj) for (const b of nbs) expect(adj.get(b).has(a)).toBe(true)
  })

  it('drops self-loops and keys every shard', () => {
    expect(adj.get(1).has(1)).toBe(false)
    expect(ids(adj.keys())).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('drops ids that are not listed shards, so assembly can finish', () => {
    const phantom = buildAdjacency({
      shards: [{ id: 0, neighbors: [1, 99] }, { id: 1, neighbors: [0] }],
      seams: [{ a: 1, b: 42 }],
    })
    expect(ids(phantom.keys())).toEqual([0, 1])
    expect(ids(phantom.get(0))).toEqual([1])
    expect(isAssembled(new Set([0, 1]), phantom, 0)).toBe(true)
  })

  it('tolerates empty or partial input', () => {
    expect(buildAdjacency({}).size).toBe(0)
    expect(buildAdjacency(null).size).toBe(0)
    const onlySeams = buildAdjacency({ seams: [{ a: 0, b: 1 }, { a: 'x', b: 2 }] })
    expect(ids(onlySeams.keys())).toEqual([0, 1])
  })
})

describe('canLock / lockReason', () => {
  const adjacency = buildAdjacency(JSON_FIXTURE)
  const placed = new Set([0])
  const tol = SNAP_TOL.mouse
  const args = (o) => ({ id: 1, placed, adjacency, dist: 0.001, tol, ...o })

  it('locks a neighbour of a placed shard within tolerance', () => {
    expect(lockReason(args())).toBe('ok')
    expect(canLock(args())).toBe(true)
    expect(canLock(args({ dist: tol }))).toBe(true)
  })

  it('reports too-far just outside tolerance or on a bad distance', () => {
    expect(lockReason(args({ dist: tol + 1e-9 }))).toBe('too-far')
    expect(lockReason(args({ dist: NaN }))).toBe('too-far')
    expect(canLock(args({ dist: Infinity }))).toBe(false)
  })

  it('reports no-neighbour for a floating shard', () => {
    expect(lockReason(args({ id: 3 }))).toBe('no-neighbour')
    expect(lockReason(args({ id: 99 }))).toBe('no-neighbour')
    expect(lockReason(args({ id: 3, placed: new Set([0, 1]) }))).toBe('ok')
  })

  it('reports already-placed before anything else', () => {
    expect(lockReason(args({ id: 0, dist: 1 }))).toBe('already-placed')
    expect(canLock(args({ id: 0 }))).toBe(false)
  })

  it('prefers too-far over no-neighbour', () => {
    expect(lockReason(args({ id: 3, dist: 1 }))).toBe('too-far')
  })
})

describe('assemblyOrder', () => {
  it('walks rings outward from the anchor and lists islands', () => {
    const { order, unreachable } = assemblyOrder(buildAdjacency(JSON_FIXTURE), 0)
    expect(order).toEqual([0, 1, 2, 3])
    expect(unreachable).toEqual([4, 5])
  })

  it('sorts each ring by id, not by discovery order', () => {
    const adj = new Map([
      [0, new Set([5, 2, 9])],
      [5, new Set([0, 3])],
      [2, new Set([0, 7])],
      [9, new Set([0])],
      [3, new Set([5])],
      [7, new Set([2])],
    ])
    // BFS over sorted neighbour lists would give [0, 2, 5, 9, 7, 3].
    expect(assemblyOrder(adj, 0).order).toEqual([0, 2, 5, 9, 3, 7])
  })

  it('is independent of neighbour insertion order', () => {
    const shuffled = {
      shards: JSON_FIXTURE.shards.map((s) => ({ ...s, neighbors: [...(s.neighbors ?? [])].reverse() })),
      seams: [...JSON_FIXTURE.seams].reverse(),
    }
    expect(assemblyOrder(buildAdjacency(shuffled), 0)).toEqual(
      assemblyOrder(buildAdjacency(JSON_FIXTURE), 0),
    )
  })

  it('reports everything unreachable for a missing anchor', () => {
    const r = assemblyOrder(buildAdjacency(JSON_FIXTURE), 42)
    expect(r.order).toEqual([])
    expect(r.unreachable).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('handles a lone anchor', () => {
    expect(assemblyOrder(new Map([[0, new Set()]]), 0)).toEqual({ order: [0], unreachable: [] })
  })
})

describe('nextAutoFit / isAssembled', () => {
  const adj = buildAdjacency(JSON_FIXTURE)

  it('suggests shards in assembly order, only when they can lock', () => {
    expect(nextAutoFit(new Set([0]), adj, 0)).toBe(1)
    expect(nextAutoFit(new Set([0, 1]), adj, 0)).toBe(2)
    expect(nextAutoFit(new Set([0, 1, 2]), adj, 0)).toBe(3)
    expect(nextAutoFit(new Set([0, 1, 2, 3]), adj, 0)).toBeNull()
  })

  it('suggests the anchor first if it is somehow unplaced', () => {
    expect(nextAutoFit(new Set(), adj, 0)).toBe(0)
    expect(nextAutoFit(new Set(), adj, 42)).toBeNull()
  })

  it('every suggestion is lockable at zero distance', () => {
    const placed = new Set([0])
    let next
    while ((next = nextAutoFit(placed, adj, 0)) !== null) {
      expect(canLock({ id: next, placed, adjacency: adj, dist: 0, tol: SNAP_TOL.touch })).toBe(true)
      placed.add(next)
    }
    expect(isAssembled(placed, adj, 0)).toBe(true)
    expect(placed.has(4)).toBe(false)
  })

  it('is not assembled while a reachable shard is loose', () => {
    expect(isAssembled(new Set([0, 1, 2]), adj, 0)).toBe(false)
    expect(isAssembled(new Set([0, 1, 2, 3]), adj, 99)).toBe(false)
  })
})

describe('magnetPull', () => {
  const { mouse: tol } = SNAP_TOL
  const { mouse: radius } = MAGNET_RADIUS

  it('is 1 inside tolerance and 0 beyond the radius', () => {
    expect(magnetPull(0, tol, radius)).toBe(1)
    expect(magnetPull(tol, tol, radius)).toBe(1)
    expect(magnetPull(radius, tol, radius)).toBe(0)
    expect(magnetPull(1, tol, radius)).toBe(0)
  })

  it('eases smoothly and monotonically in between', () => {
    expect(magnetPull((tol + radius) / 2, tol, radius)).toBeCloseTo(0.5, 10)
    let prev = 1
    for (let d = tol; d <= radius; d += 0.0005) {
      const p = magnetPull(d, tol, radius)
      expect(p).toBeLessThanOrEqual(prev + 1e-12)
      prev = p
    }
    // Zero slope at both ends: tiny steps change almost nothing.
    expect(1 - magnetPull(tol + 1e-5, tol, radius)).toBeLessThan(1e-5)
    expect(magnetPull(radius - 1e-5, tol, radius)).toBeLessThan(1e-5)
  })

  it('degrades to a step when radius <= tol, and 0 on NaN', () => {
    expect(magnetPull(0.005, 0.006, 0.006)).toBe(1)
    expect(magnetPull(0.007, 0.006, 0.004)).toBe(0)
    expect(magnetPull(NaN, tol, radius)).toBe(0)
  })

  it('snap tolerance sits inside the magnet radius for both inputs', () => {
    expect(SNAP_TOL.mouse).toBeLessThan(MAGNET_RADIUS.mouse)
    expect(SNAP_TOL.touch).toBeLessThan(MAGNET_RADIUS.touch)
    expect(SNAP_TOL.touch).toBeGreaterThan(SNAP_TOL.mouse)
  })
})

describe('snapTolerance', () => {
  it('is SNAP_TOL when the pixel floor is smaller (a big, close view)', () => {
    // 6 mm at 5000 px/m is 30 px, above the 24 px floor
    expect(snapTolerance(false, 5000)).toBe(SNAP_TOL.mouse)
    // 12 mm at 4000 px/m is 48 px, above the 44 px floor
    expect(snapTolerance(true, 4000)).toBe(SNAP_TOL.touch)
  })

  it('never drops below the pixel floor on a small view', () => {
    // a 700 px laptop canvas at fov 28 / 0.5 m is roughly 2800 px/m
    expect(snapTolerance(false, 2800)).toBeCloseTo(SNAP_TOL_PX.mouse / 2800, 12)
    expect(snapTolerance(false, 2800) * 2800).toBeCloseTo(SNAP_TOL_PX.mouse, 9)
    // a portrait phone with the camera pulled back: ~1500 px/m
    expect(snapTolerance(true, 1500) * 1500).toBeCloseTo(SNAP_TOL_PX.touch, 9)
    for (const pxPerM of [300, 800, 1500, 2800, 4000, 9000]) {
      expect(snapTolerance(false, pxPerM) * pxPerM).toBeGreaterThanOrEqual(SNAP_TOL_PX.mouse - 1e-9)
      expect(snapTolerance(true, pxPerM) * pxPerM).toBeGreaterThanOrEqual(SNAP_TOL_PX.touch - 1e-9)
      expect(snapTolerance(false, pxPerM)).toBeGreaterThanOrEqual(SNAP_TOL.mouse)
    }
  })

  it('touch is at least as forgiving as mouse', () => {
    for (const pxPerM of [500, 2000, 6000]) {
      expect(snapTolerance(true, pxPerM)).toBeGreaterThanOrEqual(snapTolerance(false, pxPerM))
    }
  })

  it('falls back to SNAP_TOL on a missing or broken scale', () => {
    for (const bad of [0, -5, NaN, Infinity, undefined]) {
      expect(snapTolerance(false, bad)).toBe(SNAP_TOL.mouse)
      expect(snapTolerance(true, bad)).toBe(SNAP_TOL.touch)
    }
  })
})

describe('magnetRadius', () => {
  it('is MAGNET_RADIUS for the stock tolerances', () => {
    expect(magnetRadius(false, SNAP_TOL.mouse)).toBe(MAGNET_RADIUS.mouse)
    expect(magnetRadius(true, SNAP_TOL.touch)).toBe(MAGNET_RADIUS.touch)
  })

  it('grows with a pixel-floored tolerance so the pull still eases', () => {
    const tol = snapTolerance(true, 1200) // ~37 mm
    const r = magnetRadius(true, tol)
    expect(r).toBeGreaterThan(tol * 2)
    // the ease between tol and radius is not a step
    expect(magnetPull((tol + r) / 2, tol, r)).toBeCloseTo(0.5, 10)
  })

  it('never returns NaN', () => {
    expect(magnetRadius(false, NaN)).toBe(MAGNET_RADIUS.mouse)
  })
})

describe('magnetHeld (hysteresis)', () => {
  const r = MAGNET_RADIUS.mouse

  it('catches only inside the radius', () => {
    expect(magnetHeld(r * 1.01, r, false)).toBe(false)
    expect(magnetHeld(r * 0.99, r, false)).toBe(true)
  })

  it('lets go only past MAGNET_EXIT × radius', () => {
    expect(magnetHeld(r * 1.2, r, true)).toBe(true)
    expect(magnetHeld(r * MAGNET_EXIT * 0.999, r, true)).toBe(true)
    expect(magnetHeld(r * MAGNET_EXIT, r, true)).toBe(false)
  })

  it('does not flicker when the distance jitters around the radius', () => {
    let held = false
    const trace = [1.1, 1.0, 0.98, 1.02, 0.99, 1.03, 1.01, 1.2, 1.3, 1.34, 1.36, 1.02]
    const out = trace.map((m) => (held = magnetHeld(r * m, r, held)))
    expect(out).toEqual([false, false, true, true, true, true, true, true, true, true, false, false])
  })

  it('is never held at an unknown distance', () => {
    expect(magnetHeld(NaN, r, true)).toBe(false)
  })
})

describe('magnetAssist', () => {
  const tol = SNAP_TOL.mouse
  const r = MAGNET_RADIUS.mouse

  it('is 0 unless held, and full inside the tolerance', () => {
    expect(magnetAssist(tol / 2, tol, r, false)).toBe(0)
    expect(magnetAssist(tol / 2, tol, r, true)).toBe(1)
  })

  it('fades to 0 exactly where the hysteresis lets go', () => {
    const exit = r * MAGNET_EXIT
    expect(magnetAssist(exit - 1e-6, tol, r, true)).toBeLessThan(1e-6)
    expect(magnetAssist(exit, tol, r, true)).toBe(0)
  })
})

describe('approachProgress', () => {
  it('is 0 far away, 1 at the magnet edge, smooth between', () => {
    expect(approachProgress(400, 80, 250)).toBe(0)
    expect(approachProgress(250, 80, 250)).toBe(0)
    expect(approachProgress(80, 80, 250)).toBe(1)
    expect(approachProgress(10, 80, 250)).toBe(1)
    expect(approachProgress(165, 80, 250)).toBeCloseTo(0.5, 10)
    let prev = 0
    for (let px = 250; px >= 80; px -= 5) {
      const p = approachProgress(px, 80, 250)
      expect(p).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = p
    }
  })

  it('degrades to a step when near >= far, and 0 on NaN', () => {
    expect(approachProgress(100, 300, 250)).toBe(1)
    expect(approachProgress(320, 300, 250)).toBe(0)
    expect(approachProgress(NaN, 80, 250)).toBe(0)
  })
})
