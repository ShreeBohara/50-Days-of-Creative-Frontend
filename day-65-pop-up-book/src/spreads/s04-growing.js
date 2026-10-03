// Chapter IV — Growing Things. A garden grown from seeds, in layers: a
// harmonograph sun (43) setting into a valley of noise-built hills (5), a wood
// whose canopy is a flow field (8), and in front a sunflower (42) that turns
// its face to the low sun and blooms in three floating layers as the page
// opens, fenced by a double helix (13). On the right page a folded antique
// chart (44) lifts open: an island stands up out of the sea, and a ship is
// already standing in for it.

import { trace } from '../art/trace.js'
import { fbm } from '../art/rng.js'
import { area } from '../paper/polygon.js'
import { W } from '../paper/dims.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayIndex, folio, runningHead } from './furniture.js'

const CH = CHAPTERS[3]
const [pl, pr] = folios(4)
const INK = { leaf: 'green', sun: 'sunflower', deep: 'teal' }
const D2R = Math.PI / 180
const TAU = Math.PI * 2

// ------------------------------------------------------------------ helpers

/**
 * Drawing through an extra affine `m` (art coords → surface coords), clipped
 * to `clip` = [x0, y0, x1, y1] in art coords. It lets one picture (the chart)
 * be painted across the page, a flap's front and the flap's back in one go.
 */
function pen(g, m = null, clip = null) {
  const apply = (ctx) => {
    if (m) ctx.transform(...m)
    if (clip) {
      ctx.beginPath()
      ctx.rect(clip[0], clip[1], clip[2] - clip[0], clip[3] - clip[1])
      ctx.clip()
    }
  }
  const ink = (name, fn) => g.ink(name, (ctx) => (apply(ctx), fn(ctx)))
  const shape = (s, closed = true) => (Array.isArray(s) ? g.path(s, closed) : s)
  return {
    tone: g.tone,
    ink,
    knock: (name, fn) => g.knock(name, (ctx) => (apply(ctx), fn(ctx))),
    fill: (name, s, tone = 1) =>
      ink(name, (ctx) => {
        ctx.fillStyle = g.tone(tone)
        ctx.fill(shape(s))
      }),
    stroke: (name, s, width = 0.05, tone = 1, closed = false) =>
      ink(name, (ctx) => {
        ctx.strokeStyle = g.tone(tone)
        ctx.lineWidth = width
        ctx.stroke(shape(s, closed))
      }),
    circle: (name, cx, cy, r, tone = 1) =>
      ink(name, (ctx) => {
        ctx.fillStyle = g.tone(tone)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, TAU)
        ctx.fill()
      }),
    text: (name, str, x, y, opts) => ink(name, (ctx) => setType(ctx, g, str, x, y, opts)),
    /** Erase `name` under a line of type, so type over it prints clean. */
    knockText: (name, str, x, y, opts) => g.knock(name, (ctx) => (apply(ctx), setType(ctx, g, str, x, y, { ...opts, tone: 1 }))),
  }
}

/** One line of type into an already-transformed ctx (as g.text sets it). */
function setType(ctx, g, str, x, y, opts = {}) {
  const { kind = 'serif', size = 0.5, weight = 400, italic = false, align = 'left', tracking = 0, tone = 1 } = opts
  const S = 100
  ctx.fillStyle = g.tone(tone)
  ctx.translate(x, y)
  ctx.scale(1 / S, 1 / S)
  ctx.font = g.font(kind, size * S, { weight, italic })
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const track = tracking * size * S
  let w = -track
  for (const ch of str) w += ctx.measureText(ch).width + track
  let at = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
  for (const ch of str) {
    ctx.fillText(ch, at, 0)
    at += ctx.measureText(ch).width + track
  }
}

/**
 * Trace a V-fold card for the die: snap its foot exactly onto the glue lines
 * (marching squares rounds it off by a hair) and drop sliver windows.
 */
function cutCard(box, draw, { beta = 90, minHole = 0.12 } = {}) {
  const t = trace(box, draw)
  const da = [-Math.sin(beta * D2R), -Math.cos(beta * D2R)]
  const db = [Math.sin(beta * D2R), -Math.cos(beta * D2R)]
  const snap = ([x, y]) => {
    const d = x <= 0 ? da : db
    const along = x * d[0] + y * d[1]
    const off = x * d[1] - y * d[0]
    return along > -0.05 && Math.abs(off) < 0.09 ? [d[0] * along, d[1] * along] : [x, y]
  }
  return { outline: t.outline.map(snap), holes: t.holes.filter((h) => Math.abs(area(h)) >= minHole) }
}

/** Point `d` out along a V-fold's glue line, in card coords. */
const glueA = (beta, d) => [-d * Math.sin(beta * D2R), -d * Math.cos(beta * D2R)]
const glueB = (beta, d) => [d * Math.sin(beta * D2R), -d * Math.cos(beta * D2R)]

const rectPoly = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
const BIG = rectPoly(-40, -40, 80, 80)
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const clamp01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t)
const trail = (ctx, pts) => pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
/** Erase one ink under a polygon. */
const knockFill = (g, ink, poly) => g.knock(ink, (ctx) => ctx.fill(g.path(poly)))
/** The region under a polyline (y down), as a polygon reaching `floor`. */
const below = (pts, floor = 4) => [...pts, [pts[pts.length - 1][0], floor], [pts[0][0], floor]]

/** A pointed petal from (x0,y0) to its tip (x1,y1), as a new filled subpath. */
function petal(ctx, x0, y0, x1, y1, w, bulge = 0.4, stroke = false) {
  const dx = x1 - x0
  const dy = y1 - y0
  const L = Math.hypot(dx, dy) || 1
  const nx = -dy / L
  const ny = dx / L
  const mx = x0 + dx * bulge
  const my = y0 + dy * bulge
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(mx + nx * w, my + ny * w, x1, y1)
  ctx.quadraticCurveTo(mx - nx * w, my - ny * w, x0, y0)
  stroke ? ctx.stroke() : ctx.fill()
}

/**
 * A ring of petals around (cx, cy), each filled on its own so overlaps union
 * (one path with mixed windings would cancel into holes). `lim` = [xmin, xmax]
 * shortens petals so their tips stay inside a box's top. `skip(i)` leaves a
 * petal out (it is drawn some other way).
 */
function petalRing(ctx, cx, cy, n, r0, r1, w, rot = 0, lim = null, stroke = false, skip = null) {
  for (let i = 0; i < n; i++) {
    if (skip && skip(i)) continue
    const t = rot + (i / n) * TAU
    const c = Math.cos(t)
    const s = Math.sin(t)
    let rr = r1
    if (lim && c < -1e-6) rr = Math.min(rr, (cx - lim[0]) / -c)
    if (lim && c > 1e-6) rr = Math.min(rr, (lim[1] - cx) / c)
    petal(ctx, cx + c * r0, cy + s * r0, cx + c * rr, cy + s * rr, w, 0.4, stroke)
  }
}

/** A leaf whose midrib bends: base → control → tip, widest a third along. */
function curvedLeaf(base, ctrl, tip, w) {
  const pts = []
  const side = []
  const q = (t) => [
    (1 - t) ** 2 * base[0] + 2 * t * (1 - t) * ctrl[0] + t * t * tip[0],
    (1 - t) ** 2 * base[1] + 2 * t * (1 - t) * ctrl[1] + t * t * tip[1],
  ]
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    const [x, y] = q(t)
    const [x2, y2] = q(Math.min(1, t + 0.01))
    const [x1, y1] = q(Math.max(0, t - 0.01))
    const l = Math.hypot(x2 - x1, y2 - y1) || 1
    const nx = -(y2 - y1) / l
    const ny = (x2 - x1) / l
    const k = w * Math.sin(Math.PI * t ** 0.8) * (t < 0.08 ? t / 0.08 : 1)
    pts.push([x + nx * k, y + ny * k])
    side.push([x - nx * k, y - ny * k])
  }
  return { poly: [...pts, ...side.reverse()], rib: Array.from({ length: 17 }, (_, i) => q(i / 16)) }
}

/** Damped two-pendulum figure (day 43): a three-lobed spiral, centred. */
function harmonograph(cx, cy, R, { d = 0.019, T = 92, n = 2200, k = 0.36 } = {}) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * T
    const e = Math.exp(-d * t)
    const x = ((1 - k) * Math.sin(t) + k * Math.sin(4.006 * t)) * e
    const y = ((1 - k) * Math.sin(1.001 * t + Math.PI / 2) + k * Math.sin(3.995 * t + Math.PI / 2)) * e
    pts.push([cx + R * x, cy + R * y])
  }
  return pts
}

