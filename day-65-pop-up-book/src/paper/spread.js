// A SPREAD is two facing pages plus the pop-up pieces glued across them.
// Spreads are authored as plain data (see src/spreads/*), compiled once into
// panels (card regions, each with its own 3D frame) and posed every frame from
// the angle between the pages and the reader's mechanisms (flaps, wheels,
// pull-tabs).
//
// Piece kinds and what they mount on (`on`):
//   vfold, box, tent      across a FOLD: 'gutter', or another piece that makes
//                         a fold — a vfold (its valley), a box (its raised
//                         top crease), a flap (its hinge)
//   flat, flap, wheel,    onto a PLANE: 'page:L', 'page:R', or one panel of a
//   slider                piece, 'pieceId.panel' (e.g. 'stage.topA', 'tree.A')

import { CARD, H, LAYER, W } from './dims.js'
import {
  gutterFold,
  pageFrames,
  placeFlat,
  solveBox,
  solveFlap,
  solveSlider,
  solveTent,
  solveVfold,
  solveWheel,
  DEG,
} from './kinematics.js'
import { area, bbox, circle, clipAll, rect, segmentInside } from './polygon.js'

const FOLD_KINDS = new Set(['vfold', 'box', 'tent'])
const PLANE_KINDS = new Set(['flat', 'flap', 'wheel', 'slider'])
/** pieces whose own hinge is a fold others can be glued across */
const MAKES_FOLD = new Set(['vfold', 'box', 'flap'])

const PANELS = {
  vfold: ['A', 'B'],
  box: ['wallA', 'topA', 'topB', 'wallB'],
  tent: ['wallA', 'wallB'],
  flat: ['card'],
  flap: ['flap'],
  wheel: ['disc'],
  slider: ['strip'],
}

/** Default flat outline of each kind, in card coordinates. */
function defaultOutline(p) {
  switch (p.kind) {
    case 'box': {
      const L = 2 * p.h + p.a + p.b
      return rect(0, p.span[0], L, p.span[1] - p.span[0])
    }
    case 'tent':
      return rect(0, p.span[0], p.la + p.lb, p.span[1] - p.span[0])
    case 'wheel':
      return circle(0, 0, p.radius, 72)
    case 'flap':
    case 'slider':
    case 'flat':
      if (p.size) return rect(0, 0, p.size[0], p.size[1])
      break
  }
  throw new Error(`piece ${p.id}: needs an outline`)
}

/** Split a whole-card polygon into the regions each panel owns. */
function splitPanels(p, poly) {
  switch (p.kind) {
    case 'vfold': {
      const [ba, bb] = [p.angle[0] * DEG, p.angle[1] * DEG]
      // half A: x ≤ 0 and on the crease side of glue line A
      const dA = [-Math.sin(ba), -Math.cos(ba)]
      const dB = [Math.sin(bb), -Math.cos(bb)]
      const up = [0, -1]
      const towardCrease = (d) => {
        const k = up[0] * d[0] + up[1] * d[1]
        const n = [up[0] - k * d[0], up[1] - k * d[1]]
        const l = Math.hypot(n[0], n[1]) || 1
        return [n[0] / l, n[1] / l]
      }
      return {
        A: clipAll(poly, [
          [[0, 0], [-1, 0]],
          [[0, 0], towardCrease(dA)],
        ]),
        B: clipAll(poly, [
          [[0, 0], [1, 0]],
          [[0, 0], towardCrease(dB)],
        ]),
      }
    }
    case 'box': {
      const xs = [0, p.h, p.h + p.a, p.h + p.a + p.b, 2 * p.h + p.a + p.b]
      const out = {}
      PANELS.box.forEach((k, i) => {
        out[k] = clipAll(poly, [
          [[xs[i], 0], [1, 0]],
          [[xs[i + 1], 0], [-1, 0]],
        ])
      })
      return out
    }
    case 'tent':
      return {
        wallA: clipAll(poly, [
          [[0, 0], [1, 0]],
          [[p.la, 0], [-1, 0]],
        ]),
        wallB: clipAll(poly, [
          [[p.la, 0], [1, 0]],
          [[p.la + p.lb, 0], [-1, 0]],
        ]),
      }
    default:
      return { [PANELS[p.kind][0]]: poly }
  }
}

