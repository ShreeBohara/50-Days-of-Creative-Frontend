// Physical validity of a pop-up spread, checked by sweeping the book from
// almost shut to flat open. A design passes only if it could be built from
// real card:
//   strain     no piece ever has to stretch (its mechanism always closes)
//   inside     no paper ever passes through a page
//   folds flat closed, every piece lies inside the page edges
//   smooth     nothing jumps between neighbouring angles (no branch flips)
//   collide    no two pieces pass through each other
// The tests run this on every spread, and scripts/preview-spread.mjs prints it.

import { CLOSED, H, W } from './dims.js'
import { poseSpread, restValue } from './spread.js'
import { toWorld } from './kinematics.js'
import { dot, sub } from './vec.js'

/** World-space vertices of every panel at one pose. */
export function panelGeometry(spread, pose) {
  const out = []
  for (const p of spread.pieces) {
    for (const pn of p.panels) {
      const f = pose.frames.get(`${p.id}.${pn.key}`)
      if (!f) continue
      out.push({
        piece: p.id,
        key: pn.key,
        frame: f,
        poly: pn.poly,
        world: pn.poly.map(([x, y]) => toWorld(f, x, y)),
      })
    }
  }
  return out
}

/**
 * A card must be glued along its glue lines (or it floats loose) and, if it
 * folds, stay one piece across each fold (or it falls apart in two).
 */
function attachment(p, report) {
  const panelOf = { vfold: { a: 'A', b: 'B' }, box: { a: 'wallA', b: 'wallB' }, tent: { a: 'wallA', b: 'wallB' } }[p.kind]
  const along = (poly, p0, dir, near = 0.03) => {
    let lo = Infinity
    let hi = -Infinity
    const edges = poly.length
    for (let i = 0; i < edges; i++) {
      const a = poly[i]
      const b = poly[(i + 1) % edges]
      for (let k = 0; k <= 8; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / 8
        const y = a[1] + ((b[1] - a[1]) * k) / 8
        const rx = x - p0[0]
        const ry = y - p0[1]
        const t = rx * dir[0] + ry * dir[1]
        if (Math.abs(rx * dir[1] - ry * dir[0]) < near && t >= -near) {
          lo = Math.min(lo, t)
          hi = Math.max(hi, t)
        }
      }
    }
    return hi - lo
  }
  if (p.kind === 'vfold' || p.kind === 'box' || p.kind === 'tent') {
    for (const gl of p.lines.glue) {
      const dx = gl.p1[0] - gl.p0[0]
      const dy = gl.p1[1] - gl.p0[1]
      const l = Math.hypot(dx, dy)
      const poly = p.panels.find((pn) => pn.key === panelOf[gl.side])?.poly ?? []
      if (along(poly, gl.p0, [dx / l, dy / l]) < 0.6) report('glue', p.id, `nothing to glue on its ${gl.side} side: the outline must run along the glue line`)
    }
    const creases = p.lines.folds.filter((f) => f.type !== 'hinge')
    const need = p.kind === 'vfold' ? 1 : p.kind === 'box' ? 3 : 1
    if (creases.length < need) report('apart', p.id, 'falls apart: the outline must cross every fold line')
    for (const f of creases) {
      if (Math.hypot(f.p1[0] - f.p0[0], f.p1[1] - f.p0[1]) < 0.6) report('apart', p.id, 'barely joined across a fold (< 6 mm of paper)')
    }
  }
}

/** Pieces related by mounting (they legitimately touch along a hinge). */
function related(spread, a, b) {
  if (a === b) return true
  const pa = spread.byId.get(a)
  const pb = spread.byId.get(b)
  return pa.parent === b || pb.parent === a
}

/** Does segment p→q pierce the planar polygon (frame f, card poly), away from its rim? */
function pierces(p, q, f, poly, tol) {
  const dp = dot(sub(p, f.o), f.n)
  const dq = dot(sub(q, f.o), f.n)
  if ((dp > tol && dq > tol) || (dp < -tol && dq < -tol)) return false
  if (Math.abs(dp - dq) < 1e-9) return false
  const t = dp / (dp - dq)
  if (t <= 0.02 || t >= 0.98) return false // touching at an end: hinges, glue lines
  const x = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]
  // back to card coordinates of the polygon's frame
  const r = sub(x, f.o)
  const cx = dot(r, f.ex)
  const cy = -dot(r, f.ey)
  return insideBy(poly, cx, cy, tol * 4)
}

/** Point in polygon, and at least `margin` away from its edges. */
function insideBy(poly, x, y, margin) {
  let inside = false
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    const ex = xi - xj
    const ey = yi - yj
    const l2 = ex * ex + ey * ey || 1
    const t = Math.max(0, Math.min(1, ((x - xj) * ex + (y - yj) * ey) / l2))
    best = Math.min(best, Math.hypot(x - (xj + ex * t), y - (yj + ey * t)))
  }
  return inside && best > margin
}

/**
 * Sweep the spread from nearly closed to flat open (left page flat, right page
 * turning, like a real page turn) with every mechanism at rest — and, for each
 * mechanism, at its far end too. Returns { ok, problems }.
 */