/** Streamlines through a noise angle field (day 8). */
function flowLines(rng, { x0, y0, x1, y1, count, steps, step = 0.14, scale = 0.11, seed = 8, swirl = 2.2 }) {
  const angle = (x, y) => (fbm(x * scale + 40, y * scale + 40, seed, 3) - 0.5) * TAU * swirl
  const lines = []
  for (let i = 0; i < count; i++) {
    let x = rng.range(x0, x1)
    let y = rng.range(y0, y1)
    const pts = [[x, y]]
    for (let k = 0; k < steps; k++) {
      const a = angle(x, y)
      x += Math.cos(a) * step
      y += Math.sin(a) * step
      pts.push([x, y])
    }
    lines.push(pts)
  }
  return lines
}

/** A stroke that swells from a hair at its tail to `w` at its head. */
function taper(ctx, pts, w) {
  const L = []
  const R = []
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i]
    const [ax, ay] = pts[Math.max(0, i - 1)]
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)]
    const l = Math.hypot(bx - ax, by - ay) || 1
    const k = (w / 2) * (0.08 + 0.92 * (i / (pts.length - 1)) ** 1.4)
    L.push([x - ((by - ay) / l) * k, y + ((bx - ax) / l) * k])
    R.push([x + ((by - ay) / l) * k, y - ((bx - ax) / l) * k])
  }
  ctx.beginPath()
  trail(ctx, [...L, ...R.reverse()])
  ctx.closePath()
  ctx.fill()
}

// ============================================================ the pop-ups
// Back to front: sun, hills, wood, sunflower (with two floating layers),
// helix. The farther a card stands, the wider its glue angle, so no glue
// lines cross on the page and every layer folds flat over the one behind.
// Values recede the way air does: pale at the back, darkest in front.

// ---- the sun (day 43): the pendulums' drawing, setting into the low hills on
// the left. The disc rides on the card's left half (so it stays flat, not
// creased) at the end of a low bar that the hills hide. A pale halo round it
// is cut into the card, so it glows against the paper sky.
const SUN = { at: 9.8, glue: 84, beta: 90.85, x: -6.7, cy: -4.25, r: 3.0, halo: 0.55 }
const sunDraw = (ctx) => {
  ctx.beginPath()
  ctx.arc(SUN.x, SUN.cy, SUN.r + SUN.halo, 0, TAU)
  ctx.fill()
  const [ax, ay] = glueA(SUN.beta, 8.2)
  const [bx, by] = glueB(SUN.beta, 1.3)
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(0, 0)
  ctx.lineTo(bx, by)
  ctx.lineTo(bx, -1.25)
  ctx.lineTo(SUN.x + 1.0, -1.25)
  ctx.lineTo(SUN.x + 0.9, -2.5)
  ctx.lineTo(SUN.x - 0.9, -2.5)
  ctx.lineTo(ax, -1.25)
  ctx.closePath()
  ctx.fill()
}
const sunFigure = (cx) => harmonograph(cx, SUN.cy, 2.45, { d: 0.034, T: 64, n: 1600 })
const sun = {
  id: 'sun',
  kind: 'vfold',
  on: 'gutter',
  day: 43,
  at: SUN.at,
  glue: [SUN.glue, SUN.glue],
  angle: [SUN.beta, SUN.beta],
  outline: () => cutCard({ x0: -10.9, y0: -8.3, w: 12.5, h: 8.6 }, sunDraw, { beta: SUN.beta }),
  front(g) {
    const disc = (r) => (ctx) => {
      ctx.beginPath()
      ctx.arc(SUN.x, SUN.cy, r, 0, TAU)
      ctx.fill()
    }
    // the bar (hidden behind the hills) in a quiet green
    g.fill(INK.leaf, BIG, 0.4)
    g.knock(INK.leaf, disc(SUN.r + SUN.halo + 0.2))
    // a halo, then the disc in solid sunflower
    g.circle(INK.sun, SUN.x, SUN.cy, SUN.r + SUN.halo + 0.2, 0.35)
    g.circle(INK.sun, SUN.x, SUN.cy, SUN.r)
    // the pendulums' figure drawn through the ink in paper white
    g.knock(INK.sun, (ctx) => {
      ctx.lineWidth = 0.055
      ctx.beginPath()
      trail(ctx, sunFigure(SUN.x))
      ctx.stroke()
    })
  },
  back(g) {
    g.fill(INK.sun, BIG, 0.5)
    // backs print mirrored about the card's box: find the disc there
    const mx = 2 * g.box.x0 + g.box.w - SUN.x
    g.stroke(INK.leaf, sunFigure(mx), 0.04, 0.7)
  },
}

// ---- the hills (day 5): noise ridges around a valley, banded like a heightmap.
// The range slopes down into the glue line at both ends, so it reads as land,
// not a slab.
const HILL = { at: 11.2, glue: 82, beta: 91.2, half: 10.0, rim: 0.45 }
const hillBaseY = (X) => Math.abs(X) * (-Math.cos(HILL.beta * D2R) / Math.sin(HILL.beta * D2R))
function hillHeight(X, k = 0) {
  const bump = (c, w, h) => h * Math.exp(-(((X - c) / w) ** 2))
  const a = Math.abs(X)
  let h = 2.2 + 1.5 * smooth(1 - a / 10)
  h += bump(-3.9, 1.5, 3.3) + bump(-6.8, 1.5, 1.4) + bump(-9.0, 1.1, 2.0)
  h += bump(2.4, 1.1, 3.2) + bump(4.6, 1.3, 5.2) + bump(7.1, 1.2, 3.4) + bump(8.9, 0.9, 0.8)
  h -= smooth((a - 8.8) / 1.2) * 1.6
  h += (fbm(X * 0.42 + 3.1, k * 2.7, 5, 4) - 0.5) * 1.4
  return h * smooth((HILL.half - a) / 2.2)
}
function ridge(k, drop, step = 0.2) {
  const pts = []
  for (let X = -HILL.half; X <= HILL.half + 1e-6; X += step) pts.push([X, hillBaseY(X) - Math.max(0.08, hillHeight(X, k) - drop)])
  return pts
}
const HILL_TOP = ridge(0, 0)
const HILL_OUTLINE = [glueA(HILL.beta, HILL.half), [0, 0], glueB(HILL.beta, HILL.half), ...HILL_TOP.slice().reverse().slice(1, -1)]
const hills = {
  id: 'hills',
  kind: 'vfold',
  on: 'gutter',
  day: 5,
  at: HILL.at,
  glue: [HILL.glue, HILL.glue],
  angle: [HILL.beta, HILL.beta],
  outline: HILL_OUTLINE,
  front(g) {
    const r1 = ridge(1.3, 1.7)
    const r2 = ridge(2.6, 3.3)
    // far ridge: a pale teal haze
    g.fill(INK.deep, HILL_OUTLINE, 0.25)
    // middle band: teal and green, half-lit
    knockFill(g, INK.deep, below(r1))
    g.fill(INK.deep, below(r1), 0.45)
    g.fill(INK.leaf, below(r1), 0.3)
    // near band: green alone, still lighter than the wood in front of it
    knockFill(g, INK.deep, below(r2))
    knockFill(g, INK.leaf, below(r2))
    g.fill(INK.leaf, below(r2), 0.6)
    // contour lines: the heightmap read as a map
    g.ink(INK.deep, (ctx) => {
      ctx.lineWidth = 0.04
      ctx.strokeStyle = g.tone(0.75)
      for (let c = 0.6; c < 8; c += 0.6) {
        ctx.beginPath()
        trail(ctx, ridge(0, c, 0.25).map(([x, y]) => [x, Math.min(y, hillBaseY(x) - 0.05)]))
        ctx.stroke()
      }
    })
    // the crest caught by the low sun: a crisp warm rim, printed clean
    const rim = [...HILL_TOP, ...HILL_TOP.slice().reverse().map(([x, y]) => [x, y + HILL.rim])]
    knockFill(g, INK.deep, rim)
    knockFill(g, INK.leaf, rim)
    g.fill(INK.sun, rim, 0.7)
  },
  back(g) {
    g.fill(INK.leaf, BIG, 0.4)
    g.ink(INK.deep, (ctx) => {
      ctx.lineWidth = 0.05
      ctx.strokeStyle = g.tone(0.5)
      for (let y = -0.6; y > -10; y -= 0.6) {
        ctx.beginPath()
        ctx.moveTo(-13, y)
        ctx.lineTo(13, y)
        ctx.stroke()
      }
    })
  },
}