/** Fold and glue lines of a piece's flat card (for the template and x-ray view). */
function cardLines(p, poly) {
  const folds = []
  const glue = []
  const line = (list, p0, p1, type) => {
    for (const [t0, t1] of segmentInside(poly, p0, p1)) {
      list.push({
        type,
        p0: [p0[0] + (p1[0] - p0[0]) * t0, p0[1] + (p1[1] - p0[1]) * t0],
        p1: [p0[0] + (p1[0] - p0[0]) * t1, p0[1] + (p1[1] - p0[1]) * t1],
      })
    }
  }
  const b = bbox([poly])
  const far = Math.max(b.w, b.h) * 2 + 10
  switch (p.kind) {
    case 'vfold': {
      const [ba, bb] = [p.angle[0] * DEG, p.angle[1] * DEG]
      line(folds, [0, 0], [0, -far], 'valley')
      // glue lines run along each half's lower edge, as far as paper reaches
      // there — measured on the clipped halves, which always have an edge on
      // their glue line (a traced outline may have no vertex on it)
      const halves = splitPanels(p, poly)
      const reach = (d, half) => {
        let t = 0
        for (const [x, y] of half ?? []) {
          const along = x * d[0] + y * d[1]
          if (Math.abs(x * d[1] - y * d[0]) < 0.05 && along > t) t = along
        }
        return t
      }
      const dA = [-Math.sin(ba), -Math.cos(ba)]
      const dB = [Math.sin(bb), -Math.cos(bb)]
      const tA = reach(dA, halves.A)
      const tB = reach(dB, halves.B)
      glue.push({ type: 'glue', side: 'a', p0: [0, 0], p1: [dA[0] * Math.max(tA, 1e-3), dA[1] * Math.max(tA, 1e-3)] })
      glue.push({ type: 'glue', side: 'b', p0: [0, 0], p1: [dB[0] * Math.max(tB, 1e-3), dB[1] * Math.max(tB, 1e-3)] })
      break
    }
    case 'box': {
      const xs = [p.h, p.h + p.a, p.h + p.a + p.b]
      line(folds, [xs[0], b.y0 - 1], [xs[0], b.y1 + 1], 'mountain')
      line(folds, [xs[1], b.y0 - 1], [xs[1], b.y1 + 1], 'valley')
      line(folds, [xs[2], b.y0 - 1], [xs[2], b.y1 + 1], 'mountain')
      glue.push({ type: 'glue', side: 'a', p0: [0, b.y0], p1: [0, b.y1] })
      glue.push({ type: 'glue', side: 'b', p0: [2 * p.h + p.a + p.b, b.y0], p1: [2 * p.h + p.a + p.b, b.y1] })
      break
    }
    case 'tent':
      line(folds, [p.la, b.y0 - 1], [p.la, b.y1 + 1], 'mountain')
      glue.push({ type: 'glue', side: 'a', p0: [0, b.y0], p1: [0, b.y1] })
      glue.push({ type: 'glue', side: 'b', p0: [p.la + p.lb, b.y0], p1: [p.la + p.lb, b.y1] })
      break
    case 'flap':
      line(folds, [b.x0 - 1, 0], [b.x1 + 1, 0], 'hinge')
      break
  }
  return { folds, glue }
}

/**
 * Compile an authored spread: resolve mounts, order pieces parent-first, split
 * every card into panels and collect its fold lines. Throws on authoring
 * errors (unknown mount, wrong mount type, cycles) so they surface in tests.
 */
