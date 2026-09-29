import { describe, it, expect } from 'vitest'
import {
  prepareSeams,
  pointAt,
  seamsForShard,
  seamsBetweenPlaced,
  revealProgress,
  maxImpactDist,
  nearestOnPolyline2D,
  lacquerStep,
  totalLength,
  filledLength,
  LACQUER_BACK_SLACK,
} from './seamGraph.js'

const SPACING = 0.0015

// A straight seam along +X on the bowl wall, 1.5 mm spacing.
function rawSeam({ id = 0, a = 0, b = 1, n = 11, impactDist, normals } = {}) {
  const points = Array.from({ length: n }, (_, i) => [i * SPACING, 0.05, 0.06])
  const arclen = Array.from({ length: n }, (_, i) => i * SPACING)
  return {
    id,
    a,
    b,
    points,
    normals: normals ?? points.map(() => [0, 0, 1]),
    arclen,
    length: arclen[n - 1],
    impactDist: impactDist ?? arclen.map((s) => s + 0.02),
  }
}

const json = (...seams) => ({ variant: 'Z0_drop', anchor: 0, shards: [], seams })

// Deterministic PRNG (mulberry32) so property tests are repeatable.
function mulberry32(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('prepareSeams', () => {
  it('packs every seam into flat typed arrays', () => {
    const [s] = prepareSeams(json(rawSeam()))
    expect(s.n).toBe(11)
    expect(s.pos).toBeInstanceOf(Float32Array)
    expect(s.pos).toHaveLength(33)
    expect(s.nrm).toHaveLength(33)
    expect(s.arclen).toHaveLength(11)
    expect(s.impactDist).toHaveLength(11)
    expect(s.length).toBeCloseTo(0.015, 6)
    expect(s.pos[3]).toBeCloseTo(SPACING, 7)
    expect(s.impactDist[0]).toBeCloseTo(0.02, 7)
  })

  it('accepts a bare seams array and orders a < b', () => {
    const [s] = prepareSeams([rawSeam({ a: 7, b: 2 })])
    expect([s.a, s.b]).toEqual([2, 7])
  })

  it('rebases arclen to 0 and derives length from it', () => {
    const raw = rawSeam()
    raw.arclen = raw.arclen.map((s) => s + 0.5)
    raw.length = 99
    const [s] = prepareSeams([raw])
    expect(s.arclen[0]).toBe(0)
    expect(s.length).toBeCloseTo(0.015, 5)
  })

  it('falls back to arclen when impactDist is absent', () => {
    const raw = rawSeam()
    delete raw.impactDist
    const [s] = prepareSeams([raw])
    expect(Array.from(s.impactDist)).toEqual(Array.from(s.arclen))
    expect(s.impactDist).not.toBe(s.arclen)
  })

  it('throws clear errors on malformed input', () => {
    const bad = (mutate) => {
      const raw = rawSeam()
      mutate(raw)
      return () => prepareSeams([raw])
    }
    expect(() => prepareSeams(null)).toThrow(/seams/)
    expect(() => prepareSeams({})).toThrow(/seams/)
    expect(bad((r) => r.normals.pop())).toThrow(/11 points but 10 normals/)
    expect(bad((r) => r.arclen.pop())).toThrow(/arclen/)
    expect(bad((r) => r.impactDist.push(1))).toThrow(/impactDist/)
    expect(bad((r) => (r.points = [r.points[0]]))).toThrow(/at least 2 points/)
    expect(bad((r) => (r.points[3] = [0, NaN, 0]))).toThrow(/points\[3\]/)
    expect(bad((r) => (r.points[3] = [0, 0]))).toThrow(/points\[3\]/)
    expect(bad((r) => (r.arclen[5] = 0))).toThrow(/decreases at index 5/)
    expect(bad((r) => (r.b = r.a))).toThrow(/itself/)
    expect(bad((r) => (r.id = 'x'))).toThrow(/integer id/)
    expect(() => prepareSeams([rawSeam(), rawSeam()])).toThrow(/duplicate seam id 0/)
  })
})

describe('pointAt', () => {
  const [seam] = prepareSeams([rawSeam()])

  it('hits the endpoints and interpolates between points', () => {
    expect(pointAt(seam, 0).pos[0]).toBeCloseTo(0, 7)
    const end = pointAt(seam, seam.length)
    expect(end.pos[0]).toBeCloseTo(0.015, 6)
    expect(end.index).toBe(9)
    expect(end.t).toBeCloseTo(1, 5)
    const mid = pointAt(seam, 0.00225)
    expect(mid.index).toBe(1)
    expect(mid.t).toBeCloseTo(0.5, 4)
    expect(mid.pos[0]).toBeCloseTo(0.00225, 6)
    expect(mid.pos[1]).toBeCloseTo(0.05, 6)
  })

  it('clamps out-of-range and non-finite arclength', () => {
    expect(pointAt(seam, -1).pos[0]).toBe(pointAt(seam, 0).pos[0])
    expect(pointAt(seam, 10).pos[0]).toBeCloseTo(seam.length, 6)
    expect(pointAt(seam, NaN).index).toBe(0)
  })

  it('renormalises interpolated normals', () => {
    const [s] = prepareSeams([
      rawSeam({ n: 2, normals: [[0, 0, 1], [1, 0, 0]] }),
    ])
    const { nrm } = pointAt(s, s.length / 2)
    expect(Math.hypot(...nrm)).toBeCloseTo(1, 6)
    expect(nrm[0]).toBeCloseTo(Math.SQRT1_2, 5)
    expect(nrm[2]).toBeCloseTo(Math.SQRT1_2, 5)
  })

  it('survives antiparallel normals and zero-length segments', () => {
    const raw = rawSeam({ n: 3, normals: [[0, 0, 1], [0, 0, -1], [0, 0, -1]] })
    raw.points[1] = raw.points[0].slice()
    raw.arclen = [0, 0, SPACING]
    const [s] = prepareSeams([raw])
    const p = pointAt(s, 0)
    expect(p.nrm.every(Number.isFinite)).toBe(true)
    expect(Math.hypot(...p.nrm)).toBeCloseTo(1, 6)
    const [s2] = prepareSeams([rawSeam({ n: 2, normals: [[0, 0, 1], [0, 0, -1]] })])
    expect(pointAt(s2, s2.length / 2).nrm).toEqual([0, 0, 1])
  })

  it('writes into a caller-owned out object', () => {
    const out = { pos: [0, 0, 0], nrm: [0, 0, 0] }
    const res = pointAt(seam, 0.003, out)
    expect(res).toBe(out)
    expect(out.pos[0]).toBeCloseTo(0.003, 6)
  })
})

describe('seam selection', () => {
  const seams = prepareSeams([
    rawSeam({ id: 0, a: 0, b: 1 }),
    rawSeam({ id: 1, a: 1, b: 2 }),
    rawSeam({ id: 2, a: 0, b: 3 }),
  ])

  it('finds the seams touching a shard', () => {
    expect(seamsForShard(seams, 1).map((s) => s.id)).toEqual([0, 1])
    expect(seamsForShard(seams, 9)).toEqual([])
  })

  it('paints only seams with both sides placed', () => {
    expect(seamsBetweenPlaced(seams, new Set([0])).map((s) => s.id)).toEqual([])
    expect(seamsBetweenPlaced(seams, new Set([0, 1])).map((s) => s.id)).toEqual([0])
    expect(seamsBetweenPlaced(seams, [0, 1, 2, 3]).map((s) => s.id)).toEqual([0, 1, 2])
  })
})

describe('revealProgress', () => {
  const [ramp] = prepareSeams([rawSeam()]) // impactDist 0.02 → 0.035

  it('is 0 before the front arrives and 1 once it has passed', () => {
    expect(revealProgress(ramp, 0)).toBe(0)
    expect(revealProgress(ramp, 0.0199)).toBe(0)
    expect(revealProgress(ramp, 0.02)).toBeCloseTo(0, 6)
    expect(revealProgress(ramp, 0.035)).toBeCloseTo(1, 6)
    expect(revealProgress(ramp, 1)).toBe(1)
    expect(revealProgress(ramp, Infinity)).toBe(1)
    expect(revealProgress(ramp, -Infinity)).toBe(0)
    expect(revealProgress(ramp, NaN)).toBe(0)
  })

  it('is continuous inside a segment', () => {
    expect(revealProgress(ramp, 0.0275)).toBeCloseTo(0.5, 4)
    expect(revealProgress(ramp, 0.02075)).toBeCloseTo(0.05, 4)
  })

  it('handles a crack that runs from the far end or from the middle', () => {
    const rev = rawSeam()
    rev.impactDist = rev.arclen.map((s) => 0.015 - s)
    const [back] = prepareSeams([rev])
    expect(revealProgress(back, 0.0075)).toBeCloseTo(0.5, 4)

    const mid = rawSeam()
    mid.impactDist = mid.arclen.map((s) => Math.abs(s - 0.0075))
    const [v] = prepareSeams([mid])
    expect(revealProgress(v, 0.00375)).toBeCloseTo(0.5, 4)
  })

  it('never decreases as the front advances', () => {
    const raw = rawSeam({ n: 40 })
    const rnd = mulberry32(7)
    raw.impactDist = raw.arclen.map(() => rnd() * 0.05)
    const [s] = prepareSeams([raw])
    let prev = 0
    for (let f = 0; f <= 0.05; f += 0.0005) {
      const p = revealProgress(s, f)
      expect(p).toBeGreaterThanOrEqual(prev - 1e-9)
      expect(p).toBeLessThanOrEqual(1)
      prev = p
    }
    expect(maxImpactDist([s])).toBeLessThan(0.05)
    expect(revealProgress(s, maxImpactDist([s]))).toBeCloseTo(1, 6)
  })
})

describe('nearestOnPolyline2D', () => {
  const xy = new Float32Array([0, 0, 10, 0, 10, 10])

  it('projects onto the closest segment', () => {
    const r = nearestOnPolyline2D(xy, { x: 4, y: 3 })
    expect(r.index).toBe(0)
    expect(r.t).toBeCloseTo(0.4, 6)
    expect(r.dist).toBeCloseTo(3, 6)
    expect(r.along).toBeCloseTo(0.4, 6)
    const r2 = nearestOnPolyline2D(xy, { x: 13, y: 7 })
    expect(r2.index).toBe(1)
    expect(r2.along).toBeCloseTo(1.7, 6)
    expect(r2.dist).toBeCloseTo(3, 6)
  })

  it('clamps past the ends', () => {
    const r = nearestOnPolyline2D(xy, { x: -5, y: 0 })
    expect(r).toMatchObject({ index: 0, t: 0, along: 0 })
    expect(r.dist).toBeCloseTo(5, 6)
    const e = nearestOnPolyline2D(xy, { x: 10, y: 20 })
    expect(e.along).toBe(2)
  })

  it('handles empty, single-point and degenerate polylines', () => {
    expect(nearestOnPolyline2D(new Float32Array(0), { x: 0, y: 0 }).dist).toBe(Infinity)
    const one = nearestOnPolyline2D([3, 4], { x: 0, y: 0 })
    expect(one).toEqual({ index: 0, t: 0, dist: 5, along: 0 })
    const dup = nearestOnPolyline2D([1, 1, 1, 1], { x: 4, y: 5 })
    expect(dup.dist).toBeCloseTo(5, 6)
    expect(Number.isFinite(dup.along)).toBe(true)
  })

  it('breaks ties toward the earlier segment', () => {
    // The corner point belongs to both segments.
    expect(nearestOnPolyline2D(xy, { x: 12, y: -2 }).index).toBe(0)
  })
})

describe('lacquerStep', () => {
  // 11 points, 10 px apart on screen, 1.5 mm apart on the bowl:
  // 0.15 mm per pixel everywhere.
  const [seam] = prepareSeams([rawSeam()])
  const xy = new Float32Array(22)
  for (let i = 0; i < 11; i += 1) {
    xy[i * 2] = i * 10
    xy[i * 2 + 1] = 100
  }
  const base = { xy, arclen: seam.arclen, corridorPx: 12 }
  const step = (o) => lacquerStep({ ...base, ...o })

  it('advances to the pointer projection inside the look-ahead', () => {
    expect(step({ fill: 0, pointer: { x: 60, y: 104 } })).toBeCloseTo(0.009, 6)
  })

  it('ignores pointers outside the corridor', () => {
    expect(step({ fill: 0.003, pointer: { x: 30, y: 113 } })).toBe(0.003)
    expect(step({ fill: 0.003, pointer: { x: 30, y: 111 } })).toBeCloseTo(0.0045, 6)
  })

  it('ignores pointers too far ahead of or behind the wet edge', () => {
    // 0.015 m ahead of fill 0 is beyond the 12 mm look-ahead.
    expect(step({ fill: 0, pointer: { x: 100, y: 100 }, strokePx: 50 })).toBe(0)
    // 6 mm behind a 12 mm fill is beyond the 4 mm back-slack.
    expect(step({ fill: 0.012, pointer: { x: 40, y: 100 }, strokePx: 50 })).toBe(0.012)
    expect(LACQUER_BACK_SLACK).toBe(0.004)
  })

  it('adds stroke distance × gain, converted through the local scale', () => {
    // Pointer 1.5 mm behind the edge (inside slack); 10 px ⇒ 1.5 mm ⇒ ×1.6.
    const f = step({ fill: 0.009, pointer: { x: 50, y: 100 }, strokePx: 10 })
    expect(f).toBeCloseTo(0.009 + 0.0015 * 1.6, 6)
    const g = step({ fill: 0.009, pointer: { x: 50, y: 100 }, strokePx: 10, gain: 1 })
    expect(g).toBeCloseTo(0.0105, 6)
  })

  it('respects a custom look-ahead', () => {
    expect(step({ fill: 0, pointer: { x: 60, y: 100 }, lookAheadM: 0.005 })).toBe(0)
    expect(step({ fill: 0, pointer: { x: 60, y: 100 }, lookAheadM: 0.01 })).toBeCloseTo(0.009, 6)
  })

  it('never passes the end of the seam', () => {
    const f = step({ fill: 0.0145, pointer: { x: 100, y: 100 }, strokePx: 1000 })
    expect(f).toBe(seam.length)
  })

  it('sanitises fill and pointer', () => {
    expect(step({ fill: NaN, pointer: { x: 15, y: 100 } })).toBeCloseTo(0.00225, 6)
    expect(step({ fill: 1, pointer: { x: 0, y: 100 } })).toBe(seam.length)
    expect(step({ fill: 0.003, pointer: undefined })).toBe(0.003)
    expect(step({ fill: 0.003, pointer: { x: NaN, y: 0 } })).toBe(0.003)
    expect(step({ fill: 0.003, pointer: { x: 30, y: 100 }, strokePx: -40 })).toBeCloseTo(0.0045, 6)
  })

  it('guards segments seen end-on (zero screen length)', () => {
    const flat = new Float32Array(xy)
    // First four points project onto one pixel.
    for (let i = 0; i < 4; i += 1) flat[i * 2] = 0
    const f = lacquerStep({ ...base, xy: flat, fill: 0, pointer: { x: 0, y: 100 }, strokePx: 10 })
    expect(Number.isFinite(f)).toBe(true)
    expect(f).toBeGreaterThan(0)

    const dot = new Float32Array(22).fill(5)
    const g = lacquerStep({ ...base, xy: dot, fill: 0, pointer: { x: 5, y: 5 }, strokePx: 10 })
    expect(g).toBe(0)
  })

  it('is monotone and bounded under a random scribble', () => {
    const rnd = mulberry32(64)
    let fill = 0
    for (let i = 0; i < 2000; i += 1) {
      const next = step({
        fill,
        pointer: { x: rnd() * 120 - 10, y: 100 + (rnd() - 0.5) * 40 },
        strokePx: rnd() * 30,
      })
      expect(next).toBeGreaterThanOrEqual(fill)
      expect(next).toBeLessThanOrEqual(seam.length)
      fill = next
    }
    expect(fill).toBe(seam.length)
  })
})

describe('lengths', () => {
  const seams = prepareSeams([rawSeam({ id: 0 }), rawSeam({ id: 1, n: 5 })])

  it('sums seam lengths', () => {
    expect(totalLength(seams)).toBeCloseTo(0.015 + 0.006, 6)
    expect(totalLength([])).toBe(0)
  })

  it('sums clamped fills from arrays, typed arrays and Maps', () => {
    expect(filledLength(seams, [0.01, 0.003])).toBeCloseTo(0.013, 6)
    expect(filledLength(seams, new Float32Array([1, 1]))).toBeCloseTo(0.021, 6)
    expect(filledLength(seams, [-1, NaN])).toBe(0)
    expect(filledLength(seams, new Map([[1, 0.002]]))).toBeCloseTo(0.002, 6)
    expect(filledLength(seams, undefined)).toBe(0)
  })
})
