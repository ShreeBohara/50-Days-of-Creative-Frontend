// Paper-engineering kinematics: every pop-up in the book is a rigid mechanism
// whose single degree of freedom is the angle of the fold it is glued across.
//
// A FOLD is a hinge line with two flat planes meeting on it:
//   { o, s, a, b, up, alpha }
//   o      a point on the hinge
//   s      unit direction of the hinge
//   a, b   unit in-plane directions of the two planes, perpendicular to s,
//          pointing away from the hinge
//   up     unit direction into the fold's interior (the bisector of a and b;
//          for a book lying flat open it is the sky)
//   alpha  dihedral angle between the planes, 0 (closed) … π (flat open)
//
// A PANEL frame maps a piece's flat-card coordinates into the world:
//   { o, ex, ey, n }   card point (x, y) — canvas convention, cm, y DOWN —
//   lands at  o + x·ex − y·ey.  n = ex × ey is the normal of the card's
//   printed FRONT.
//
// Pieces mount across folds and create new folds (a V-fold's valley, a box's
// raised top crease, a flap's hinge), so a spread is a tree solved top-down
// every frame. Everything is closed form: no iteration, no physics.

import { add, cross, dot, madd, neg, norm, rotate, safeAcos, scale, sub } from './vec.js'

export const DEG = Math.PI / 180

/** Interior bisector of a fold from its two plane directions and handedness. */
function interior(a, b, s) {
  // (a − b) × s stays well defined when the fold is flat open (a = −b),
  // where a + b would vanish. For the book's gutter (s toward the reader,
  // a = left page, b = right page) it is the sky.
  const u = cross(sub(a, b), s)
  const l = Math.hypot(u[0], u[1], u[2])
  return l > 1e-9 ? scale(u, 1 / l) : a
}

/**
 * The book's gutter for a spread whose left page lies at angle phiL and right
 * page at phiR (radians about the spine: 0 = flat to the right, π = flat to the
 * left). The hinge runs from the head of the book (o, z = −H/2) toward the
 * reader (+z), so `at` along it is the same as a page's y coordinate.
 */
export function gutterFold(phiL, phiR, H) {
  const a = [Math.cos(phiL), Math.sin(phiL), 0]
  const b = [Math.cos(phiR), Math.sin(phiR), 0]
  const s = [0, 0, 1]
  return { o: [0, 0, -H / 2], s, a, b, up: interior(a, b, s), alpha: Math.max(0, phiL - phiR) }
}

/**
 * Frames of the two pages of a spread, in page-image coordinates: x from the
 * left edge of the printed page to its right edge, y from head to tail.
 */
export function pageFrames(F, W) {
  const ey = neg(F.s)
  const R = { o: F.o, ex: F.b, ey, n: cross(F.b, ey) }
  const exL = neg(F.a)
  const L = { o: madd(F.o, F.a, W), ex: exL, ey, n: cross(exL, ey) }
  return { L, R }
}

/** World position of card point (x, y) on a panel frame. */
export function toWorld(f, x, y) {
  return [
    f.o[0] + x * f.ex[0] - y * f.ey[0],
    f.o[1] + x * f.ex[1] - y * f.ey[1],
    f.o[2] + x * f.ex[2] - y * f.ey[2],
  ]
}

/**
 * V-FOLD (angle fold). A card creased down its middle; each half is glued to
 * one plane of the mount fold along a line through the same hinge point P.
 *
 *   p.at      distance of P along the mount fold (cm)
 *   p.glue    [θa, θb] angle of each glue line from the hinge direction s,
 *             toward plane a / plane b (deg). < 90 points the glue lines at
 *             the reader, so the V opens toward them.
 *   p.angle   [βa, βb] angle on the card between the crease and each glue
 *             line (deg). 90 = a card with a straight bottom edge.
 *
 * Card coords: the crease is the line x = 0 running UP from the origin
 * (y ≤ 0); half A is x ≤ 0, half B is x ≥ 0. Glue line A leaves the origin
 * along (−sin βa, −cos βa), glue line B along (sin βb, −cos βb).
 *
 * The crease direction c keeps its angle to both glue lines (the halves are
 * rigid): c·ga = cos βa, c·gb = cos βb, |c| = 1 — a spherical four-bar whose
 * two solutions mirror through the plane of ga, gb. The one on the fold's
 * interior side is the pop-up; the other would sit under the page.
 */
