import { describe, expect, it } from 'vitest'
import {
  DEG,
  gutterFold,
  pageFrames,
  placeFlat,
  solveBox,
  solveFlap,
  solveTent,
  solveVfold,
  toWorld,
} from './kinematics.js'
import { cross, dist, dot, len } from './vec.js'

const H = 26
const close = (a, b, eps = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) < eps)
// a spread opened alpha with its left page flat (a page being turned)
const open = (alpha) => gutterFold(Math.PI, Math.PI - alpha, H)
const angles = Array.from({ length: 40 }, (_, i) => 0.03 + (i / 39) * (Math.PI - 0.03))

describe('gutter and pages', () => {
  it('a flat open book has the sky as its interior', () => {
    const F = open(Math.PI)
    expect(close(F.up, [0, 1, 0])).toBe(true)
    expect(F.alpha).toBeCloseTo(Math.PI)
  })

  it('both printed pages face up when flat, and page coords land on the right sheets', () => {
    const F = open(Math.PI)
    const { L, R } = pageFrames(F, 20)
    expect(close(L.n, [0, 1, 0])).toBe(true)
    expect(close(R.n, [0, 1, 0])).toBe(true)
    // right page: x from the spine out, y from head to tail
    expect(close(toWorld(R, 0, 0), [0, 0, -13])).toBe(true)
    expect(close(toWorld(R, 20, 26), [20, 0, 13])).toBe(true)
    // left page: x from its fore-edge in to the spine
    expect(close(toWorld(L, 0, 0), [-20, 0, -13])).toBe(true)
    expect(close(toWorld(L, 20, 0), [0, 0, -13])).toBe(true)
  })

  it('the interior bisects the pages at every angle', () => {
    for (const a of angles) {
      const F = open(a)
      expect(dot(F.up, F.a)).toBeCloseTo(dot(F.up, F.b), 9)
      expect(dot(F.up, F.a)).toBeCloseTo(Math.cos(a / 2), 9)
    }
  })
})

describe('V-fold', () => {
  const v = { at: 8, glue: [45, 45], angle: [90, 90] }

  it('a square-bottomed card on 45° glue lines stands bolt upright when flat open', () => {
    const { panels } = solveVfold(open(Math.PI), v)
    expect(close(panels.A.ey, [0, 1, 0], 1e-9)).toBe(true)
    expect(close(panels.B.ey, [0, 1, 0], 1e-9)).toBe(true)
  })

  it('keeps each half rigid and hinged on its glue line at every angle', () => {
    const pts = [
      [-3, -1],
      [-1, -6],
      [-0.5, -9],
    ]
    const ref = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])
    for (const a of angles) {
      const F = open(a)
      const { panels, strain } = solveVfold(F, v)
      expect(strain).toBe(0)
      const w = pts.map(([x, y]) => toWorld(panels.A, x, y))
      expect(dist(w[0], w[1])).toBeCloseTo(ref(pts[0], pts[1]), 9)
      expect(dist(w[1], w[2])).toBeCloseTo(ref(pts[1], pts[2]), 9)
      // a point on the card's glue line sits on its page plane
      const g = toWorld(panels.A, -Math.sin(90 * DEG) * 4, -Math.cos(90 * DEG) * 4)
      const { L } = pageFrames(F, 20)
      expect(dot([g[0] - L.o[0], g[1] - L.o[1], g[2] - L.o[2]], L.n)).toBeCloseTo(0, 9)
    }
  })

  it('folds flat into the gutter as the book shuts', () => {
    const F = open(0.02)
    const { panels } = solveVfold(F, v)
    // the crease lies (almost) in the shut pages' plane
    const n = cross(F.a, F.s)
    expect(Math.abs(dot(panels.A.ey, n))).toBeLessThan(0.02)
  })

  it('moves continuously from shut to open (no branch flips)', () => {
    let prev = null
    for (let i = 0; i <= 400; i++) {
      const a = 0.02 + (i / 400) * (Math.PI - 0.02)
      const c = solveVfold(open(a), { at: 5, glue: [35, 60], angle: [70, 95] }).panels.A.ey
      if (prev) expect(dist(c, prev)).toBeLessThan(0.05)
      prev = c
    }
  })

  it('makes a valley whose interior angle closes with the book', () => {
    const big = solveVfold(open(Math.PI), v).fold.alpha
    const small = solveVfold(open(0.3), v).fold.alpha
    expect(big).toBeGreaterThan(small)
    expect(small).toBeLessThan(0.3)
  })

  it('the printed front faces the reader for both opening directions', () => {
    // toward the reader (+z): the V opens at them, they see inside it
    const toward = solveVfold(open(Math.PI), { at: 8, glue: [40, 40], angle: [70, 70] })
    expect(toward.panels.A.n[2]).toBeGreaterThan(0)
    // glue lines toward the head: a prow, they see its outside
    const prow = solveVfold(open(Math.PI), { at: 8, glue: [140, 140], angle: [110, 110] })
    expect(prow.panels.A.n[2]).toBeGreaterThan(0)
  })

  it('reports strain for an impossible card instead of tearing silently', () => {
    // halves too narrow to reach both glue lines once the pages spread apart
    const { strain } = solveVfold(open(Math.PI), { at: 4, glue: [80, 80], angle: [20, 20] })
    expect(strain).toBeGreaterThan(0)
  })
})