// ---- the wood (day 8): a row of trees whose canopies are a flow field,
// standing in a ragged undergrowth that thins out to nothing at both ends
const WOOD = { at: 13.4, glue: 76, half: 9.6 }
const TREES = [
  // x, height, kind (1 spire, 0 round, 2 low bush), width
  [-9.0, 1.5, 2, 1.7],
  [-7.7, 3.7, 0, 1.6],
  [-6.0, 4.2, 1, 1.7],
  [-4.4, 3.9, 0, 1.7],
  [-2.9, 3.9, 1, 1.4],
  [-1.5, 3.0, 0, 1.4],
  [0.1, 3.4, 1, 1.4],
  [1.6, 2.9, 0, 1.4],
  [3.0, 4.2, 1, 1.5],
  [4.6, 5.3, 0, 1.9],
  [6.3, 4.9, 1, 1.8],
  [7.9, 4.3, 0, 1.6],
  [9.0, 1.7, 2, 1.6],
]
/** Undergrowth height: 0.4–1.0 cm of noise, tapering to nothing at the ends. */
function underH(X) {
  const n = clamp01((fbm(X * 0.9 + 11, 2.2, 8, 3) - 0.3) / 0.4)
  const fine = fbm(X * 3.4 + 5, 7.7, 81, 2) - 0.5
  return Math.max(0, (0.4 + 0.6 * n + fine * 0.35) * smooth((WOOD.half - Math.abs(X)) / 1.3))
}
const UNDER = (() => {
  const pts = []
  for (let X = -WOOD.half; X <= WOOD.half + 1e-6; X += 0.08) pts.push([X, -underH(X)])
  return pts
})()
function treeCrowns(ctx) {
  for (const [x, h, kind, w] of TREES) {
    ctx.beginPath()
    if (kind === 1) {
      // a spire whose lowest boughs droop a little
      ctx.moveTo(x, -h)
      ctx.quadraticCurveTo(x + w * 0.35, -h * 0.55, x + w * 0.62, -0.95)
      ctx.quadraticCurveTo(x, -0.62, x - w * 0.62, -0.95)
      ctx.quadraticCurveTo(x - w * 0.35, -h * 0.55, x, -h)
    } else if (kind === 2) {
      // a low round bush, three lobes
      ctx.ellipse(x, -h * 0.58, w * 0.42, h * 0.58, 0, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x - w * 0.3, -h * 0.38, w * 0.3, h * 0.38, 0, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x + w * 0.3, -h * 0.42, w * 0.3, h * 0.42, 0, 0, TAU)
    } else {
      const r = w * 0.55
      ctx.ellipse(x, -h + r * 1.05, r, r * 1.08, 0, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x, -h + r * 1.9, r * 0.8, Math.max(0.3, (h - r * 1.9 - 0.9) * 0.9 + 0.3), 0, 0, TAU)
    }
    ctx.fill()
  }
}
const WOOD_BOX = { x0: -WOOD.half - 0.3, y0: -6.8, w: WOOD.half * 2 + 0.6, h: 7.1 }
const crownMask = () => trace(WOOD_BOX, treeCrowns)
const trunks = (ctx, w) => {
  for (const [x, h, kind] of TREES) if (kind !== 2) ctx.fillRect(x - w / 2, -Math.min(h, 2), w, Math.min(h, 2))
}
const woodDraw = (ctx) => {
  treeCrowns(ctx)
  ctx.beginPath()
  trail(ctx, UNDER)
  ctx.closePath()
  ctx.fill()
  trunks(ctx, 0.26)
}
const wood = {
  id: 'wood',
  kind: 'vfold',
  on: 'gutter',
  day: 8,
  at: WOOD.at,
  glue: [WOOD.glue, WOOD.glue],
  angle: [90, 90],
  outline: () => cutCard(WOOD_BOX, woodDraw),
  front(g) {
    const mask = crownMask()
    const crowns = (ctx) => {
      ctx.beginPath()
      for (const loop of [mask.outline, ...mask.islands]) {
        trail(ctx, loop)
        ctx.closePath()
      }
    }
    g.fill(INK.leaf, BIG, 1)
    // dark trunks between the crowns and the undergrowth
    g.ink(INK.deep, (ctx) => trunks(ctx, 0.3))
    // flow-field trails: dark ones overprint, glowing ones knock out the green
    const lines = flowLines(g.rng, { x0: -10, y0: -6.6, x1: 10, y1: -0.8, count: 160, steps: 16, step: 0.13, scale: 0.35, seed: 8, swirl: 1.6 })
    const strokes = (list, width) => (ctx) => {
      crowns(ctx)
      ctx.clip()
      ctx.lineWidth = width
      for (const pts of list) {
        ctx.beginPath()
        trail(ctx, pts)
        ctx.stroke()
      }
    }
    g.ink(INK.deep, strokes(lines.slice(0, 95), 0.07))
    g.knock(INK.leaf, strokes(lines.slice(95), 0.065))
    g.ink(INK.sun, strokes(lines.slice(95), 0.065))
    // undergrowth: a little shade at the foot, then grass in clumps, some lit
    // by the sun and some in shadow, at random spacing
    g.ramp(INK.deep, UNDER.concat([[WOOD.half, 0.2], [-WOOD.half, 0.2]]), 0, 0, 0, -0.9, 0.4, 0)
    const lit = []
    const dark = []
    let x = -WOOD.half + g.rng.range(0.4, 1.2)
    while (x < WOOD.half - 0.5) {
      const top = underH(x)
      if (top > 0.25) {
        const blades = g.rng.int(3, 6)
        const into = g.rng.chance(0.55) ? lit : dark
        for (let b = 0; b < blades; b++) {
          const bx = x + g.rng.range(-0.18, 0.18)
          const lean = g.rng.range(-0.22, 0.22) + (bx - x) * 0.9
          const len = Math.min(top - 0.06, g.rng.range(0.35, 0.75))
          into.push([bx, lean, len])
        }
      }
      x += g.rng.chance(0.3) ? g.rng.range(0.35, 0.6) : g.rng.range(0.9, 2.1)
    }
    const grass = (list) => (ctx) => {
      ctx.lineWidth = 0.055
      for (const [bx, lean, len] of list) {
        ctx.beginPath()
        ctx.moveTo(bx, 0.02)
        ctx.quadraticCurveTo(bx + lean * 0.3, -len * 0.55, bx + lean, -len)
        ctx.stroke()
      }
    }
    g.ink(INK.deep, grass(dark))
    g.knock(INK.leaf, grass(lit))
    g.knock(INK.deep, grass(lit))
    g.ink(INK.sun, grass(lit))
  },
  back(g) {
    g.fill(INK.leaf, BIG, 0.55)
  },
}