export function compileSpread(def) {
  const byId = new Map()
  for (const p of def.pieces ?? []) {
    if (byId.has(p.id)) throw new Error(`${def.id}: duplicate piece id ${p.id}`)
    if (!PANELS[p.kind]) throw new Error(`${def.id}/${p.id}: unknown kind ${p.kind}`)
    byId.set(p.id, p)
  }
  const parentOf = (p) => {
    const on = p.on ?? 'gutter'
    if (on === 'gutter' || on === 'page:L' || on === 'page:R') return null
    return on.split('.')[0]
  }
  // depth-first ordering: parents before children
  const order = []
  const state = new Map()
  const visit = (id, trail) => {
    const s = state.get(id)
    if (s === 2) return
    if (s === 1) throw new Error(`${def.id}: mount cycle ${trail.join(' → ')}`)
    state.set(id, 1)
    const p = byId.get(id)
    const parent = parentOf(p)
    if (parent) {
      if (!byId.has(parent)) throw new Error(`${def.id}/${id}: mounted on unknown piece ${parent}`)
      visit(parent, [...trail, parent])
    }
    state.set(id, 2)
    order.push(id)
  }
  for (const id of byId.keys()) visit(id, [id])

  const lifts = new Map() // per plane: next free layer
  const pieces = order.map((id) => {
    const p = byId.get(id)
    const on = p.on ?? 'gutter'
    const isPlaneMount = on.startsWith('page:') || on.includes('.')
    if (FOLD_KINDS.has(p.kind) && isPlaneMount) throw new Error(`${def.id}/${id}: a ${p.kind} must be glued across a fold, not onto ${on}`)
    if (PLANE_KINDS.has(p.kind) && !isPlaneMount) throw new Error(`${def.id}/${id}: a ${p.kind} must sit on a plane (page:L, page:R or piece.panel), not ${on}`)
    if (FOLD_KINDS.has(p.kind) && on !== 'gutter' && !MAKES_FOLD.has(byId.get(on)?.kind)) {
      throw new Error(`${def.id}/${id}: ${on} is a ${byId.get(on)?.kind}, which makes no fold to glue across`)
    }
    if (isPlaneMount && on.includes('.')) {
      const [pid, panel] = on.split('.')
      if (!PANELS[byId.get(pid).kind].includes(panel)) throw new Error(`${def.id}/${id}: ${pid} has no panel ${panel}`)
    }
    // outlines may be computed (traced from a drawing once fonts are ready)
    let shape = typeof p.outline === 'function' ? p.outline() : p.outline
    let holeList = typeof p.holes === 'function' ? p.holes() : p.holes
    if (shape && !Array.isArray(shape)) {
      holeList = [...(holeList ?? []), ...(shape.holes ?? [])]
      shape = shape.outline
    }
    const outline = shape ?? defaultOutline(p)
    if (outline.length < 3) throw new Error(`${def.id}/${id}: outline needs at least 3 points`)
    const split = splitPanels(p, outline)
    const holes = (holeList ?? []).map((h) => splitPanels(p, h))
    const panels = PANELS[p.kind].map((key) => ({
      key,
      poly: p.panels?.[key] ?? split[key] ?? [],
      holes: holes.map((h) => h[key] ?? []).filter((h) => h.length >= 3),
    }))
    for (const pn of panels) {
      // ShapeGeometry wants a consistent winding; normalise outlines to clockwise
      if (pn.poly.length && area(pn.poly) < 0) pn.poly = pn.poly.slice().reverse()
    }
    let lift = p.lift
    if (PLANE_KINDS.has(p.kind) && lift == null) {
      const k = lifts.get(on) ?? 0
      lifts.set(on, k + 1)
      lift = CARD / 2 + LAYER * (k + 0.5)
    }
    const allPolys = panels.map((pn) => pn.poly).filter((q) => q.length)
    return {
      ...p,
      on,
      lift: lift ?? 0,
      parent: parentOf(p),
      outline,
      holes: holeList ?? [],
      panels: panels.filter((pn) => pn.poly.length >= 3),
      box: bbox(allPolys.length ? allPolys : [outline]),
      lines: cardLines(p, outline),
    }
  })
  return { ...def, pieces, byId: new Map(pieces.map((p) => [p.id, p])) }
}