describe('box (parallel fold)', () => {
  const p = { span: [10, 16], a: 3, b: 4, h: 5 }

  it('stands as a rectangle on a flat open book', () => {
    const { panels, fold } = solveBox(open(Math.PI), p)
    expect(close(panels.wallA.ex, [0, 1, 0])).toBe(true)
    expect(close(toWorld(panels.wallA, 5, 0), [-3, 5, -13])).toBe(true)
    expect(close(toWorld(panels.topA, 8, 0), [0, 5, -13])).toBe(true)
    expect(close(toWorld(panels.topB, 12, 0), [4, 5, -13])).toBe(true)
    expect(close(toWorld(panels.wallB, 17, 0), [4, 0, -13])).toBe(true)
    expect(close(fold.o, [0, 5, -13])).toBe(true)
  })

  it('stays two parallelograms and folds flat along the bisector', () => {
    for (const a of angles) {
      const F = open(a)
      const { panels } = solveBox(F, p)
      // strip continuity at every fold line
      expect(dist(toWorld(panels.wallA, 5, 12), toWorld(panels.topA, 5, 12))).toBeLessThan(1e-9)
      expect(dist(toWorld(panels.topA, 8, 12), toWorld(panels.topB, 8, 12))).toBeLessThan(1e-9)
      expect(dist(toWorld(panels.topB, 12, 12), toWorld(panels.wallB, 12, 12))).toBeLessThan(1e-9)
      // glue edges on the pages
      expect(dist(toWorld(panels.wallA, 0, 0), [F.o[0] + F.a[0] * 3, F.a[1] * 3, -13])).toBeLessThan(1e-9)
      expect(Math.abs(dot(panels.topA.ex, F.a))).toBeCloseTo(1, 9)
    }
  })
})

describe('tent', () => {
  it('keeps its wall lengths and meets at a ridge above the gutter', () => {
    const p = { span: [2, 8], a: 4, b: 4, la: 6, lb: 6 }
    for (const a of angles) {
      const { panels, strain } = solveTent(open(a), p)
      expect(strain).toBe(0)
      const A = toWorld(panels.wallA, 0, 5)
      const T = toWorld(panels.wallA, 6, 5)
      const T2 = toWorld(panels.wallB, 6, 5)
      const B = toWorld(panels.wallB, 12, 5)
      expect(dist(T, T2)).toBeLessThan(1e-9)
      expect(dist(A, T)).toBeCloseTo(6, 9)
      expect(dist(T, B)).toBeCloseTo(6, 9)
    }
    const flat = solveTent(open(Math.PI), p)
    expect(toWorld(flat.panels.wallA, 6, 0)[1]).toBeCloseTo(Math.sqrt(36 - 16), 9)
  })
})

describe('flat, flap', () => {
  const { R } = pageFrames(open(Math.PI), 20)

  it('a flat card sits on its parent, turned clockwise as seen on the page', () => {
    const f = placeFlat(R, [10, 10], 90, 0.1)
    expect(close(f.n, R.n)).toBe(true)
    // its +x now runs down the page (+y, toward the reader)
    expect(close(f.ex, [0, 0, 1], 1e-9)).toBe(true)
    expect(toWorld(f, 0, 0)[1]).toBeCloseTo(0.1, 9)
  })

  it('a flap lies face-up shut, stands at 90°, lies face-down open', () => {
    const p = { at: [5, 5], rot: 0 }
    const shut = solveFlap(R, p, 0)
    expect(close(shut.panels.flap.n, R.n)).toBe(true)
    const up = solveFlap(R, p, Math.PI / 2)
    expect(Math.abs(dot(up.panels.flap.n, R.n))).toBeLessThan(1e-9)
    const flipped = solveFlap(R, p, Math.PI)
    expect(dot(flipped.panels.flap.n, R.n)).toBeCloseTo(-1, 9)
    expect(flipped.fold.alpha).toBeCloseTo(Math.PI, 9)
    // its hinge stays put
    expect(dist(toWorld(shut.panels.flap, 3, 0), toWorld(flipped.panels.flap, 3, 0))).toBeLessThan(1e-9)
    expect(len(up.fold.up)).toBeCloseTo(1, 9)
  })
})