// ---- the sunflower (day 42): stem, leaves and the back ring of petals. The
// head is turned toward the setting sun (art centred left of the crease) and
// the stem bends to carry it there.
const HEAD = { at: 16.8, glue: 70, cx: -0.8, cy: 8.6, R: 5.4, disc: 4.3, n: 16 }
const STEM = [[0.15, 0.05], [1.15, -4.6], [HEAD.cx, -HEAD.cy + 0.4]]
const stemAt = (t) => [
  (1 - t) ** 2 * STEM[0][0] + 2 * t * (1 - t) * STEM[1][0] + t * t * STEM[2][0],
  (1 - t) ** 2 * STEM[0][1] + 2 * t * (1 - t) * STEM[1][1] + t * t * STEM[2][1],
]
/** The stem's x at height y (y < 0), by bisection along the curve. */
function stemX(y) {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (stemAt(mid)[1] > y) lo = mid
    else hi = mid
  }
  return stemAt((lo + hi) / 2)[0]
}
const stemPath = (ctx, dx = 0) => {
  ctx.beginPath()
  ctx.moveTo(STEM[0][0] + dx, STEM[0][1])
  ctx.quadraticCurveTo(STEM[1][0] + dx, STEM[1][1], STEM[2][0] + dx, STEM[2][1])
}
const LEAVES = (() => {
  const yl = -1.95
  const yr = -2.55
  const xl = stemX(yl)
  const xr = stemX(yr)
  return [curvedLeaf([xl - 0.3, yl], [xl - 2.5, yl - 1.35], [-4.7, yl + 0.35], 0.8), curvedLeaf([xr + 0.3, yr], [xr + 2.2, yr - 1.15], [4.5, yr + 0.05], 0.72)]
})()
// a hummock of earth to stand on, its top roughened by noise
const MOUND = (() => {
  const pts = []
  for (let i = 0; i <= 44; i++) {
    const x = -2.7 + (i / 44) * 5.4
    const u = 1 - (x / 2.7) ** 2
    const h = 1.1 * Math.max(0, u) ** 0.6 + (fbm(x * 2.3 + 4, 1.7, 42, 3) - 0.5) * 0.5 * u
    pts.push([x, i === 0 || i === 44 ? 0 : -Math.max(0.02, h)])
  }
  return pts
})()
const headRing = (ctx, stroke = false) => petalRing(ctx, HEAD.cx, -HEAD.cy, HEAD.n, 2.6, HEAD.R, 0.95, -Math.PI / 2, null, stroke)
const stemDraw = (ctx) => {
  const cy = -HEAD.cy
  ctx.beginPath()
  ctx.arc(HEAD.cx, cy, HEAD.disc, 0, TAU)
  ctx.fill()
  headRing(ctx)
  stemPath(ctx)
  ctx.lineWidth = 0.9
  ctx.lineCap = 'butt'
  ctx.stroke()
  for (const l of LEAVES) {
    ctx.beginPath()
    trail(ctx, l.poly)
    ctx.fill()
  }
  ctx.beginPath()
  trail(ctx, MOUND)
  ctx.closePath()
  ctx.fill()
}
const stem = {
  id: 'stem',
  kind: 'vfold',
  on: 'gutter',
  day: 42,
  at: HEAD.at,
  glue: [HEAD.glue, HEAD.glue],
  angle: [90, 90],
  outline: () => cutCard({ x0: -6.5, y0: -14.3, w: 11.6, h: 14.6 }, stemDraw),
  front(g) {
    const cy = -HEAD.cy
    // stem, shaded down its sunward side, and the leaves
    g.ink(INK.leaf, (ctx) => {
      stemPath(ctx)
      ctx.lineWidth = 1.4
      ctx.stroke()
    })
    g.ink(INK.deep, (ctx) => {
      stemPath(ctx, -0.22)
      ctx.lineWidth = 0.3
      ctx.strokeStyle = g.tone(0.5)
      ctx.stroke()
    })
    for (const l of LEAVES) {
      g.fill(INK.leaf, l.poly)
      g.fill(INK.deep, l.poly, 0.22)
      g.stroke(INK.deep, l.rib, 0.06)
    }
    // the earth: a green hummock in front of the stem's foot, seeded
    knockFill(g, INK.leaf, MOUND)
    knockFill(g, INK.deep, MOUND)
    g.fill(INK.leaf, MOUND, 0.6)
    g.fill(INK.deep, rectPoly(-3, -0.13, 6, 0.3), 0.85)
    const scatter = Array.from({ length: 13 }, () => {
      const x = g.rng.range(-1.8, 1.8)
      const top = -MOUND[Math.round(((x + 2.7) / 5.4) * 44)][1]
      return [x, -g.rng.range(0.28, Math.max(0.32, top - 0.2)), g.rng.range(0, 3)]
    })
    const seeds = (ctx) => {
      for (const [x, y, a] of scatter) {
        ctx.beginPath()
        ctx.ellipse(x, y, 0.1, 0.065, a, 0, TAU)
        ctx.fill()
      }
    }
    g.knock(INK.leaf, seeds)
    g.ink(INK.sun, seeds)
    // back petals: clean sunflower (the stem's green knocked out beneath)
    const head = (ctx) => {
      ctx.beginPath()
      ctx.arc(HEAD.cx, cy, HEAD.disc, 0, TAU)
      ctx.fill()
      headRing(ctx)
    }
    g.knock(INK.leaf, head)
    g.knock(INK.deep, head)
    g.ink(INK.sun, head)
    g.ink(INK.deep, (ctx) => {
      ctx.lineWidth = 0.045
      headRing(ctx, true)
      for (let i = 0; i < HEAD.n; i++) {
        const t = -Math.PI / 2 + (i / HEAD.n) * TAU
        ctx.beginPath()
        ctx.moveTo(HEAD.cx + Math.cos(t) * 4.4, cy + Math.sin(t) * 4.4)
        ctx.lineTo(HEAD.cx + Math.cos(t) * (HEAD.R - 0.45), cy + Math.sin(t) * (HEAD.R - 0.45))
        ctx.stroke()
      }
    })
  },
  back(g) {
    const cy = -HEAD.cy
    const mx = 2 * g.box.x0 + g.box.w - HEAD.cx
    g.fill(INK.leaf, BIG, 0.5)
    // green bracts behind the head
    g.ink(INK.leaf, (ctx) => {
      ctx.beginPath()
      ctx.arc(mx, cy, 3.2, 0, TAU)
      ctx.fill()
      petalRing(ctx, mx, cy, 12, 2.4, 4.6, 0.7, 0)
    })
    g.fill(INK.sun, BIG, 0.3)
  },
}

// ---- floating layers on the flower's valley (boxes): front petals, seed head.
// A box across a V-fold's valley has its card y running UP the crease, and
// the reader sees its back, so backs are painted through boxArt: flower art
// coords (x right of the crease, y = −height, as on the stem card). Each
// layer floats toward the reader, which from ~50° above reads as lower, so
// its art is lifted to sit concentric with the ring behind it.
const boxArt = (B) => [-1, 0, 0, -1, B.h + B.b, 0]
const boxLength = (B) => 2 * B.h + B.a + B.b
function boxOutline(B, drawTop) {
  const L = boxLength(B)
  return () =>
    trace({ x0: -0.2, y0: B.cy - 5, w: L + 0.4, h: 10 }, (ctx) => {
      // the walls stop at the folds, so nothing square shows past a petal
      ctx.fillRect(0, B.span[0], B.h + 0.05, B.span[1] - B.span[0])
      ctx.fillRect(L - B.h - 0.05, B.span[0], B.h + 0.05, B.span[1] - B.span[0])
      ctx.save()
      ctx.beginPath()
      ctx.rect(B.h, -50, B.a + B.b, 100)
      ctx.clip()
      ctx.transform(1, 0, 0, -1, B.h + B.a, 0)
      drawTop(ctx)
      ctx.restore()
    })
}
/** Paint a box's walls (both faces see them from the sides). */
function boxWalls(g, B, ink, tone) {
  const L = boxLength(B)
  g.fill(ink, rectPoly(-1, -50, B.h + 1, 100), tone)
  g.fill(ink, rectPoly(L - B.h, -50, B.h + 1, 100), tone)
}

/**
 * The V of the flower turns a disc's crease column up from the reader's seat
 * (the wings come forward, so they sit lower). Raising the art on the wings in
 * proportion to |x| cancels it, and the seed head reads round, not a shield.
 */
const WARP = { k: 0.34, ref: 1.6 }
const warp = ([x, y]) => [x, y - WARP.k * (Math.abs(x) - WARP.ref)]
const warpedDisc = (cx, cy, r, n = 96) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU
    return warp([cx + Math.cos(t) * r, cy + Math.sin(t) * r])
  })