export function solveVfold(F, p) {
  const P = madd(F.o, F.s, p.at)
  const ta = p.glue[0] * DEG
  const tb = p.glue[1] * DEG
  const ga = add(scale(F.s, Math.cos(ta)), scale(F.a, Math.sin(ta)))
  const gb = add(scale(F.s, Math.cos(tb)), scale(F.b, Math.sin(tb)))
  const ca = Math.cos(p.angle[0] * DEG)
  const cb = Math.cos(p.angle[1] * DEG)
  const g = dot(ga, gb)
  const det = Math.max(1e-12, 1 - g * g)
  const x = (ca - g * cb) / det
  const y = (cb - g * ca) / det
  const q = add(scale(ga, x), scale(gb, y))
  const k = cross(ga, gb)
  // 1 − |q|² < 0 means no rigid configuration exists at this angle: the card
  // would have to stretch. Valid designs never get there; report it as strain.
  const rest = 1 - dot(q, q)
  const z = Math.sqrt(Math.max(0, rest) / det)
  const side = dot(k, F.up) >= 0 ? 1 : -1
  const c = norm(madd(q, k, z * side))
  const yA = norm(sub(ga, scale(c, dot(ga, c))))
  const yB = norm(sub(gb, scale(c, dot(gb, c))))
  const exA = neg(yA)
  return {
    panels: {
      A: { o: P, ex: exA, ey: c, n: cross(exA, c) },
      B: { o: P, ex: yB, ey: c, n: cross(yB, c) },
    },
    // the valley between the halves; children glued across it pop up as
    // the V opens. Its interior angle is always < π, so a + b is safe.
    fold: { o: P, s: c, a: yA, b: yB, up: norm(add(yA, yB)), alpha: safeAcos(dot(yA, yB)) },
    strain: rest < -1e-9 ? -rest : 0,
  }
}

/**
 * BOX (180° parallel fold, "floating layer"). A strip glued to plane a at
 * distance p.a from the hinge and to plane b at p.b, rising p.h. It closes as
 * two parallelograms: the walls stay parallel to the fold's bisector and each
 * half of the top stays parallel to its own plane — so the top's centre
 * crease M is a raised copy of the mount fold, and children glued across it
 * behave exactly like pieces on the gutter.
 *
 * Card coords: x runs along the strip — wallA [0,h], topA [h,h+a],
 * topB [h+a, h+a+b], wallB [h+a+b, 2h+a+b]; y is the distance along the
 * hinge (same as `at`), increasing toward the reader.
 */
export function solveBox(F, p) {
  const H = scale(F.up, p.h)
  const A0 = madd(F.o, F.a, p.a)
  const B0 = madd(F.o, F.b, p.b)
  const C0 = add(A0, H)
  const D0 = add(B0, H)
  const M0 = add(F.o, H)
  const ey = neg(F.s)
  const frame = (o, ex) => ({ o, ex, ey, n: cross(ex, ey) })
  const exTopA = neg(F.a)
  const exWallB = neg(F.up)
  return {
    panels: {
      wallA: frame(A0, F.up),
      topA: frame(madd(C0, F.a, p.h), exTopA),
      topB: frame(madd(M0, F.b, -(p.h + p.a)), F.b),
      wallB: frame(madd(D0, F.up, p.h + p.a + p.b), exWallB),
    },
    fold: { o: M0, s: F.s, a: F.a, b: F.b, up: F.up, alpha: F.alpha },
    strain: 0,
  }
}