/** Default reader-controlled value of a mechanism. */
export function restValue(p) {
  if (p.kind === 'flap') return (p.open ?? 0) * DEG
  if (p.kind === 'wheel') return p.turn ?? 0
  if (p.kind === 'slider') return p.t ?? 0
  return 0
}

/** A mechanism's value normalised to 0…1, for pieces it drives. */
function driveT(p, v) {
  if (p.kind === 'flap') return v / Math.PI
  if (p.kind === 'wheel') return v / 360
  return v
}

/**
 * Pose a compiled spread. phiL / phiR are the angles of its left and right
 * pages about the spine; mech maps mechanism ids to their current values
 * (flap: radians open, wheel: degrees turned, slider: 0…1).
 *
 * Returns frames for every panel ('piece.panel' and 'page:L', 'page:R'), the
 * fold each piece makes, and the worst strain (0 for any valid design).
 */
export function poseSpread(spread, phiL, phiR, mech = {}, height = H) {
  const F = gutterFold(phiL, phiR, height)
  const pages = pageFrames(F, W)
  const frames = new Map([
    ['page:L', pages.L],
    ['page:R', pages.R],
  ])
  const folds = new Map([['gutter', F]])
  const strainBy = new Map()
  let strain = 0
  for (const p of spread.pieces) {
    const value = mech[p.id] ?? restValue(p)
    let res
    if (FOLD_KINDS.has(p.kind)) {
      const fold = folds.get(p.on)
      if (!fold) continue
      res = p.kind === 'vfold' ? solveVfold(fold, p) : p.kind === 'box' ? solveBox(fold, p) : solveTent(fold, p)
    } else {
      const parent = frames.get(p.on)
      if (!parent) continue
      let at = p.at ?? [0, 0]
      let rot = p.rot ?? 0
      if (p.drive) {
        const by = spread.byId.get(p.drive.by)
        const t = by ? driveT(by, mech[by.id] ?? restValue(by)) : 0
        at = [at[0] + (p.drive.move?.[0] ?? 0) * t, at[1] + (p.drive.move?.[1] ?? 0) * t]
        rot += (p.drive.turn ?? 0) * t
      }
      const q = { ...p, at, rot }
      if (p.kind === 'flap') res = solveFlap(parent, q, value)
      else if (p.kind === 'wheel') res = solveWheel(parent, q, value)
      else if (p.kind === 'slider') res = solveSlider(parent, q, value)
      else res = { panels: { card: placeFlat(parent, at, rot, p.lift) }, fold: null, strain: 0 }
    }
    for (const [k, f] of Object.entries(res.panels)) frames.set(`${p.id}.${k}`, f)
    if (res.fold) folds.set(p.id, res.fold)
    if (res.strain > 0) strainBy.set(p.id, res.strain)
    strain = Math.max(strain, res.strain)
  }
  return { frames, folds, strain, strainBy, gutter: F }
}

/**
 * compileSpread, but a spread that fails to compile (a bad outline, a
 * half-written file) degrades to its printed pages instead of taking the
 * whole book down. The main thread and the print worker both use this, so
 * their card layouts always agree.
 */
export function compileSafe(def) {
  try {
    return compileSpread(def)
  } catch (err) {
    console.error(`spread ${def?.id}: ${err?.message ?? err}`)
    return compileSpread({ id: def?.id ?? 'broken', title: def?.title ?? '', paper: def?.paper, pages: def?.pages ?? {}, pieces: [], spots: def?.spots ?? [] })
  }
}