const BLOOM = { a: 4.2, b: 3.0, h: 1.1, cy: HEAD.cy + 1.1, n: 14, R: 4.1, disc: 2.4 }
// the walls are no taller than the strap petals that reach them
BLOOM.span = [BLOOM.cy - 0.37, BLOOM.cy + 0.37]
BLOOM.lim = [-BLOOM.a + 0.08, BLOOM.b - 0.08]
// petals 0 (3 o'clock) and 7 (9 o'clock) carry the card round onto the walls
const STRAP = (i) => i === 0 || i === BLOOM.n / 2
/** A strap petal from the disc out to (and a hair past) a wall's fold. */
function strap(side) {
  const cy = -BLOOM.cy
  const x0 = HEAD.cx + side * 1.2
  const x1 = side < 0 ? -BLOOM.a - 0.12 : BLOOM.b + 0.12
  const up = []
  const dn = []
  for (let i = 0; i <= 20; i++) {
    const u = i / 20
    const x = x0 + (x1 - x0) * u
    const hw = 0.15 + 0.2 * u + 0.3 * Math.sin(Math.PI * u)
    up.push([x, cy - hw])
    dn.push([x, cy + hw])
  }
  return { poly: [...up, ...dn.reverse()], up, dn: dn.slice().reverse() }
}
const STRAPS = [strap(-1), strap(1)]
const bloomTop = (ctx) => {
  const cy = -BLOOM.cy
  ctx.beginPath()
  trail(ctx, warpedDisc(HEAD.cx, cy, BLOOM.disc))
  ctx.closePath()
  ctx.fill()
  petalRing(ctx, HEAD.cx, cy, BLOOM.n, 1.2, BLOOM.R, 0.95, 0, BLOOM.lim, false, STRAP)
  for (const s of STRAPS) {
    ctx.beginPath()
    trail(ctx, s.poly)
    ctx.closePath()
    ctx.fill()
  }
}
const bloom = {
  id: 'bloom',
  kind: 'box',
  on: 'stem',
  day: 42,
  span: BLOOM.span,
  a: BLOOM.a,
  b: BLOOM.b,
  h: BLOOM.h,
  outline: boxOutline(BLOOM, bloomTop),
  front(g) {
    g.fill(INK.sun, BIG, 0.6)
    boxWalls(g, BLOOM, INK.sun, 0.9)
  },
  back(g) {
    const p = pen(g, boxArt(BLOOM))
    const cy = -BLOOM.cy
    p.fill(INK.sun, BIG)
    // the ring of florets round the seed head, in shade
    const ring = warpedDisc(HEAD.cx, cy, BLOOM.disc)
    p.fill(INK.leaf, ring, 0.7)
    p.ink(INK.deep, (ctx) => {
      ctx.lineWidth = 0.045
      petalRing(ctx, HEAD.cx, cy, BLOOM.n, 1.2, BLOOM.R, 0.95, 0, BLOOM.lim, true, STRAP)
      // the strap petals are petals too: outlined along their sides
      for (const s of STRAPS) {
        ctx.beginPath()
        trail(ctx, s.up)
        ctx.stroke()
        ctx.beginPath()
        trail(ctx, s.dn)
        ctx.stroke()
      }
      ctx.lineWidth = 0.05
      for (let i = 0; i < BLOOM.n; i++) {
        const t = (i / BLOOM.n) * TAU
        const r1 = STRAP(i) ? 3.4 : 3.25
        ctx.beginPath()
        ctx.moveTo(HEAD.cx + Math.cos(t) * 2.6, cy + Math.sin(t) * 2.6)
        ctx.lineTo(HEAD.cx + Math.cos(t) * r1, cy + Math.sin(t) * r1)
        ctx.stroke()
      }
    })
    // the walls carry the strap petals round the corner: petal-coloured
    boxWalls(g, BLOOM, INK.sun, 0.9)
  },
}

// the seed head sits just inside both folds of its own little box
const SEED = { a: 2.62, b: 1.02, h: 0.75, cy: HEAD.cy + 1.85, r: 1.98 }
SEED.span = [SEED.cy - 0.5, SEED.cy + 0.5]
const SEED_DISC = warpedDisc(HEAD.cx, -SEED.cy, SEED.r)
const seedTop = (ctx) => {
  ctx.beginPath()
  trail(ctx, SEED_DISC)
  ctx.closePath()
  ctx.fill()
}
const seed = {
  id: 'seed',
  kind: 'box',
  on: 'bloom',
  day: 42,
  span: SEED.span,
  a: SEED.a,
  b: SEED.b,
  h: SEED.h,
  outline: boxOutline(SEED, seedTop),
  front(g) {
    g.fill(INK.deep, BIG, 0.6)
    boxWalls(g, SEED, INK.sun, 0.9)
  },
  back(g) {
    const p = pen(g, boxArt(SEED))
    const cy = -SEED.cy
    p.fill(INK.deep, BIG)
    p.fill(INK.leaf, BIG, 0.65)
    // phyllotaxis: seeds at the golden angle, knocked clean, printed sunflower
    const dots = (ctx) => {
      ctx.beginPath()
      for (let i = 1; i < 160; i++) {
        const r = 0.145 * Math.sqrt(i)
        if (r > 1.82) break
        const t = i * 137.508 * D2R
        const [x, y] = warp([HEAD.cx + Math.cos(t) * r, cy + Math.sin(t) * r])
        const s = 0.035 + r * 0.032
        ctx.moveTo(x + s, y)
        ctx.arc(x, y, s, 0, TAU)
      }
      ctx.fill()
    }
    p.knock(INK.deep, dots)
    p.knock(INK.leaf, dots)
    p.ink(INK.sun, dots)
    // the head's thickness, seen past its rim, in petal colour
    const L = boxLength(SEED)
    for (const ink of [INK.deep, INK.leaf]) {
      g.knock(ink, (ctx) => {
        ctx.fillRect(-1, -50, SEED.h + 1, 100)
        ctx.fillRect(L - SEED.h, -50, SEED.h + 1, 100)
      })
    }
    boxWalls(g, SEED, INK.sun, 0.9)
  },
}

// ---- the double helix (day 13): a ladder of base pairs fencing the bed
const HELIX = { at: 20.4, glue: 74, half: 7.2, rail: 0.45, amp: 0.95, mid: 1.75, k: TAU / 4.8 }
const strand = (x, sign) => -(HELIX.mid + sign * HELIX.amp * Math.sin(HELIX.k * x))
const RUNGS = (() => {
  const out = []
  for (let x = -HELIX.half + 0.6, i = 0; x < HELIX.half - 0.4; x += 0.6, i++) out.push([x, i])
  return out
})()
function helixStrand(ctx, sign) {
  ctx.beginPath()
  for (let x = -HELIX.half + 0.25; x <= HELIX.half - 0.25 + 1e-6; x += 0.1) {
    x === -HELIX.half + 0.25 ? ctx.moveTo(x, strand(x, sign)) : ctx.lineTo(x, strand(x, sign))
  }
  ctx.lineWidth = 0.42
  ctx.lineCap = 'round'
  ctx.stroke()
}
function rungs(ctx, w, which) {
  for (const [x, i] of RUNGS) {
    if (which != null && i % 2 !== which) continue
    const ya = strand(x, 1)
    const yb = strand(x, -1)
    if (Math.abs(ya - yb) < 0.5) continue
    ctx.fillRect(x - w / 2, Math.min(ya, yb), w, Math.abs(ya - yb))
  }
}
const helix = {
  id: 'helix',
  kind: 'vfold',
  on: 'gutter',
  day: 13,
  at: HELIX.at,
  glue: [HELIX.glue, HELIX.glue],
  angle: [90, 90],
  outline: () =>
    cutCard({ x0: -HELIX.half - 0.2, y0: -3.2, w: HELIX.half * 2 + 0.4, h: 3.5 }, (ctx) => {
      helixStrand(ctx, 1)
      helixStrand(ctx, -1)
      rungs(ctx, 0.22)
      ctx.fillRect(-HELIX.half, -HELIX.rail, HELIX.half * 2, HELIX.rail)
      // posts tie the strands down to the rail
      for (const x of [-HELIX.half + 0.3, HELIX.half - 0.3]) ctx.fillRect(x - 0.22, -HELIX.mid - 0.2, 0.44, HELIX.mid + 0.2)
      for (let x = -HELIX.half + 1.5; x < HELIX.half; x += 2.4) ctx.fillRect(x - 0.1, -HELIX.mid, 0.2, HELIX.mid)
    }),
  front(g) {
    // base pairs, colour-coded as day 13 had them: A–T sunflower, G–C green
    g.ink(INK.sun, (ctx) => rungs(ctx, 0.3, 0))
    g.ink(INK.leaf, (ctx) => {
      rungs(ctx, 0.3, 1)
    })
    // the posts, printed the full height of their cut
    g.ink(INK.deep, (ctx) => {
      for (let x = -HELIX.half + 1.5; x < HELIX.half; x += 2.4) ctx.fillRect(x - 0.13, -HELIX.mid - 0.05, 0.26, HELIX.mid + 0.05)
    })
    // the two backbones, one passing over the other
    g.ink(INK.leaf, (ctx) => helixStrand(ctx, -1))
    g.knock(INK.leaf, (ctx) => helixStrand(ctx, 1))
    g.ink(INK.deep, (ctx) => helixStrand(ctx, 1))
    g.fill(INK.deep, rectPoly(-HELIX.half - 1, -HELIX.rail, HELIX.half * 2 + 2, 1))
    for (const x of [-HELIX.half + 0.3, HELIX.half - 0.3]) g.fill(INK.deep, rectPoly(x - 0.25, -HELIX.mid - 0.25, 0.5, HELIX.mid + 0.3))
    g.knock(INK.deep, (ctx) => setType(ctx, g, 'A · T · G · C    DAY 13 · THE DOUBLE HELIX    G · C · A · T', 0, -0.12, { kind: 'mono', size: 0.25, align: 'center', tracking: 0.08 }))
  },
  back(g) {
    g.fill(INK.leaf, BIG, 0.5)
    g.fill(INK.deep, rectPoly(-HELIX.half - 1, -HELIX.rail, HELIX.half * 2 + 2, 1), 0.6)
  },
}

