// Die-cut outlines from drawings. A painter-style draw function fills a mask
// (type, circles, any Path2D — overlaps union for free), then marching squares
// traces its edge into polygons and Ramer–Douglas–Peucker trims them to a
// cutter's precision. This is how the numerals, silhouettes and skylines in
// the book get their exact shapes.

import { makeCanvas } from './riso.js'
import { area, contains } from '../paper/polygon.js'

/**
 * trace(box, draw, opts) → { outline, holes, islands }
 *   box      {x0, y0, w, h} region of card space (cm) to rasterise
 *   draw     (ctx) => void, in card cm, fill anything opaque
 *   opts.res px per cm while tracing (default 24)
 *   opts.tol simplification tolerance in cm (default 0.02)
 * outline is the largest piece; holes are the gaps inside it; islands are
 * other separate pieces (a card must be one piece — callers join them).
 */
export function trace(box, draw, { res = 24, tol = 0.02 } = {}) {
  const pad = 2
  const W = Math.ceil(box.w * res) + pad * 2
  const H = Math.ceil(box.h * res) + pad * 2
  const c = makeCanvas(W, H)
  // read back once: a CPU-backed canvas skips a GPU readback per trace
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.setTransform(res, 0, 0, res, pad - box.x0 * res, pad - box.y0 * res)
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  draw(ctx)
  const a = ctx.getImageData(0, 0, W, H).data
  const v = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) v[i] = a[i * 4 + 3] / 255
  const loops = march(v, W, H, 0.5)
    .map((loop) => simplify(loop, tol * res))
    .filter((l) => l.length >= 3)
    .map((l) => l.map(([x, y]) => [(x - pad) / res + box.x0, (y - pad) / res + box.y0]))
  if (!loops.length) return { outline: [], holes: [], islands: [] }
  loops.sort((p, q) => Math.abs(area(q)) - Math.abs(area(p)))
  const outline = loops[0]
  const holes = []
  const islands = []
  for (const l of loops.slice(1)) {
    const inside = contains(outline, l[0][0], l[0][1])
    // a loop inside the outline is a hole unless it's an island in a hole
    if (inside && !holes.some((h) => contains(h, l[0][0], l[0][1]))) holes.push(l)
    else if (!inside) islands.push(l)
  }
  return { outline, holes, islands }
}

/**
 * Marching squares over a scalar field (values in [0,1], threshold `iso`).
 * Returns closed loops in pixel coordinates (sample centres at integers).
 */
export function march(v, W, H, iso) {
  // a zero-padded copy: no bounds checks in the loop (outside the image = 0)
  const PW = W + 2
  const PH = H + 2
  const P = new Float32Array(PW * PH)
  for (let y = 0; y < H; y++) P.set(v.subarray(y * W, y * W + W), (y + 1) * PW + 1)
  const at = (x, y) => P[(y + 1) * PW + (x + 1)]
  const lerp = (a, b) => (iso - a) / (b - a || 1e-9)
  // segments keyed by their start point; each edge midpoint gets a stable
  // numeric key (edge 0 = top (x,y)-(x+1,y), 1 = left (x,y)-(x,y+1);
  // bottom/right belong to the neighbouring cells so shared edges share keys)
  const next = new Map()
  const pts = new Map()
  const edgePoint = (x, y, e) => {
    const k = ((y + 1) * PW + (x + 1)) * 2 + e
    if (!pts.has(k)) {
      if (e === 0) pts.set(k, [x + lerp(at(x, y), at(x + 1, y)), y])
      else pts.set(k, [x, y + lerp(at(x, y), at(x, y + 1))])
    }
    return k
  }
  const T = (x, y) => edgePoint(x, y, 0)
  const B = (x, y) => edgePoint(x, y + 1, 0)
  const L = (x, y) => edgePoint(x, y, 1)
  const R = (x, y) => edgePoint(x + 1, y, 1)
  const seg = (a, b) => next.set(a, b)
  for (let y = -1; y < H; y++) {
    const row = (y + 1) * PW
    // carry the right-hand samples forward as the next cell's left-hand ones
    let tl = P[row] > iso ? 8 : 0
    let bl = P[row + PW] > iso ? 1 : 0
    for (let x = -1; x < W; x++) {
      const i = row + x + 2
      const tr = P[i] > iso ? 4 : 0
      const br = P[i + PW] > iso ? 2 : 0
      const c = tl | tr | br | bl
      tl = tr ? 8 : 0
      bl = br ? 1 : 0
      if (c === 0 || c === 15) continue
      // oriented so the filled region is on the right of each segment
      switch (c) {
        case 1: seg(L(x, y), B(x, y)); break
        case 2: seg(B(x, y), R(x, y)); break
        case 3: seg(L(x, y), R(x, y)); break
        case 4: seg(R(x, y), T(x, y)); break
        case 5: seg(L(x, y), T(x, y)); seg(R(x, y), B(x, y)); break
        case 6: seg(B(x, y), T(x, y)); break
        case 7: seg(L(x, y), T(x, y)); break
        case 8: seg(T(x, y), L(x, y)); break
        case 9: seg(T(x, y), B(x, y)); break
        case 10: seg(T(x, y), R(x, y)); seg(B(x, y), L(x, y)); break
        case 11: seg(T(x, y), R(x, y)); break
        case 12: seg(R(x, y), L(x, y)); break
        case 13: seg(R(x, y), B(x, y)); break
        case 14: seg(B(x, y), L(x, y)); break
      }
    }
  }
  const loops = []
  const used = new Set()
  for (const start of next.keys()) {
    if (used.has(start)) continue
    const loop = []
    let k = start
    while (k != null && !used.has(k)) {
      used.add(k)
      loop.push(pts.get(k))
      k = next.get(k)
    }
    if (loop.length >= 3) loops.push(loop)
  }
  return loops
}

/** Ramer–Douglas–Peucker for a closed loop. */
export function simplify(loop, eps) {
  if (loop.length < 4) return loop
  // split the loop at its two farthest-apart points, simplify each chain
  let i0 = 0
  let i1 = 0
  let best = -1
  for (let i = 0; i < loop.length; i += Math.max(1, loop.length >> 6)) {
    for (let j = 0; j < loop.length; j++) {
      const d = (loop[i][0] - loop[j][0]) ** 2 + (loop[i][1] - loop[j][1]) ** 2
      if (d > best) {
        best = d
        i0 = i
        i1 = j
      }
    }
  }
  if (i0 > i1) [i0, i1] = [i1, i0]
  const a = rdp(loop.slice(i0, i1 + 1), eps)
  const b = rdp([...loop.slice(i1), ...loop.slice(0, i0 + 1)], eps)
  return [...a.slice(0, -1), ...b.slice(0, -1)]
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts
  const [x0, y0] = pts[0]
  const [x1, y1] = pts[pts.length - 1]
  const dx = x1 - x0
  const dy = y1 - y0
  const L = Math.hypot(dx, dy) || 1e-9
  let idx = 0
  let dmax = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - x0) * dy - (pts[i][1] - y0) * dx) / L
    if (d > dmax) {
      dmax = d
      idx = i
    }
  }
  if (dmax <= eps) return [pts[0], pts[pts.length - 1]]
  const left = rdp(pts.slice(0, idx + 1), eps)
  const right = rdp(pts.slice(idx), eps)
  return [...left.slice(0, -1), ...right]
}