/**
 * TENT (two-wall parallel fold). Glued at p.a on plane a and p.b on plane b,
 * walls of length p.la and p.lb meeting at a ridge — a triangle whose base
 * shortens as the fold closes, solved by circle intersection.
 *
 * Card coords: x along the strip — wallA [0, la], wallB [la, la+lb]; y along
 * the hinge as for the box.
 */
export function solveTent(F, p) {
  const A0 = madd(F.o, F.a, p.a)
  const B0 = madd(F.o, F.b, p.b)
  const AB = sub(B0, A0)
  const d = Math.max(1e-9, Math.hypot(AB[0], AB[1], AB[2]))
  const e1 = scale(AB, 1 / d)
  let perp = cross(F.s, e1)
  if (dot(perp, F.up) < 0) perp = neg(perp)
  const xa = (p.la * p.la - p.lb * p.lb + d * d) / (2 * d)
  const h2 = p.la * p.la - xa * xa
  const T = madd(madd(A0, e1, xa), perp, Math.sqrt(Math.max(0, h2)))
  const ey = neg(F.s)
  const exA = norm(sub(T, A0))
  const exB = norm(sub(B0, T))
  return {
    panels: {
      wallA: { o: A0, ex: exA, ey, n: cross(exA, ey) },
      wallB: { o: madd(T, exB, -p.la), ex: exB, ey, n: cross(exB, ey) },
    },
    fold: null,
    strain: h2 < -1e-9 ? -h2 : 0,
  }
}

/**
 * A card glued flat onto a panel (or a page), at canvas point `at` of the
 * parent, turned `rot` degrees clockwise as seen on the parent, lifted
 * `lift` cm off it along the parent's front normal.
 */
export function placeFlat(parent, at, rot = 0, lift = 0) {
  const t = rot * DEG
  // clockwise on a y-down canvas is a negative turn about the front normal
  const ex = rotate(parent.ex, parent.n, -t)
  const ey = rotate(parent.ey, parent.n, -t)
  const o = madd(toWorld(parent, at[0], at[1]), parent.n, lift)
  return { o, ex, ey, n: parent.n }
}

/**
 * LIFT-THE-FLAP: a card hinged on a plane, opened psi radians by the reader.
 * The hinge is the flap's own x-axis; its body lies at canvas y > 0. Closed,
 * it lies face-up on the parent; fully open (π) it lies face-down beside its
 * hinge showing its back. Its hinge is a fold like the gutter, so pieces glued
 * across it pop up as it is lifted.
 */
export function solveFlap(parent, p, psi) {
  const base = placeFlat(parent, p.at, p.rot ?? 0, p.lift ?? 0)
  const bodyIn = neg(base.ey) // canvas +y on the parent plane
  const n = base.n
  const body = add(scale(bodyIn, Math.cos(psi)), scale(n, Math.sin(psi)))
  const ey = neg(body)
  const half = psi / 2
  return {
    panels: { flap: { o: base.o, ex: base.ex, ey, n: cross(base.ex, ey) } },
    fold: {
      o: base.o,
      s: base.ex,
      a: bodyIn,
      b: body,
      up: norm(add(scale(bodyIn, Math.cos(half)), scale(n, Math.sin(half)))),
      alpha: psi,
    },
    strain: 0,
  }
}

/** A disc riveted to its parent at `at`, turned `angle` degrees clockwise. */
export function solveWheel(parent, p, angle) {
  return { panels: { disc: placeFlat(parent, p.at, (p.rot ?? 0) + angle, p.lift ?? 0) }, fold: null, strain: 0 }
}

/** A pull-tab strip sliding t ∈ [0,1] along p.travel (canvas cm on the parent). */
export function solveSlider(parent, p, t) {
  const at = [p.at[0] + p.travel[0] * t, p.at[1] + p.travel[1] * t]
  return { panels: { strip: placeFlat(parent, at, p.rot ?? 0, p.lift ?? 0) }, fold: null, strain: 0 }
}