// ============================================================ the chart (day 44)
// A folded map lies on the right page, hinged down its middle fold. Shut, it
// shows its cover; lifted, it opens into a sea chart, an island stands up, and
// on the half that was folded under, a ship is already sailing for it.
const CHART = { x0: 9.5, x1: 18.5, y0: 15.6, y1: 23.8, hinge: 14.0 }
const CW = CHART.hinge - CHART.x0 // the flap's body, across the hinge
const CL = CHART.y1 - CHART.y0 // along the hinge
// page coords → the flap card's front (shut) and its back face (opened)
const FLAP_FRONT = [0, -1, 1, 0, -CHART.y0, CHART.hinge]
const FLAP_BACK = [0, 1, -1, 0, CHART.y1, -CHART.hinge]
const ISLE_AT = 5.0 // the island's hinge point, along the chart's fold
const ISLE = { cx: CHART.hinge, cy: CHART.y0 + ISLE_AT + 0.35 }
// the island's height bands, the same three greens on the chart and the card
const TERRACE = [0.35, 0.6, 1]

function coastline(cx, cy, r) {
  const pts = []
  for (let i = 0; i < 90; i++) {
    const t = (i / 90) * TAU
    const n = fbm(Math.cos(t) * 1.6 + 7, Math.sin(t) * 1.6 + 2, 44, 4)
    const rr = r * (0.72 + n * 0.62) * (1 + 0.12 * Math.cos(t * 2 + 0.6))
    pts.push([cx + Math.cos(t) * rr * 1.12, cy + Math.sin(t) * rr * 0.8])
  }
  return pts
}

function rose(p, cx, cy, r) {
  const star = []
  for (let i = 0; i < 16; i++) {
    const t = -Math.PI / 2 + (i / 16) * TAU
    const rr = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.55 : r * 0.28
    star.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr])
  }
  p.fill(INK.sun, star, 1)
  p.stroke(INK.deep, star, 0.04, 1, true)
  p.circle(INK.deep, cx, cy, 0.08)
  p.text(INK.deep, 'N', cx, cy - r - 0.12, { kind: 'mono', size: 0.26, align: 'center' })
}

// a ship standing in from the east, and its dotted course to the landing
const SHIP = { x: 17.55, y: 19.15 }
const COURSE = [
  [17.45, 19.55],
  [17.85, 20.55],
  [17.7, 21.6],
  [17.05, 22.5],
  [16.05, 22.85],
]
function ship(p, x, y) {
  const hull = [[x - 0.5, y], [x + 0.5, y], [x + 0.34, y + 0.24], [x - 0.36, y + 0.24]]
  const sail = [[x - 0.04, y - 0.82], [x - 0.04, y - 0.06], [x - 0.48, y - 0.1]]
  const jib = [[x + 0.04, y - 0.66], [x + 0.04, y - 0.06], [x + 0.36, y - 0.1]]
  p.knock(INK.deep, (ctx) => {
    ctx.beginPath()
    ctx.ellipse(x - 0.02, y - 0.3, 0.68, 0.72, 0, 0, TAU)
    ctx.fill()
  })
  p.fill(INK.deep, hull)
  p.fill(INK.sun, sail)
  p.fill(INK.sun, jib)
  p.stroke(INK.deep, [[x, y - 0.9], [x, y]], 0.05)
  p.fill(INK.leaf, [[x, y - 0.9], [x + 0.26, y - 0.84], [x, y - 0.77]])
  // a wake
  p.stroke(INK.deep, [[x - 0.62, y + 0.36], [x - 0.95, y + 0.3]], 0.035)
  p.stroke(INK.deep, [[x + 0.48, y + 0.36], [x + 0.8, y + 0.3]], 0.035)
}

/** The opened chart, in page coords. */
function chartOpen(p) {
  const { x0, x1, y0, y1 } = CHART
  const frame = rectPoly(x0, y0, x1 - x0, y1 - y0)
  p.fill(INK.sun, frame, 0.16)
  // the sea, engraved
  p.ink(INK.deep, (ctx) => {
    ctx.lineWidth = 0.035
    ctx.strokeStyle = p.tone(0.75)
    for (let y = y0 + 0.25; y < y1; y += 0.2) {
      ctx.beginPath()
      ctx.moveTo(x0, y)
      ctx.lineTo(x1, y)
      ctx.stroke()
    }
  })
  // the island: sand, then contour rings of green
  const coast = coastline(ISLE.cx, ISLE.cy, 2.45)
  p.knock(INK.deep, (ctx) => {
    ctx.beginPath()
    ctx.lineWidth = 0.6
    trail(ctx, coast)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  })
  p.fill(INK.sun, coast, 0.75)
  p.stroke(INK.deep, coast, 0.06, 1, true)
  ;[0.74, 0.5, 0.28].forEach((s, i) => {
    p.fill(INK.leaf, coast.map(([x, y]) => [ISLE.cx + (x - ISLE.cx) * s + 0.25 * (1 - s), ISLE.cy + (y - ISLE.cy) * s - 0.3 * (1 - s)]), TERRACE[i])
  })
  p.stroke(INK.deep, [[ISLE.cx - 0.3, ISLE.cy - 0.2], [ISLE.cx - 1.1, ISLE.cy + 0.5], [ISLE.cx - 1.4, ISLE.cy + 1.2], [ISLE.cx - 2.1, ISLE.cy + 1.75]], 0.07)
  rose(p, 17.35, 16.75, 0.8)
  // the course: knocked out of the engraving so the dots read on open water
  const dots = (ctx, r) => {
    const pts = []
    for (let i = 0; i < COURSE.length - 1; i++) {
      const [ax, ay] = COURSE[i]
      const [bx, by] = COURSE[i + 1]
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.22)
      for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n])
    }
    ctx.beginPath()
    for (const [x, y] of pts) {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, TAU)
    }
    ctx.fill()
  }
  p.knock(INK.deep, (ctx) => dots(ctx, 0.1))
  p.ink(INK.deep, (ctx) => dots(ctx, 0.05))
  // the landing, marked
  const [lx, ly] = COURSE[COURSE.length - 1]
  p.stroke(INK.deep, [[lx - 0.17, ly - 0.17], [lx + 0.17, ly + 0.17]], 0.07)
  p.stroke(INK.deep, [[lx - 0.17, ly + 0.17], [lx + 0.17, ly - 0.17]], 0.07)
  ship(p, SHIP.x, SHIP.y)
  p.text(INK.deep, 'Seed Bay', 10.0, 23.2, { kind: 'serif', size: 0.3, italic: true })
  p.text(INK.deep, 'Perlin Reach', 18.0, 23.45, { kind: 'serif', size: 0.28, italic: true, align: 'right' })
  p.text(INK.deep, 'ISLE OF SIXTY-FIVE', 9.9, 16.3, { kind: 'mono', size: 0.22, tracking: 0.14 })
  p.stroke(INK.deep, frame, 0.07, 1, true)
  p.stroke(INK.deep, rectPoly(x0 + 0.14, y0 + 0.14, x1 - x0 - 0.28, y1 - y0 - 0.28), 0.03, 1, true)
}