export function checkSpread(spread, { samples = 64, tol = 0.06, collisions = true, mechs = null } = {}) {
  const problems = []
  const seen = new Set()
  const report = (kind, piece, detail) => {
    const key = `${kind}:${piece}`
    if (seen.has(key)) return
    seen.add(key)
    problems.push({ kind, piece, detail })
  }
  // mechanism settings to test: at rest, and each mechanism at its other extreme
  const sets = mechs ?? [{}]
  if (!mechs) {
    for (const p of spread.pieces) {
      if (p.kind === 'flap') sets.push({ [p.id]: Math.PI * 0.999 }, { [p.id]: Math.PI / 2 })
      if (p.kind === 'slider') sets.push({ [p.id]: 1 })
      if (p.kind === 'wheel') sets.push({ [p.id]: restValue(p) + 90 }, { [p.id]: restValue(p) + 180 })
    }
  }
  for (const p of spread.pieces) attachment(p, report)
  for (const mech of sets) {
    // the reader works tabs, wheels and flaps with the book open (the app
    // settles them before a page turns), so those are checked near flat only
    const working = Object.keys(mech).length > 0
    const lo = working ? Math.PI * 0.82 : CLOSED * 1.5
    let prev = null
    for (let i = 0; i <= samples; i++) {
      const alpha = lo + ((Math.PI - lo) * i) / samples
      const pose = poseSpread(spread, Math.PI, Math.PI - alpha, mech)
      for (const [id, s] of pose.strainBy) if (s > 1e-6) report('strain', id, `needs stretching at ${(alpha / Math.PI * 180).toFixed(0)}°`)
      const geo = panelGeometry(spread, pose)
      const F = pose.gutter
      const nL = pose.frames.get('page:L').n
      const nR = pose.frames.get('page:R').n
      for (const g of geo) {
        for (const q of g.world) {
          if (!q.every(Number.isFinite)) {
            report('nan', g.piece, 'non-finite vertex')
            continue
          }
          const r = sub(q, F.o)
          const dl = dot(r, nL)
          const dr = dot(r, nR)
          if (dl < -tol || dr < -tol) {
            report('inside', g.piece, `${g.key} passes through a page at ${(alpha / Math.PI * 180).toFixed(0)}°`)
          }
          // paper touching a page must touch it ON the page, not past its
          // edge (flat open, both pages share a plane: either may hold it)
          let touching = 0
          let held = false
          for (const [side, dd] of [['L', dl], ['R', dr]]) {
            if (Math.abs(dd) > 0.02) continue
            touching++
            const P = pose.frames.get(`page:${side}`)
            const rr = sub(q, P.o)
            const x = dot(rr, P.ex)
            const y = -dot(rr, P.ey)
            if (x >= -tol && x <= W + tol && y >= -tol && y <= H + tol) held = true
          }
          if (touching && !held) report('offpage', g.piece, `${g.key} is glued beyond the edge of the page`)
        }
      }
      if (i === 0 && !working) {
        // shut: everything must lie on the page, inside its edges (a
        // pull-tab's handle is meant to overhang the edge)
        const R = pose.frames.get('page:R')
        for (const g of geo) {
          if (spread.byId.get(g.piece).kind === 'slider') continue
          for (const q of g.world) {
            const r = sub(q, R.o)
            const x = dot(r, R.ex)
            const y = -dot(r, R.ey)
            if (x < -tol || x > W + tol || y < -tol || y > H + tol) {
              report('flat', g.piece, `${g.key} sticks out of the shut book (${x.toFixed(1)}, ${y.toFixed(1)})`)
            }
          }
        }
      }
      if (prev) {
        // a legitimate step moves a point ~(distance from spine)·Δα, about
        // 1 cm here; a branch flip throws a panel across its own height
        for (let k = 0; k < geo.length && k < prev.length; k++) {
          const a = geo[k].world
          const b = prev[k].world
          for (let v = 0; v < a.length; v++) {
            const d = Math.hypot(a[v][0] - b[v][0], a[v][1] - b[v][1], a[v][2] - b[v][2])
            if (d > 3.5) report('smooth', geo[k].piece, `${geo[k].key} jumps ${d.toFixed(2)} cm`)
          }
        }
      }
      if (collisions && i % 4 === 0) {
        for (let a = 0; a < geo.length; a++) {
          for (let b = 0; b < geo.length; b++) {
            if (a === b || related(spread, geo[a].piece, geo[b].piece)) continue
            const ga = geo[a]
            const gb = geo[b]
            const n = ga.world.length
            for (let v = 0; v < n; v++) {
              if (pierces(ga.world[v], ga.world[(v + 1) % n], gb.frame, gb.poly, 0.01)) {
                report('collide', `${ga.piece}×${gb.piece}`, `${ga.key} cuts ${gb.piece}.${gb.key} at ${(alpha / Math.PI * 180).toFixed(0)}°`)
                break
              }
            }
          }
        }
      }
      prev = geo
    }
  }
  return { ok: problems.length === 0, problems }
}