/** The shut chart: its cover (west) and the folded outside panel (east). */
function chartShut(p) {
  const { x0, x1, y0, y1, hinge } = CHART
  // the map's outside, aged, with a rhumb-line web
  p.fill(INK.sun, rectPoly(x0, y0, x1 - x0, y1 - y0), 0.3)
  p.ink(INK.deep, (ctx) => {
    ctx.lineWidth = 0.03
    ctx.strokeStyle = p.tone(0.7)
    for (let i = 0; i < 32; i++) {
      const t = (i / 32) * TAU
      ctx.beginPath()
      ctx.moveTo(hinge, y0 + CL * 0.45)
      ctx.lineTo(hinge + Math.cos(t) * 12, y0 + CL * 0.45 + Math.sin(t) * 12)
      ctx.stroke()
    }
  })
  p.stroke(INK.deep, rectPoly(x0, y0, x1 - x0, y1 - y0), 0.07, 1, true)
  // east panel: a cartouche and a scale bar; its type knocked clean
  p.fill(INK.leaf, rectPoly(hinge + 0.6, y0 + 4.9, 3.3, 1.9), 1)
  p.knock(INK.deep, (ctx) => ctx.fillRect(hinge + 0.6, y0 + 4.9, 3.3, 1.9))
  const seedType = [
    ['SEED', y0 + 5.6, { kind: 'mono', size: 0.26, align: 'center', tracking: 0.3 }],
    ['0044', y0 + 6.45, { kind: 'display', size: 0.66, align: 'center' }],
  ]
  for (const [str, y, opts] of seedType) {
    p.knockText(INK.leaf, str, hinge + 2.25, y, opts)
    p.text(INK.sun, str, hinge + 2.25, y, opts)
  }
  p.fill(INK.deep, rectPoly(hinge + 0.6, y1 - 0.9, 3.3, 0.14))
  p.text(INK.deep, '0      5      10 leagues', hinge + 0.6, y1 - 1.05, { kind: 'mono', size: 0.18 })
  // west panel: the cover
  p.fill(INK.deep, rectPoly(x0, y0, CW, CL), 1)
  p.knock(INK.deep, (ctx) => ctx.fillRect(x0 + 0.3, y0 + 0.3, CW - 0.6, CL - 0.6))
  p.fill(INK.sun, rectPoly(x0 + 0.3, y0 + 0.3, CW - 0.6, CL - 0.6), 0.55)
  p.stroke(INK.deep, rectPoly(x0 + 0.45, y0 + 0.45, CW - 0.9, CL - 0.9), 0.03, 1, true)
  p.text(INK.deep, 'MERIDIAN', x0 + CW / 2, y0 + 2.15, { kind: 'display', size: 0.54, align: 'center', tracking: 0.04 })
  p.text(INK.deep, 'a chart of the isle', x0 + CW / 2, y0 + 2.85, { kind: 'serif', size: 0.32, italic: true, align: 'center' })
  p.text(INK.deep, 'grown from seed 44', x0 + CW / 2, y0 + 3.3, { kind: 'serif', size: 0.32, italic: true, align: 'center' })
  rose(p, x0 + CW / 2, y0 + 5.2, 0.85)
  p.text(INK.deep, 'LIFT THE CHART  →', x0 + CW / 2, y1 - 0.75, { kind: 'mono', size: 0.22, align: 'center', tracking: 0.12 })
}

const chart = {
  id: 'chart',
  kind: 'flap',
  on: 'page:R',
  day: 44,
  paper: 'cream',
  at: [CHART.hinge, CHART.y0],
  rot: 90,
  // the cover, with a thumb tab on its free edge
  outline: [[0, 0], [CL, 0], [CL, CW], [CL * 0.62, CW], [CL * 0.58, CW + 0.55], [CL * 0.42, CW + 0.55], [CL * 0.38, CW], [0, CW]],
  front(g) {
    chartShut(pen(g, FLAP_FRONT, [CHART.x0 - 1, CHART.y0 - 1, CHART.hinge, CHART.y1 + 1]))
    const p = pen(g, FLAP_FRONT)
    p.fill(INK.leaf, rectPoly(CHART.x0 - 0.7, CHART.y0 + CL * 0.36, 0.75, CL * 0.28))
    const lift = (ctx) => {
      ctx.translate(CHART.x0 - 0.22, CHART.y0 + CL * 0.5)
      ctx.rotate(-Math.PI / 2)
      setType(ctx, g, 'LIFT', 0, 0, { kind: 'mono', size: 0.26, align: 'center', tracking: 0.2 })
    }
    p.knock(INK.leaf, lift)
    p.ink(INK.sun, lift)
  },
  back(g) {
    chartOpen(pen(g, FLAP_BACK, [CHART.hinge, CHART.y0 - 1, CHART.x1 + 1, CHART.y1 + 1]))
    pen(g, FLAP_BACK).fill(INK.leaf, rectPoly(CHART.x1 - 0.1, CHART.y0 + CL * 0.36, 0.75, CL * 0.28), 0.6)
  },
}

// ---- the island that stands up out of the opened chart: the printed island
// rising — a sand skirt, three green terraces, two peaks and a flag
const ISL = { glue: 64, half: 3.4, flag: -1.25 }
function isleH(X) {
  const a = Math.abs(X)
  const bump = (c, w, h) => h * Math.exp(-(((X - c) / w) ** 2))
  let h = bump(-1.15, 1.0, 3.25) + bump(1.6, 0.8, 2.35) + bump(0.3, 1.1, 0.75) + bump(-2.3, 0.8, 0.45)
  h += 0.55 * smooth(1 - a / 3.2)
  h += (fbm(X * 2.1 + 2, 4.4, 44, 3) - 0.5) * 0.4 * smooth((ISL.half - a) / 0.8)
  return Math.max(0, h * smooth((ISL.half - a) / 0.45))
}
/** The waterline, where green begins: a wavy noise line 0.35–0.75 up. */
const shore = (X) => 0.35 + 0.4 * clamp01((fbm(X * 1.9 + 9, 1.3, 65, 3) - 0.3) / 0.4)
/** A terrace edge at height `h`, wobbling a little like a contour. */
const contour = (h, k) => (X) => h + 0.16 * Math.sin(X * 2.1 + k * 1.7) + (fbm(X * 1.5, k * 3.1, 44, 2) - 0.5) * 0.3
const ISLE_TOP = (() => {
  const pts = []
  for (let X = -ISL.half; X <= ISL.half + 1e-6; X += 0.06) pts.push([X, -isleH(X)])
  pts[0] = [-ISL.half, 0]
  pts[pts.length - 1] = [ISL.half, 0]
  return pts
})()
const line = (fn) => {
  const pts = []
  for (let X = -ISL.half - 0.3; X <= ISL.half + 0.3 + 1e-6; X += 0.1) pts.push([X, -fn(X)])
  return pts
}
const FLAG = [[ISL.flag + 0.05, -5.35], [ISL.flag - 1.05, -5.05], [ISL.flag + 0.05, -4.72]]
const isleDraw = (ctx) => {
  ctx.beginPath()
  trail(ctx, ISLE_TOP)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(ISL.flag - 0.05, -5.35, 0.12, 5.35 - isleH(ISL.flag) + 0.3)
  ctx.beginPath()
  trail(ctx, FLAG)
  ctx.closePath()
  ctx.fill()
}
const isle = {
  id: 'isle',
  kind: 'vfold',
  on: 'chart',
  day: 44,
  at: ISLE_AT,
  glue: [ISL.glue, ISL.glue],
  angle: [90, 90],
  outline: () => cutCard({ x0: -3.6, y0: -5.6, w: 7.2, h: 5.9 }, isleDraw),
  front(g) {
    const t1 = line(contour(1.35, 1))
    const t2 = line(contour(2.45, 2))
    const wl = line(shore)
    // terraces from the summit down, each knocked clean before the next
    g.fill(INK.leaf, BIG, TERRACE[2])
    knockFill(g, INK.leaf, below(t2, 1))
    g.fill(INK.leaf, below(t2, 1), TERRACE[1])
    knockFill(g, INK.leaf, below(t1, 1))
    g.fill(INK.leaf, below(t1, 1), TERRACE[0])
    // the sand skirt below a wavy waterline
    knockFill(g, INK.leaf, below(wl, 1))
    g.fill(INK.sun, below(wl, 1), 0.75)
    // engraved contour lines, as the chart draws them from above
    g.stroke(INK.deep, t1, 0.035, 0.8)
    g.stroke(INK.deep, t2, 0.035, 0.8)
    g.stroke(INK.deep, wl, 0.05, 1)
    // a grove on the eastern peak's shoulder
    g.ink(INK.deep, (ctx) => {
      ctx.fillStyle = g.tone(0.55)
      for (const [x, y, r] of [[1.05, -1.95, 0.24], [1.42, -1.82, 0.2], [0.78, -1.78, 0.18]]) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, TAU)
        ctx.fill()
      }
    })
    // the flag, with the day on it
    g.fill(INK.deep, rectPoly(ISL.flag - 0.05, -5.35, 0.12, 5.35 - isleH(ISL.flag) + 0.3))
    g.knock(INK.leaf, (ctx) => ctx.fill(g.path(FLAG)))
    g.fill(INK.sun, FLAG)
    g.text(INK.deep, '44', ISL.flag - 0.42, -4.93, { kind: 'mono', size: 0.2, align: 'center' })
  },
  back(g) {
    g.fill(INK.deep, BIG, 0.45)
    g.fill(INK.sun, below(line(shore), 1), 0.45)
  },
}

// ================================================================== pages

const idx = dayIndex({ days: CH.days, side: 'R', x: 11.0, y: 2.0, width: 7.5, gap: 1.16, ink: INK.deep, accent: INK.leaf })

const MEADOW = (() => {
  const pts = []
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * TAU
    const n = fbm(Math.cos(t) * 1.3 + 5, Math.sin(t) * 1.3 + 9, 42, 3)
    pts.push([Math.cos(t) * 9.6 * (0.82 + n * 0.36), 17.6 + Math.sin(t) * 7.4 * (0.82 + n * 0.36)])
  }
  return pts
})()

// the sun's rays on the page: they stop short of the numeral, leaving
// quiet paper between the type and the light
const RAYS = { cy: 7.2, r: 7.1, short: 5.9, from: 1.07, to: 1.93, n: 15, clearX: -11.8 }

/** The ground under the pop-ups, in spread coords (x = 0 on the gutter). */
function ground(g, side) {
  const p = pen(g, side === 'L' ? [1, 0, 0, 1, W, 0] : null)
  // the low sun's light on the page: a glow round where the disc stands as
  // the reader sees it (squashed as the 50° seat squashes it), then its rays
  p.ink(INK.sun, (ctx) => {
    ctx.translate(SUN.x, RAYS.cy)
    ctx.scale(1, 0.78)
    const gr = ctx.createRadialGradient(0, 0, 2.6, 0, 0, 5.6)
    gr.addColorStop(0, g.tone(0.42))
    gr.addColorStop(1, g.tone(0))
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.arc(0, 0, 5.6, 0, TAU)
    ctx.fill()
  })
  p.ink(INK.sun, (ctx) => {
    ctx.fillStyle = g.tone(0.32)
    for (let i = 0; i < RAYS.n; i++) {
      const t = Math.PI * (RAYS.from + (i / (RAYS.n - 1)) * (RAYS.to - RAYS.from))
      const c = Math.cos(t)
      let r = i % 2 ? RAYS.short : RAYS.r
      if (c < 0) r = Math.min(r, (SUN.x - RAYS.clearX) / -c)
      const dt = Math.PI / 70
      ctx.beginPath()
      ctx.moveTo(SUN.x, RAYS.cy)
      ctx.arc(SUN.x, RAYS.cy, r, t - dt, t + dt)
      ctx.closePath()
      ctx.fill()
    }
  })
  // the meadow: a soft green bed with currents running through it
  p.ink(INK.leaf, (ctx) => {
    const gr = ctx.createRadialGradient(0, 17.4, 1, 0, 17.4, 10.5)
    gr.addColorStop(0, g.tone(0.55))
    gr.addColorStop(0.75, g.tone(0.16))
    gr.addColorStop(1, g.tone(0))
    ctx.fillStyle = gr
    ctx.fill(g.path(MEADOW))
  })
  const lines = flowLines(g.rng, { x0: -11, y0: 9.5, x1: 11, y1: 25.5, count: 190, steps: 20, step: 0.15, scale: 0.12, seed: 18, swirl: 1.3 })
  p.ink(INK.deep, (ctx) => {
    ctx.clip(g.path(MEADOW))
    ctx.lineWidth = 0.05
    ctx.strokeStyle = g.tone(0.85)
    for (const pts of lines) {
      ctx.beginPath()
      trail(ctx, pts)
      ctx.stroke()
    }
  })
}

const KEY = [
  ['the sun', 'two pendulums, damped', 43],
  ['the hills', 'noise in four octaves', 5],
  ['the wood', 'a current of particles', 8],
  ['the sunflower', 'seed forty-two, crossbred', 42],
  ['the fence', 'base pairs, unwinding', 13],
  ['the chart', 'an island that names itself', 44],
]

function leftPage(g) {
  ground(g, 'L')
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', INK.deep)
  const x = M.outer
  // the numeral, off register on purpose
  g.text(INK.sun, 'IV', x + 0.14, 6.35, { kind: 'display', size: 4.6 })
  g.knock(INK.sun, (ctx) => setType(ctx, g, 'IV', x, 6.2, { kind: 'display', size: 4.6 }))
  g.text(INK.leaf, 'IV', x, 6.2, { kind: 'display', size: 4.6 })
  g.text(INK.deep, 'Growing', x, 7.85, { kind: 'display', size: 1.4 })
  g.text(INK.deep, 'Things', x, 9.3, { kind: 'display', size: 1.4 })
  g.text(INK.deep, 'six days grown from seeds, noise and pendulums', x, 10.15, { kind: 'serif', size: 0.4, italic: true })
  g.fill(INK.sun, rectPoly(x + 0.07, 10.66, 7.5, 0.12))
  g.fill(INK.leaf, rectPoly(x, 10.57, 7.5, 0.1))
  g.para(
    INK.deep,
    'Some days were less built than planted: hills from noise, a current of particles, a helix that unwinds, flowers you can crossbreed, a pendulum’s slow drawing, an island that names its own coast. Give most of them the same seed and the same garden comes up, every time.',
    x,
    13.6,
    8.4,
    { size: 0.4, leading: 0.56 },
  )
  // the plate's key: what each paper layer is
  g.text(INK.leaf, 'KEY TO THE PLATE', x, 19.0, { kind: 'mono', size: 0.24, tracking: 0.16 })
  KEY.forEach(([what, how, n], i) => {
    const y = 19.75 + i * 0.6
    g.text(INK.deep, what, x, y, { kind: 'serif', size: 0.34, weight: 600 })
    g.text(INK.deep, how, x + 2.55, y, { kind: 'serif', size: 0.34, italic: true, tone: 0.9 })
    g.text(INK.leaf, String(n).padStart(2, '0'), x + 8.4, y, { kind: 'display', size: 0.36, align: 'right' })
  })
  folio(g, pl, 'L', INK.deep)
}

/**
 * The flow field (8) aloft: a few long particle trails rising out of the
 * valley behind the hills and arcing off toward the index, each a stroke that
 * swells to a sunflower particle at its head. They stop well short of the
 * index, so it keeps its quiet paper.
 */
const TRAILS = [
  // start, two controls, head (right-page cm)
  [[1.0, 6.6], [1.2, 3.4], [4.4, 1.9], [8.7, 2.5]],
  [[2.3, 6.8], [3.0, 4.6], [5.6, 4.6], [9.0, 3.9]],
  [[0.6, 5.0], [0.3, 2.6], [2.6, 1.3], [5.9, 1.65]],
  [[3.9, 6.9], [4.9, 5.6], [6.6, 6.2], [8.5, 5.3]],
]
function drift(g) {
  const heads = []
  g.ink(INK.deep, (ctx) => {
    TRAILS.forEach(([p0, c1, c2, p1], j) => {
      const pts = []
      for (let i = 0; i <= 60; i++) {
        const t = i / 60
        const u = 1 - t
        const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0]
        const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]
        // a little wander, as a particle in a noise field has
        const w = (fbm(x * 0.7 + j * 3, y * 0.7, 81, 2) - 0.5) * 0.35 * Math.sin(Math.PI * t)
        pts.push([x, y + w])
      }
      taper(ctx, pts, 0.11)
      heads.push(pts[pts.length - 1])
    })
  })
  const dots = (ctx) => {
    ctx.beginPath()
    for (const [x, y] of heads) {
      ctx.moveTo(x + 0.14, y)
      ctx.arc(x, y, 0.14, 0, TAU)
    }
    ctx.fill()
  }
  g.knock(INK.deep, dots)
  g.ink(INK.sun, dots)
}

function rightPage(g) {
  ground(g, 'R')
  drift(g)
  runningHead(g, 'Plate IV · a garden from seeds', 'R', INK.deep)
  idx.paint(g)
  // the chart: opened west half on the page, the shut east panel beside it
  for (const ink of CH.inks) g.knock(ink, (ctx) => ctx.fillRect(CHART.x0 - 0.05, CHART.y0 - 0.05, CHART.x1 - CHART.x0 + 0.1, CL + 0.1))
  chartOpen(pen(g, null, [CHART.x0 - 0.1, CHART.y0 - 0.1, CHART.hinge, CHART.y1 + 0.1]))
  chartShut(pen(g, null, [CHART.hinge, CHART.y0 - 0.1, CHART.x1 + 0.1, CHART.y1 + 0.1]))
  g.text(INK.deep, 'fig. 44 · MERIDIAN, folded · lift it by the tab', CHART.x0, CHART.y1 + 0.6, { kind: 'mono', size: 0.22, tracking: 0.04, tone: 0.85 })
  folio(g, pr, 'R', INK.deep)
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: leftPage, R: rightPage },
  pieces: [sun, hills, wood, stem, bloom, seed, helix, chart, isle],
  spots: [...idx.spots, ...KEY.map(([, , n], i) => ({ day: n, on: 'page:L', rect: [M.outer - 0.1, 19.75 + i * 0.6 - 0.44, 8.6, 0.58] }))],
}
