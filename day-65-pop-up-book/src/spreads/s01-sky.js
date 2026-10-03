// Chapter I — The Night Sky.
//
// Across the gutter a sky leans back at the rear. Its die-cut horizon is
// broken by a rising crescent and by three of the chapter's own stars, and
// the seven days are strung across it as a star chart (day 19's hubs and
// corridors) over a dawn printed as hard riso halo bands centred on the
// globe. In front of it a desk globe built as a slice-form sphere: three
// discs folded through one hinge point at different glue angles, so six
// paper meridians fan round a shared, tipped-back axis (day 40). At the
// front, four rings of an endless tunnel (day 28) step down toward the
// gutter, each showing through the hole of the one before it, over a striped
// lane that converges into them.
//
// The left page holds an orrery (days 3 and 18): turn its toothed rim and the
// window swaps the solar system's clockwork for a gravity merge while the
// slot below names the day. On the right a Void Post postcard (day 52) lifts
// by its thumb tab like a cover; a ringed procedural planet (day 34) climbs
// out of the hole it was hiding.

import { trace } from '../art/trace.js'
import { W } from '../paper/dims.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayIndex, folio, runningHead, starburst } from './furniture.js'

const CH = CHAPTERS[0]
const [pl, pr] = folios(1)
const N = 'federal'
const Y = 'yellow'
const P = 'pink'
const DEG = Math.PI / 180
const TAU = Math.PI * 2

// ------------------------------------------------------------- geometry kit

const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
]
/** Points along a circular arc, a0 → a1 in degrees (canvas: 90° is down). */
function arcPts(cx, cy, r, a0, a1, n = 48) {
  const out = []
  for (let i = 0; i <= n; i++) {
    const t = (a0 + ((a1 - a0) * i) / n) * DEG
    out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r])
  }
  return out
}
const circ = (cx, cy, r, n = 72) => arcPts(cx, cy, r, 0, 360 - 360 / n, n - 1)
/** An annular sector about the origin. */
const sector = (r0, r1, a0, a1, n = 40) => [...arcPts(0, 0, r1, a0, a1, n), ...arcPts(0, 0, r0, a1, a0, n)]
/** A four-point sparkle. */
function sparkle(cx, cy, r, k = 0.3, rot = 0) {
  return Array.from({ length: 8 }, (_, i) => {
    const t = (rot - 90 + i * 45) * DEG
    const rr = i % 2 ? r * k : r
    return [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]
  })
}
function pathOf(poly) {
  const p = new Path2D()
  poly.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
  p.closePath()
  return p
}
function discPath(cx, cy, r) {
  const p = new Path2D()
  p.arc(cx, cy, r, 0, TAU)
  return p
}
/** A ring about (cx, cy) from r0 to r1 (r0 = 0: a disc). */
function annulus(cx, cy, r0, r1) {
  const p = new Path2D()
  p.arc(cx, cy, r1, 0, TAU)
  if (r0 > 0) {
    p.moveTo(cx + r0, cy)
    p.arc(cx, cy, r0, 0, TAU, true)
  }
  return p
}
/** Points along a cubic Bézier. */
function bezier([x0, y0], [x1, y1], [x2, y2], [x3, y3], n = 40) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const u = 1 - t
    return [
      u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    ]
  })
}
/** A ribbon along a polyline whose width runs w0 → w1: a motion trail. */
function ribbon(pts, w0, w1) {
  const L = []
  const R = []
  pts.forEach(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)]
    const [bx, by] = pts[Math.min(pts.length - 1, i + 1)]
    const l = Math.hypot(bx - ax, by - ay) || 1
    const h = (w0 + ((w1 - w0) * i) / (pts.length - 1)) / 2
    L.push([x - ((by - ay) / l) * h, y + ((bx - ax) / l) * h])
    R.push([x + ((by - ay) / l) * h, y - ((bx - ax) / l) * h])
  })
  return [...L, ...R.reverse()]
}

/**
 * Traced outlines land within a hair of their glue lines; snap them on, so
 * the card is glued along its whole foot (and the template shows it).
 */
function snapGlue(poly, betaA = 90, betaB = 90, tol = 0.14) {
  const dA = [-Math.sin(betaA * DEG), -Math.cos(betaA * DEG)]
  const dB = [Math.sin(betaB * DEG), -Math.cos(betaB * DEG)]
  let near = 0
  let best = Infinity
  const out = poly.map(([x, y], i) => {
    const r = Math.hypot(x, y)
    if (r < best) {
      best = r
      near = i
    }
    const d = x < 0 ? dA : dB
    const t = x * d[0] + y * d[1]
    const off = Math.abs(x * d[1] - y * d[0])
    return t > 0 && off < tol ? [d[0] * t, d[1] * t] : [x, y]
  })
  if ((betaA !== 90 || betaB !== 90) && best < 0.3) out[near] = [0, 0]
  return out
}
/** Even spacing along the outline: a cutter's path, and a fair centroid. */
function resample(poly, step = 0.2) {
  const out = []
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % poly.length]
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step))
    for (let k = 0; k < n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n])
  }
  return out
}
function cut(box, draw, betaA = 90, betaB = 90) {
  const t = trace(box, draw, { res: 24, tol: 0.02 })
  return { outline: snapGlue(t.outline, betaA, betaB), holes: t.holes }
}

/** Set type inside an ink callback whose ctx is already transformed. */
function setType(ctx, g, str, x, y, { kind = 'mono', size = 0.3, weight = 400, italic = false, align = 'left', tracking = 0, maxWidth } = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(0.01, 0.01)
  ctx.font = g.font(kind, size * 100, { weight, italic })
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const tr = tracking * size * 100
  let w = 0
  for (const ch of str) w += ctx.measureText(ch).width + tr
  w -= tr
  if (maxWidth && w > maxWidth * 100) ctx.scale((maxWidth * 100) / w, 1)
  let at = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
  for (const ch of str) {
    ctx.fillText(ch, at, 0)
    at += ctx.measureText(ch).width + tr
  }
  ctx.restore()
}

/**
 * Type along a circle about the origin, centred on angle `mid` (deg).
 * outward: glyph tops point away from the centre (reads along a top arc);
 * otherwise toward it (reads along a bottom arc).
 */
function arcType(ctx, g, str, r, mid, { size = 0.3, kind = 'mono', tracking = 0.08, outward = false } = {}) {
  ctx.save()
  ctx.font = g.font(kind, size * 100)
  const tr = tracking * size
  const ws = [...str].map((ch) => ctx.measureText(ch).width / 100 + tr)
  const span = (ws.reduce((a, b) => a + b, 0) - tr) / r
  const dir = outward ? 1 : -1
  let a = mid * DEG - (dir * span) / 2
  ;[...str].forEach((ch, i) => {
    const half = (ws[i] - tr) / 2 / r
    const t = a + dir * half
    ctx.save()
    ctx.translate(Math.cos(t) * r, Math.sin(t) * r)
    ctx.rotate(outward ? t + Math.PI / 2 : t - Math.PI / 2)
    ctx.scale(0.01, 0.01)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    a += (dir * ws[i]) / r
  })
  ctx.restore()
}

// --------------------------------------------------- the sky (backdrop, 19)
// A wide V (glue 70) whose crease leans well back: open, it faces the
// reader's eye almost square on, and shut, it closes no further round than
// the globe slices nested inside it (glue + angle 178 against their 174 at
// most), so they always lie within its fold. It closes along the gutter, so
// its tallest points (the moon's horn, the proud stars) stay shorter than
// its hinge distance.

const SKY = { at: 10.8, glue: [70, 70], angle: [108, 108], foot: 8.2 }
const FOOT = [-Math.sin(SKY.angle[0] * DEG) * SKY.foot, -Math.cos(SKY.angle[0] * DEG) * SKY.foot]
const DOME = { y: -5.6, rx: 8.5, ry: 3.7 }
const MOON = { x: -6.0, y: -8.95, r: 2.0, bx: -5.1, by: -9.7, br: 1.78 }
// Where the globe sits on the sky from the reader's eye (the view ray through
// its centre meets the card at (0, −0.91), and its silhouette is ~3.84 in
// card cm): the dawn is printed as hard bands round that point so the dark
// sphere is backlit wherever it stands.
const HALO = { x: 0, y: -0.91, r: [4.25, 4.65, 5.05, 5.45] }
// The chapter's days as a star chart: day 19's hubs and corridors, strung in
// order. Stars with `r` stand proud of the die-cut horizon (18 on the left
// shoulder, 28 crowning the crease, 40 to the right); no two proud stars are
// neighbours, so every corridor runs on card. Labels sit below-right.
const STARS = [
  { n: 3, x: -7.4, y: -3.3, ly: 0.98 },
  { n: 18, x: -8.05, y: -6.3, r: 0.82, ly: 1.12 },
  { n: 19, x: -3.0, y: -7.0, ly: 0.98 },
  { n: 28, x: 0, y: -9.62, r: 0.98, ly: 1.36 },
  { n: 34, x: 3.0, y: -7.5, ly: 0.98 },
  { n: 40, x: 5.6, y: -8.6, r: 0.86, ly: 1.5 },
  { n: 52, x: 4.9, y: -5.6, ly: 0.98 },
]
const HUB = 0.38
const LABEL = { kind: 'display', size: 0.62 }
const pad2 = (n) => String(n).padStart(2, '0')

function domePath(ctx) {
  ctx.beginPath()
  ctx.moveTo(FOOT[0], FOOT[1])
  ctx.lineTo(0, 0)
  ctx.lineTo(-FOOT[0], FOOT[1])
  ctx.lineTo(DOME.rx, DOME.y)
  ctx.ellipse(0, DOME.y, DOME.rx, DOME.ry, 0, 0, Math.PI, true)
  ctx.closePath()
}
/** fill the crescent (the moon's disc less its bite) in the current style */
function crescent(ctx) {
  ctx.save()
  ctx.clip(discPath(MOON.x, MOON.y, MOON.r))
  const p = new Path2D()
  p.rect(MOON.x - MOON.r - 1, MOON.y - MOON.r - 1, MOON.r * 2 + 2, MOON.r * 2 + 2)
  p.arc(MOON.bx, MOON.by, MOON.br, 0, TAU)
  ctx.fill(p, 'evenodd')
  ctx.restore()
}
/** the right shoulder's notch: a V nicked in where the dome meets the side
 * (the left shoulder breaks with day 18's star instead) */
const NOTCH = [1].map((s) => [
  [s * 9.1, DOME.y - 0.8],
  [s * (DOME.rx - 0.6), DOME.y + 0.02],
  [s * 9.1, DOME.y + 0.75],
])

const sky = {
  id: 'sky',
  kind: 'vfold',
  on: 'gutter',
  day: 19,
  at: SKY.at,
  glue: SKY.glue,
  angle: SKY.angle,
  outline: () =>
    resample(
      cut(
        { x0: -9.2, y0: -12.0, w: 18.4, h: 14.0 },
        (ctx) => {
          crescent(ctx)
          domePath(ctx)
          ctx.fill()
          for (const s of STARS) if (s.r) ctx.fill(pathOf(sparkle(s.x, s.y, s.r)))
          ctx.globalCompositeOperation = 'destination-out'
          for (const n of NOTCH) ctx.fill(pathOf(n))
        },
        SKY.angle[0],
        SKY.angle[1],
      ).outline,
    ),
  front(g) {
    const all = rect(-11, -14, 22, 18)
    const [r1, r2, r3, r4] = HALO.r
    // night, then the dawn as four hard bands: yellow, yellow + pink (orange),
    // pink, a 60% federal dusk, and solid night beyond
    g.fill(N, all)
    g.knock(N, (ctx) => ctx.fill(discPath(HALO.x, HALO.y, r4)))
    g.fill(N, annulus(HALO.x, HALO.y, r3, r4), 0.6)
    g.fill(P, annulus(HALO.x, HALO.y, r2, r3), 0.7)
    g.fill(P, annulus(HALO.x, HALO.y, r1, r2), 0.5)
    g.fill(Y, discPath(HALO.x, HALO.y, r2))
    // the moon: clean yellow, a pink terminator, a few craters
    g.knock(N, crescent)
    g.knock(P, crescent)
    g.ink(Y, crescent)
    g.ink(P, (ctx) => {
      ctx.save()
      ctx.clip(discPath(MOON.x, MOON.y, MOON.r))
      ctx.fillStyle = g.tone(0.45)
      ctx.beginPath()
      ctx.arc(MOON.bx - 0.15, MOON.by + 0.12, MOON.br + 0.42, 0, TAU)
      ctx.arc(MOON.bx - 0.15, MOON.by + 0.12, MOON.br, 0, TAU, true)
      ctx.fill()
      ctx.fillStyle = g.tone(0.6)
      for (const [x, y, r] of [
        [-1.45, 0.55, 0.28],
        [-0.85, 1.6, 0.19],
        [-1.95, -0.45, 0.16],
      ]) {
        ctx.beginPath()
        ctx.arc(MOON.x + x, MOON.y + y, r, 0, TAU)
        ctx.fill()
      }
      ctx.restore()
    })
    // where the labels go: the chart's lines and the scatter keep clear of them
    const labels = STARS.map((s) => {
      const x = s.x + 0.34
      const y = s.y + s.ly
      const w = g.measure(pad2(s.n), LABEL)
      return { s, x, y, box: [x - 0.12, y - 0.56, w + 0.24, 0.7] }
    })
    // a scatter of small stars in the night only
    const free = (x, y, m) =>
      Math.hypot(x - HALO.x, y - HALO.y) > r4 + 0.2 + m &&
      Math.hypot(x - MOON.x, y - MOON.y) > MOON.r + 0.25 &&
      STARS.every((s) => Math.hypot(x - s.x, y - s.y) > (s.r ?? HUB) + 0.35) &&
      labels.every(({ box: [bx, by, bw, bh] }) => x < bx - 0.1 || x > bx + bw + 0.1 || y < by - 0.1 || y > by + bh + 0.1)
    for (let i = 0; i < 90; i++) {
      const x = g.rng.range(-8.3, 8.3)
      const y = g.rng.range(-9.6, 1.8)
      const r = g.rng.chance(0.2) ? 0.085 : 0.045
      if (!free(x, y, r)) continue
      g.knock(N, (ctx) => ctx.fill(discPath(x, y, r + 0.035)))
      g.circle(Y, x, y, r)
    }
    // the chart's corridors: straight pink lines that stop short of every
    // hub and break round every label, like a printed star atlas
    const lines = (w) => (ctx) => {
      const keep = new Path2D()
      keep.rect(-12, -14, 24, 18)
      for (const s of STARS) {
        const r = s.r ? s.r * 0.62 + 0.2 : HUB + 0.17
        keep.moveTo(s.x + r, s.y)
        keep.arc(s.x, s.y, r, 0, TAU)
      }
      for (const { box } of labels) keep.rect(...box)
      ctx.clip(keep, 'evenodd')
      ctx.lineWidth = w
      ctx.beginPath()
      STARS.forEach((s, i) => (i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)))
      ctx.stroke()
    }
    g.knock(N, lines(0.17))
    g.knock(Y, lines(0.17))
    g.ink(P, lines(0.085))
    // hubs: one clean yellow sparkle each, the proud ones as big as their cut
    for (const s of STARS) {
      const r = s.r ?? HUB
      g.knock(N, (ctx) => ctx.fill(pathOf(sparkle(s.x, s.y, r + 0.07, 0.36))))
      g.knock(P, (ctx) => ctx.fill(pathOf(sparkle(s.x, s.y, r + 0.07, 0.36))))
      g.fill(Y, sparkle(s.x, s.y, r, 0.3))
    }
    for (const { s, x, y } of labels) {
      const type = (ctx) => setType(ctx, g, pad2(s.n), x, y, LABEL)
      g.knock(N, type)
      g.knock(P, type)
      g.ink(Y, type)
    }
  },
  back(g) {
    g.fill(N, rect(-11, -14, 22, 18), 0.85)
    for (let i = 0; i < 46; i++) {
      const x = g.rng.range(-8.2, 8.2)
      const y = g.rng.range(-10.5, 1.5)
      g.knock(N, (ctx) => ctx.fill(discPath(x, y, 0.09)))
      g.circle(Y, x, y, 0.055)
    }
    // the moon and the proud stars from behind, in clean yellow (a back is
    // painted mirrored about the card's box)
    const behind = (fn) => (ctx) => {
      ctx.translate(2 * g.box.x0 + g.box.w, 0)
      ctx.scale(-1, 1)
      fn(ctx)
    }
    const shapes = (ctx) => {
      crescent(ctx)
      for (const s of STARS) if (s.r) ctx.fill(pathOf(sparkle(s.x, s.y, s.r, 0.3)))
    }
    g.knock(N, behind(shapes))
    g.ink(Y, behind((ctx) => {
      ctx.fillStyle = g.tone(0.85)
      shapes(ctx)
    }))
  },
}

// ------------------------------------------------ the globe (slice-form, 40)
// Three discs, each folded down its axis and glued through ONE hinge point
// at its own glue angle, so six half-discs fan round a shared axis like the
// meridians of a globe. Each card's crease angle is chosen so that, open,
// every crease lies on the same axis tipped back TILT degrees: the fanned
// hemisphere then faces the reader's eye and reads as a whole sphere, its
// meridians drawn in paper. Each slice keeps to its own wedge as the book
// shuts, so they fold flat together without touching.

const GLOBE = { at: 15.6, tilt: 45, r: 3.75, stem: 1.0, foot: 0.85, neck: 0.24 }
const GCY = -(GLOBE.stem + GLOBE.r)
const SLICES = [18, 45, 70]
/** the crease angle that tips a slice glued at `glue` back onto the shared axis */
const sliceAngle = (glue) => Math.acos(-Math.sin(GLOBE.tilt * DEG) * Math.cos(glue * DEG)) / DEG
function globeOutline(beta) {
  const { r, foot, neck } = GLOBE
  const b = beta * DEG
  const yJoin = GCY + Math.sqrt(r * r - neck * neck)
  const a0 = Math.atan2(yJoin - GCY, neck) / DEG
  return [
    [-Math.sin(b) * foot, -Math.cos(b) * foot],
    [0, 0],
    [Math.sin(b) * foot, -Math.cos(b) * foot],
    [neck, -0.42],
    ...arcPts(0, GCY, r, a0, -180 - a0, 84),
    [-neck, -0.42],
  ]
}
/**
 * One continent: a few big overlapping ellipses, with one coast sliced
 * straight (a flattened shore), so it reads as land rather than bubbles.
 */
function makeContinent(rng, cx, cy) {
  const blobs = Array.from({ length: rng.int(3, 4) }, (_, i) => ({
    x: cx + (i ? rng.gauss() * 0.5 : 0),
    y: cy + (i ? rng.gauss() * 0.55 : 0),
    rx: rng.range(0.55, 1.05),
    ry: rng.range(0.4, 0.75),
    a: rng.range(0, Math.PI),
  }))
  const t = rng.range(0, TAU)
  return { blobs, cx, cy, nx: Math.cos(t), ny: Math.sin(t), d: rng.range(0.25, 0.5) }
}
function continentPath(c) {
  const p = new Path2D()
  for (const b of c.blobs) {
    p.moveTo(b.x + Math.cos(b.a) * b.rx, b.y + Math.sin(b.a) * b.rx)
    p.ellipse(b.x, b.y, b.rx, b.ry, b.a, 0, TAU)
  }
  return p
}
/** clip to one continent: its ellipses, cut along the flat coast */
function clipContinent(ctx, c) {
  const { cx, cy, nx, ny, d } = c
  const ox = cx + nx * d
  const oy = cy + ny * d
  const half = new Path2D()
  half.moveTo(ox - ny * 9, oy + nx * 9)
  half.lineTo(ox + ny * 9, oy - nx * 9)
  half.lineTo(ox + ny * 9 - nx * 9, oy - nx * 9 - ny * 9)
  half.lineTo(ox - ny * 9 - nx * 9, oy + nx * 9 - ny * 9)
  half.closePath()
  ctx.clip(half)
}
function globeArt(g, k) {
  const { r } = GLOBE
  const cy = GCY
  const clipDisc = (ctx) => ctx.clip(discPath(0, cy, r))
  const rng = g.rng
  // ocean in two flat tones: deep federal at the limb, a lit cap facing the
  // reader in the middle (each slice's cap lines up into one lit pole)
  g.fill(N, circ(0, cy, r, 90))
  g.knock(N, (ctx) => ctx.fill(discPath(0, cy, r * 0.58)))
  g.fill(N, circ(0, cy, r * 0.58, 72), 0.68)
  // land: two continents per slice in clean yellow
  const conts = [0, 1].map((i) => {
    const side = (i + k) % 2 ? 1 : -1
    return makeContinent(rng, side * rng.range(1.0, 1.8), cy + (i ? 1 : -1) * rng.range(0.7, 1.7))
  })
  const eachLand = (fn) => (ctx) => {
    for (const c of conts) {
      ctx.save()
      clipDisc(ctx)
      clipContinent(ctx, c)
      fn(ctx, c)
      ctx.restore()
    }
  }
  g.knock(N, eachLand((ctx, c) => ctx.fill(continentPath(c))))
  g.ink(Y, eachLand((ctx, c) => ctx.fill(continentPath(c))))
  // heat over the cities: a hard-edged pink halftone disc on each landmass
  const heat = conts.map((c) => [c.cx - c.nx * 0.25, c.cy - c.ny * 0.25, rng.range(0.42, 0.6)])
  g.ink(P, eachLand((ctx, c) => {
    ctx.clip(continentPath(c))
    const [x, y, hr] = heat[conts.indexOf(c)]
    ctx.fillStyle = g.tone(0.62)
    ctx.fill(discPath(x, y, hr))
  }))
  // graticule: parallels knocked out of every ink as paper hairlines
  for (const ink of [N, Y, P]) {
    g.knock(ink, (ctx) => {
      clipDisc(ctx)
      ctx.lineWidth = 0.07
      for (const lat of [-60, -30, 30, 60]) {
        const y = cy + Math.sin(lat * DEG) * r
        ctx.beginPath()
        ctx.moveTo(-r, y)
        ctx.lineTo(r, y)
        ctx.stroke()
      }
    })
  }
  g.knock(N, (ctx) => ctx.fillRect(-r, cy - 0.08, r * 2, 0.16))
  g.ink(Y, (ctx) => {
    clipDisc(ctx)
    ctx.fillRect(-r, cy - 0.07, r * 2, 0.14)
  })
  // data arcs leaping between the cities: clean pink with a paper keyline
  const arcs = conts.map((c, i) => {
    const [x0, y0] = heat[i]
    const x1 = -Math.sign(c.cx) * rng.range(0.5, 1.6)
    const y1 = y0 + rng.range(-1.6, 1.6)
    return [x0, y0, x1, y1]
  })
  const arcLines = (w) => (ctx) => {
    clipDisc(ctx)
    ctx.lineWidth = w
    for (const [x0, y0, x1, y1] of arcs) {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 1.25, x1, y1)
      ctx.stroke()
    }
  }
  g.knock(N, arcLines(0.22))
  g.knock(Y, arcLines(0.22))
  g.ink(P, arcLines(0.12))
  for (const [x0, y0, x1, y1] of arcs) {
    for (const [x, y] of [
      [x0, y0],
      [x1, y1],
    ]) {
      g.knock(N, (ctx) => ctx.fill(discPath(x, y, 0.22)))
      g.knock(Y, (ctx) => ctx.fill(discPath(x, y, 0.22)))
      g.circle(P, x, y, 0.18)
      g.circle(Y, x, y, 0.08)
    }
  }
  // atmosphere at the limb: a clean pink rim
  const limb = (ctx) => {
    ctx.lineWidth = 0.2
    ctx.beginPath()
    ctx.arc(0, cy, r - 0.1, 0, TAU)
    ctx.stroke()
  }
  g.knock(N, limb)
  g.knock(Y, limb)
  g.ink(P, limb)
  // the axis rod and its foot: a clean yellow rod knocked out of the stem
  g.fill(N, rect(-1.2, cy + r - 0.15, 2.4, -cy - r + 1.4))
  const rod = rect(-0.06, cy + r - 0.1, 0.12, -cy - r - 0.25)
  g.knock(N, (ctx) => ctx.fill(pathOf(rod)))
  g.fill(Y, rod)
}
const globeSlice = (id, glue, k) => {
  const beta = sliceAngle(glue)
  return {
    id,
    kind: 'vfold',
    on: 'gutter',
    day: 40,
    at: GLOBE.at,
    glue: [glue, glue],
    angle: [beta, beta],
    outline: globeOutline(beta),
    front: (g) => globeArt(g, k),
    back: (g) => globeArt(g, k + 1),
  }
}

// --------------------------------------------------------- the tunnel (28)
// Four rings at one glue angle: parallel cards that nest as they close. From
// the reader's eye (screen depth ≈ y·0.795 − height·0.606) each ring's crown
// sits just inside the hole of the ring in front, so they read as one tube
// running into the gutter, darker as it goes. Every band is ≥ 6.6 mm of card
// so each ring stays one piece across its crease and glues along its feet.
const TUNNEL = { glue: [66, 66], segs: 14 }
const RINGS = [
  { id: 'ring-1', at: 20.4, ro: 5.0, ri: 4.1, dark: 0 },
  { id: 'ring-2', at: 19.8, ro: 3.25, ri: 2.55, dark: 0.35 },
  { id: 'ring-3', at: 19.3, ro: 1.88, ri: 1.2, dark: 0.62 },
  { id: 'ring-4', at: 19.0, ro: 0.78, ri: 0, dark: 1 },
]
const ringOutline = ({ ro, ri }) =>
  ri > 0 ? [...arcPts(0, 0, ro, 180, 360, 56), ...arcPts(0, 0, ri, 360, 180, 48)] : [...arcPts(0, 0, ro, 180, 360, 40)]
/** the tube's flowing colour: alternating segments, stepped round per ring */
function ringStripes(g, { ri, ro }, i, tone, mirror = false) {
  const { segs } = TUNNEL
  const step = 180 / segs
  const ph = (mirror ? -1 : 1) * i * step * 0.42
  for (let j = -1; j <= segs; j++) {
    const a0 = 180 + ph + j * step
    g.fill(((j % 2) + 2) % 2 ? Y : P, sector(ri, ro + 0.1, a0 - 0.3, a0 + step + 0.3, 6), tone)
  }
}
const ring = (R, i) => ({
  id: R.id,
  kind: 'vfold',
  on: 'gutter',
  day: 28,
  at: R.at,
  glue: TUNNEL.glue,
  angle: [90, 90],
  outline: ringOutline(R),
  front(g) {
    const { ro, ri, dark } = R
    if (!ri) {
      // the end of the tunnel: solid night with one pinprick of light
      g.fill(N, sector(0, ro + 0.1, 180, 360, 40))
      const s = sparkle(0, -ro * 0.42, 0.24, 0.32)
      g.knock(N, (ctx) => ctx.fill(pathOf(sparkle(0, -ro * 0.42, 0.3, 0.36))))
      g.fill(Y, s)
      return
    }
    ringStripes(g, R, i, 1)
    if (dark) g.fill(N, sector(ri - 0.1, ro + 0.1, 180, 360, 60), dark)
    // keylines at both edges
    g.fill(N, sector(ri - 0.1, ri + 0.12, 180, 360, 60))
    if (i === 0) {
      // the mouth of the tube carries the day: knocked out of a federal band
      const band = sector(ro - 0.44, ro + 0.1, 180, 360, 60)
      g.knock(Y, (ctx) => ctx.fill(pathOf(band)))
      g.knock(P, (ctx) => ctx.fill(pathOf(band)))
      g.fill(N, band)
      const type = (ctx) => arcType(ctx, g, 'DAY 28 · INFINITE TUNNEL', ro - 0.33, 270, { size: 0.28, outward: true, tracking: 0.16 })
      g.knock(N, type)
      g.ink(Y, type)
    } else g.fill(N, sector(ro - 0.12, ro + 0.1, 180, 360, 60))
  },
  back(g) {
    const { ro, ri } = R
    if (!ri) {
      g.fill(N, sector(0, ro + 0.1, 180, 360, 40), 0.85)
      return
    }
    // the inside of the tube: its stripes carried round at 60%, darkening
    // toward the crease in hard steps
    ringStripes(g, R, i, 0.6, true)
    const { segs } = TUNNEL
    for (let j = 0; j < segs; j++) {
      const a0 = 180 + (180 * j) / segs
      const mid = (a0 + 90 / segs) * DEG
      g.fill(N, sector(ri - 0.1, ro + 0.1, a0 - 0.2, a0 + 180 / segs + 0.2, 6), 0.12 + 0.55 * (1 - Math.abs(Math.cos(mid))))
    }
    g.fill(N, sector(ri - 0.1, ri + 0.12, 180, 360, 60))
    g.fill(N, sector(ro - 0.12, ro + 0.1, 180, 360, 60))
  },
})

// ------------------------------------------- the postcard (52) and planet (34)
// A flap hinged on its right edge: the reader swings it open like a cover by
// the thumb tab on its free edge.
const PC = { hx: 14.6, y0: 9.3, HL: 7.6, BW: 5.2, tab: 0.72 }
/** page-upright drawing on the postcard's face (u → right, v → down) */
const onFront = (ctx) => {
  ctx.transform(0, -1, 1, 0, 0, 0)
  ctx.translate(-PC.BW, 0)
}
/** …and on its back, as it lies open to the right of the hinge */
const onBack = (ctx) => ctx.transform(0, 1, -1, 0, PC.HL, 0)

function ringedPlanet(ctx, g, { cx, cy, r, rx, ry, tilt }, part) {
  // part: 'back' half of the ring, 'body', or 'front' half of the ring
  ctx.save()
  ctx.translate(cx, cy)
  if (part === 'body') {
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, TAU)
    ctx.fill()
  } else {
    ctx.rotate(tilt * DEG)
    ctx.beginPath()
    if (part === 'back') ctx.rect(-rx - 1, -ry - 1, rx * 2 + 2, ry + 1)
    else ctx.rect(-rx - 1, 0, rx * 2 + 2, ry + 1)
    ctx.clip()
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU)
    ctx.ellipse(0, 0, rx * 0.76, ry * 0.62, 0, 0, TAU)
    ctx.fill('evenodd')
  }
  ctx.restore()
}

// the void window on the picture side: twenty postcards adrift (a dozen in
// view), one leaving through the right edge and wrapping back in on the left
const VOID = { u0: 0.35, v0: 0.35, u1: PC.BW - 0.35, v1: PC.HL - 1.55 }
const DRIFT = [
  // u, v, turn, scale, trail?
  [0.95, 2.75, -18, 0.9],
  [2.2, 2.6, 12, 0.7],
  [3.75, 2.95, -8, 1.15, 1],
  [1.55, 3.7, 22, 1.05, 1],
  [3.0, 3.95, -26, 0.8],
  [4.25, 4.45, 14, 0.75],
  [0.85, 4.75, -6, 0.75],
  [2.25, 5.0, 8, 1.2, 1],
  [3.55, 5.55, -14, 0.9],
  [1.2, 5.75, 28, 0.65],
  [VOID.u1, 4.1, 4, 1.0, 1],
  [VOID.u0, 4.1, 4, 1.0],
]
function tinyCard(ctx, [u, v, a, s], part) {
  ctx.save()
  ctx.translate(u, v)
  ctx.rotate(a * DEG)
  ctx.scale(s, s)
  if (part === 'body') ctx.fillRect(-0.34, -0.23, 0.68, 0.46)
  else if (part === 'stamp') ctx.fillRect(0.12, -0.16, 0.15, 0.17)
  else if (part === 'pic') ctx.fillRect(-0.27, -0.16, 0.3, 0.32)
  else if (part === 'trail' || part === 'trail-knock') {
    const grow = part === 'trail' ? 0 : 0.035
    for (let k = 1; k <= 5; k++) {
      ctx.beginPath()
      ctx.arc(-0.34 - k * 0.2, 0.04 * k, 0.058 - k * 0.006 + grow, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()
}
function clipVoid(ctx) {
  ctx.beginPath()
  ctx.rect(VOID.u0, VOID.v0, VOID.u1 - VOID.u0, VOID.v1 - VOID.v0)
  ctx.clip()
}

const postcard = {
  id: 'postcard',
  kind: 'flap',
  on: 'page:R',
  day: 52,
  at: [PC.hx, PC.y0],
  rot: 90,
  outline: [
    [0, 0],
    [PC.HL, 0],
    [PC.HL, PC.BW - 0.12],
    [PC.HL - 0.12, PC.BW],
    ...arcPts(PC.HL / 2, PC.BW, PC.tab, 0, 180, 18),
    [0.12, PC.BW],
    [0, PC.BW - 0.12],
  ],
  front(g) {
    const { BW, HL } = PC
    const up = (fn) => (ctx) => {
      onFront(ctx)
      fn(ctx)
    }
    // picture side: the void, framed in white
    g.ink(N, up((ctx) => ctx.fillRect(VOID.u0, VOID.v0, VOID.u1 - VOID.u0, VOID.v1 - VOID.v0)))
    // parallax stars, and one distant world
    const stars = Array.from({ length: 24 }, () => [g.rng.range(0.5, BW - 0.5), g.rng.range(0.5, VOID.v1 - 0.15), g.rng.chance(0.2) ? 0.06 : 0.035])
    g.knock(N, up((ctx) => stars.forEach(([u, v, r]) => ctx.fill(discPath(u, v, r + 0.03)))))
    g.ink(Y, up((ctx) => stars.forEach(([u, v, r]) => ctx.fill(discPath(u, v, r)))))
    g.knock(N, up((ctx) => ctx.fill(discPath(4.4, 3.6, 0.18))))
    g.ink(P, up((ctx) => ctx.fill(discPath(4.4, 3.6, 0.13))))
    // the drifting postcards, with fling trails behind the fast ones
    g.knock(N, up((ctx) => {
      clipVoid(ctx)
      for (const c of DRIFT) tinyCard(ctx, c, 'body')
    }))
    g.knock(N, up((ctx) => {
      clipVoid(ctx)
            for (const c of DRIFT) if (c[4]) tinyCard(ctx, c, 'trail-knock')
    }))
    g.ink(Y, up((ctx) => {
      clipVoid(ctx)
      DRIFT.forEach((c, i) => i % 2 || tinyCard(ctx, c, 'pic'))
      for (const c of DRIFT) if (c[4]) tinyCard(ctx, c, 'trail')
    }))
    g.ink(P, up((ctx) => {
      clipVoid(ctx)
      DRIFT.forEach((c, i) => (i % 2 ? tinyCard(ctx, c, 'pic') : null))
      for (const c of DRIFT) tinyCard(ctx, c, 'stamp')
    }))
    // the wrap: chevrons on the frame where it leaves and comes back
    g.ink(P, up((ctx) => {
      for (const u of [VOID.u1 + 0.06, 0.04]) {
        ctx.beginPath()
        ctx.moveTo(u, 3.94)
        ctx.lineTo(u + 0.24, 4.1)
        ctx.lineTo(u, 4.26)
        ctx.closePath()
        ctx.fill()
      }
    }))
    // greeting
    const greet = up((ctx) => setType(ctx, g, 'greetings from', BW / 2, 1.05, { kind: 'serif', size: 0.42, italic: true, weight: 600, align: 'center' }))
    g.knock(N, greet)
    g.ink(P, greet)
    const title = up((ctx) => setType(ctx, g, 'THE VOID', BW / 2, 2.0, { kind: 'display', size: 0.9, align: 'center', maxWidth: BW - 1.2 }))
    g.knock(N, title)
    g.ink(Y, title)
    // caption strip
    g.ink(N, up((ctx) => {
      setType(ctx, g, 'VOID POST · Nº 52', 0.4, HL - 0.95, { size: 0.3, tracking: 0.08 })
      ctx.fillStyle = g.tone(0.75)
      setType(ctx, g, 'one of twenty, drifting', 0.4, HL - 0.5, { kind: 'serif', size: 0.3, italic: true })
    }))
    // the thumb tab on the free edge
    g.ink(P, up((ctx) => {
      ctx.lineWidth = 0.08
      ctx.beginPath()
      ctx.arc(0, HL / 2, PC.tab - 0.12, Math.PI / 2, (Math.PI * 3) / 2)
      ctx.stroke()
      setType(ctx, g, 'lift', -0.36, HL / 2 + 0.1, { kind: 'serif', size: 0.3, italic: true, weight: 700, align: 'center' })
    }))
  },
  back(g) {
    const { BW, HL } = PC
    const up = (fn) => (ctx) => {
      onBack(ctx)
      fn(ctx)
    }
    // the message side, read once the card lies open
    const sx = BW - 1.65
    const sy = 0.4
    g.ink(P, up((ctx) => {
      // stamp with perforations
      ctx.fillRect(sx, sy, 1.25, 1.5)
      ctx.globalCompositeOperation = 'destination-out'
      for (let i = 0; i <= 6; i++) {
        for (const [x, y] of [
          [sx + (i * 1.25) / 6, sy],
          [sx + (i * 1.25) / 6, sy + 1.5],
        ]) {
          ctx.beginPath()
          ctx.arc(x, y, 0.07, 0, TAU)
          ctx.fill()
        }
      }
    }))
    g.knock(P, up((ctx) => ctx.fill(discPath(BW - 1.02, 0.95, 0.36))))
    g.ink(Y, up((ctx) => ctx.fill(discPath(BW - 1.02, 0.95, 0.32))))
    g.ink(N, up((ctx) => {
      setType(ctx, g, '52', BW - 1.02, 1.74, { kind: 'display', size: 0.36, align: 'center' })
      // postmark: a ring of type and wavy cancel lines across the stamp
      const mx = BW - 2.45
      const my = 1.2
      ctx.lineWidth = 0.05
      ctx.strokeStyle = g.tone(0.85)
      ctx.beginPath()
      ctx.arc(mx, my, 0.82, 0, TAU)
      ctx.stroke()
      for (let k = 0; k < 4; k++) {
        ctx.beginPath()
        for (let x = mx + 0.9; x < BW - 0.25; x += 0.1) {
          const y = 0.78 + k * 0.24 + Math.sin(x * 4) * 0.05
          if (x === mx + 0.9) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.fillStyle = g.tone(0.85)
      ctx.save()
      ctx.translate(mx, my)
      arcType(ctx, g, 'VOID POST', 0.5, 270, { size: 0.26, outward: true, tracking: 0.04 })
      arcType(ctx, g, 'DAY 52', 0.5, 90, { size: 0.26, tracking: 0.04 })
      ctx.restore()
      // message
      ctx.fillStyle = '#000'
      const msg = ['Wish you were here.', 'Twenty of us drift', 'out here, wrapping', 'round forever. Fling', 'one and watch it', 'glide. Love, 52']
      msg.forEach((ln, i) => setType(ctx, g, ln, 0.4, 2.75 + i * 0.5, { kind: 'serif', size: 0.33, italic: true }))
      // address
      ctx.fillStyle = g.tone(0.75)
      setType(ctx, g, 'to: whoever turns', 0.4, HL - 0.9, { size: 0.27 })
      setType(ctx, g, '    this page', 0.4, HL - 0.5, { size: 0.27 })
    }))
  },
}

const PLANET = { at: 4.7, glue: [58, 58], cx: 0, cy: -3.0, r: 1.86, rx: 3.08, ry: 0.78, tilt: -11 }
function planetTerrain(g, cy, r, clipBody) {
  // procedural terrain: noisy bands of pink over a yellow ground
  g.ink(P, (ctx) => {
    clipBody(ctx)
    for (let k = -7; k <= 7; k++) {
      const y = cy + k * 0.27
      ctx.fillStyle = g.tone(Math.min(1, 0.35 + 0.65 * Math.abs(Math.sin(k * 1.7))))
      ctx.beginPath()
      ctx.moveTo(-r, y)
      for (let x = -r; x <= r; x += 0.1) ctx.lineTo(x, y + Math.sin(x * 3 + k) * 0.07)
      ctx.lineTo(r, y + 0.19)
      ctx.lineTo(-r, y + 0.19)
      ctx.fill()
    }
  })
}
const planet = {
  id: 'planet',
  kind: 'vfold',
  on: 'postcard',
  day: 34,
  at: PLANET.at,
  glue: PLANET.glue,
  angle: [90, 90],
  outline: () =>
    cut({ x0: -3.5, y0: -5.1, w: 7, h: 5.3 }, (ctx) => {
      ringedPlanet(ctx, null, PLANET, 'back')
      ringedPlanet(ctx, null, PLANET, 'body')
      ringedPlanet(ctx, null, PLANET, 'front')
      ctx.beginPath()
      ctx.moveTo(-0.72, 0)
      ctx.lineTo(0.72, 0)
      ctx.lineTo(0.2, -0.45)
      ctx.lineTo(0.2, PLANET.cy + PLANET.r - 0.1)
      ctx.lineTo(-0.2, PLANET.cy + PLANET.r - 0.1)
      ctx.lineTo(-0.2, -0.45)
      ctx.closePath()
      ctx.fill()
    }),
  front(g) {
    const { cy, r } = PLANET
    const clipBody = (ctx) => ctx.clip(discPath(0, cy, r))
    // the ring behind: yellow, warmed with pink
    g.ink(Y, (ctx) => ringedPlanet(ctx, g, PLANET, 'back'))
    g.ink(P, (ctx) => {
      ctx.fillStyle = g.tone(0.4)
      ringedPlanet(ctx, g, PLANET, 'back')
    })
    // the body: yellow ground, pink bands, a federal terminator crescent
    g.knock(P, (ctx) => ringedPlanet(ctx, g, PLANET, 'body'))
    g.ink(Y, (ctx) => ringedPlanet(ctx, g, PLANET, 'body'))
    planetTerrain(g, cy, r, clipBody)
    const night = (ctx) => {
      clipBody(ctx)
      ctx.beginPath()
      ctx.arc(0, cy, r + 0.1, 0, TAU)
      ctx.arc(-0.75, cy - 0.3, r * 1.02, 0, TAU, true)
      ctx.fill()
    }
    g.ink(N, (ctx) => {
      ctx.fillStyle = g.tone(0.85)
      night(ctx)
    })
    // city lights on the night side
    for (let i = 0; i < 12; i++) {
      const a = g.rng.range(-0.6, 1.4)
      const d = g.rng.range(r - 0.55, r - 0.12)
      const x = Math.cos(a) * d
      const y = cy + Math.sin(a) * d
      g.knock(N, (ctx) => ctx.fill(discPath(x, y, 0.07)))
      g.knock(P, (ctx) => ctx.fill(discPath(x, y, 0.07)))
    }
    // the ring in front: clean yellow with two federal grooves
    g.knock(P, (ctx) => ringedPlanet(ctx, g, PLANET, 'front'))
    g.knock(N, (ctx) => ringedPlanet(ctx, g, PLANET, 'front'))
    g.ink(Y, (ctx) => ringedPlanet(ctx, g, PLANET, 'front'))
    g.ink(N, (ctx) => {
      ctx.save()
      ctx.translate(0, cy)
      ctx.rotate(PLANET.tilt * DEG)
      ctx.lineWidth = 0.05
      for (const k of [0.84, 0.93]) {
        ctx.beginPath()
        ctx.ellipse(0, 0, PLANET.rx * k, PLANET.ry * (0.62 + (k - 0.76) * 1.6), 0, 0, Math.PI)
        ctx.stroke()
      }
      ctx.restore()
    })
    // stalk
    g.fill(N, rect(-0.8, cy + r - 0.2, 1.6, -cy - r + 0.3))
  },
  back(g) {
    // painted as seen flipped left-to-right, so the ring tilts the other way
    const { cy, r } = PLANET
    const flip = { ...PLANET, tilt: -PLANET.tilt }
    g.ink(Y, (ctx) => {
      ringedPlanet(ctx, g, flip, 'back')
      ringedPlanet(ctx, g, flip, 'front')
    })
    g.ink(P, (ctx) => {
      ctx.fillStyle = g.tone(0.4)
      ringedPlanet(ctx, g, flip, 'back')
    })
    g.knock(P, (ctx) => ringedPlanet(ctx, g, flip, 'body'))
    g.knock(Y, (ctx) => ringedPlanet(ctx, g, flip, 'front'))
    g.ink(Y, (ctx) => ringedPlanet(ctx, g, flip, 'body'))
    planetTerrain(g, cy, r, (ctx) => ctx.clip(discPath(0, cy, r)))
    g.knock(P, (ctx) => ringedPlanet(ctx, g, flip, 'front'))
    g.ink(Y, (ctx) => ringedPlanet(ctx, g, flip, 'front'))
    g.fill(N, rect(-0.8, cy + r - 0.2, 1.6, -cy - r + 0.3))
  },
}

// ------------------------------------------------- the orrery (days 3, 18)
// A toothed disc under a fixed plate. The plate's window shows half the
// disc: the solar system's clockwork (03) at rest, a gravity merge (18) after
// half a turn. The slot below reads a label ring printed 03 all along the
// lower half and 18 all along the upper, so wherever the wheel stops it names
// whichever day fills most of the window.

const ORR = { x: 6.3, y: 16.95, r: 4.85, plate: 4.3 }
const WINDOW = { r0: 1.3, r1: 3.6, a0: 186, a1: 354 }
const SLOT = { r0: 3.72, r1: 4.22, a0: 60, a1: 120 }
const LRING = { r0: 3.64, r1: 4.3 }
const NAME = { y: 4.5, h: 1.85 }

function gear() {
  const out = []
  const teeth = 72
  for (let k = 0; k < teeth; k++) {
    const a = (k * 360) / teeth
    const s = 360 / teeth
    out.push(...[
      [a, ORR.r - 0.16],
      [a + s * 0.18, ORR.r],
      [a + s * 0.62, ORR.r],
      [a + s * 0.8, ORR.r - 0.16],
    ].map(([t, r]) => [Math.cos(t * DEG) * r, Math.sin(t * DEG) * r]))
  }
  return out
}
/** stroke into one ink with a paper keyline: knock federal wider first */
function keyline(g, ink, w, draw) {
  g.knock(N, (ctx) => {
    ctx.lineWidth = w + 0.05
    draw(ctx)
  })
  g.ink(ink, (ctx) => {
    ctx.lineWidth = w
    draw(ctx)
  })
}

// day 03's clockwork: planets on rails, and the tour's camera path
const RAILS = [1.68, 2.18, 2.68, 3.2]
const PLANETS03 = [
  [1.68, 232, 0.17, Y],
  [2.18, 298, 0.24, P],
  [2.68, 205, 0.2, P],
  [2.68, 258, 0.3, Y, 'ring'],
  [3.2, 330, 0.22, Y],
  [3.2, 224, 0.15, Y],
]
// day 18's gravity: three bodies falling into one merge. Laid out as seen in
// the window after half a turn (x right, y up the window), then printed
// upside down in the disc's lower half. The burst sits at the window's crown,
// where it also shows after a third of a turn.
const flip = ([x, y]) => [-x, y]
const BURST = { x: 0.2, y: 2.45, r: 0.85 }
const TRAILS = [
  [[-3.25, 0.42], [-2.85, 1.9], [-1.6, 3.05], [-0.42, 2.62]],
  [[3.25, 0.42], [2.9, 1.95], [1.85, 2.95], [0.9, 2.62]],
  [[-1.3, 0.85], [-0.6, 1.4], [-0.05, 1.55], [0.12, 1.85]],
].map((t) => t.map(flip))
const SURVIVORS = [
  [-2.3, 1.15, 0.17],
  [2.05, 1.05, 0.13],
  [1.25, 3.25, 0.12],
].map(([x, y, r]) => [-x, y, r])
const orrery = {
  id: 'orrery',
  kind: 'wheel',
  on: 'page:L',
  day: 18,
  at: [ORR.x, ORR.y],
  radius: ORR.r,
  outline: gear(),
  front(g) {
    const R = ORR.r
    g.fill(N, circ(0, 0, R + 0.1), 1)
    // knurled rim
    keyline(g, Y, 0.09, (ctx) => {
      for (let a = 0; a < 360; a += 5) {
        ctx.beginPath()
        ctx.moveTo(Math.cos(a * DEG) * (ORR.plate + 0.08), Math.sin(a * DEG) * (ORR.plate + 0.08))
        ctx.lineTo(Math.cos(a * DEG) * (R - 0.24), Math.sin(a * DEG) * (R - 0.24))
        ctx.stroke()
      }
    })
    // upper half — day 03: orbits on rails, planets placed like a tour
    const top = (ctx) => {
      ctx.beginPath()
      ctx.rect(-R, -R, 2 * R, R - 0.1)
      ctx.clip()
    }
    keyline(g, Y, 0.08, (ctx) => {
      top(ctx)
      for (const r of RAILS) {
        ctx.beginPath()
        ctx.arc(0, 0, r, Math.PI, TAU)
        ctx.stroke()
      }
    })
    // the tour's camera path, dashed, swooping planet to planet
    const tourPts = bezier([Math.cos(232 * DEG) * 1.68, Math.sin(232 * DEG) * 1.68], [-0.2, -2.9], [0.2, -3.0], [Math.cos(298 * DEG) * 2.18, Math.sin(298 * DEG) * 2.18], 30)
    const tour = (ctx) => {
      ctx.setLineDash([0.2, 0.14])
      ctx.beginPath()
      tourPts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.stroke()
    }
    keyline(g, P, 0.08, tour)
    for (const [r, a, s, ink, ringed] of PLANETS03) {
      const x = Math.cos(a * DEG) * r
      const y = Math.sin(a * DEG) * r
      const body = (ctx) => ctx.fill(discPath(x, y, s + 0.07))
      g.knock(N, body)
      g.knock(Y, body)
      g.circle(ink, x, y, s)
      if (ink === P) g.circle(Y, x - s * 0.3, y - s * 0.3, s * 0.42)
      if (ringed) {
        const band = (ctx) => {
          ctx.translate(x, y)
          ctx.rotate(-18 * DEG)
          ctx.beginPath()
          ctx.ellipse(0, 0, s * 2, s * 0.55, 0, 0, TAU)
          ctx.stroke()
        }
        keyline(g, P, 0.08, band)
      }
    }
    // lower half — day 18: what gravity does when you let it
    const bot = (ctx) => {
      ctx.beginPath()
      ctx.rect(-R, 0.1, 2 * R, R)
      ctx.clip()
    }
    // ripples of the well the bodies fall into: clean pink, dashed
    const [bx, by] = flip([BURST.x, BURST.y])
    keyline(g, P, 0.08, (ctx) => {
      bot(ctx)
      ctx.clip(annulus(0, 0, WINDOW.r0 - 0.05, LRING.r0 - 0.12))
      ctx.setLineDash([0.16, 0.14])
      for (const rr of [1.2, 1.62, 2.06]) {
        ctx.beginPath()
        ctx.arc(bx, by, rr, 0, TAU)
        ctx.stroke()
      }
    })
    // the trails, swelling as they fall in
    for (const t of TRAILS) {
      const pts = bezier(...t, 40)
      const wide = (ctx) => {
        bot(ctx)
        ctx.fill(pathOf(ribbon(pts, 0.15, 0.3)))
      }
      g.knock(N, wide)
      g.knock(P, wide)
      g.ink(Y, (ctx) => {
        bot(ctx)
        ctx.fill(pathOf(ribbon(pts, 0.05, 0.17)))
      })
    }
    // the merge: a pink burst round a yellow star
    const burst = starburst(bx, by, BURST.r, BURST.r * 0.48, 12, 0.13)
    const core = starburst(bx, by, 0.46, 0.2, 8, 0.4)
    g.knock(N, (ctx) => ctx.fill(pathOf(starburst(bx, by, BURST.r + 0.1, BURST.r * 0.48 + 0.1, 12, 0.13))))
    g.knock(Y, (ctx) => ctx.fill(pathOf(burst)))
    g.fill(P, burst)
    g.knock(P, (ctx) => ctx.fill(pathOf(core)))
    g.fill(Y, core)
    // survivors flung clear
    for (const [x, y, r] of SURVIVORS) {
      g.knock(N, (ctx) => ctx.fill(discPath(x, y, r + 0.07)))
      g.knock(P, (ctx) => ctx.fill(discPath(x, y, r + 0.07)))
      g.circle(Y, x, y, r)
    }
    // the dividing meridian
    keyline(g, Y, 0.08, (ctx) => {
      ctx.setLineDash([0.22, 0.16])
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(s * WINDOW.r0, 0)
        ctx.lineTo(s * (LRING.r0 - 0.08), 0)
        ctx.stroke()
      }
    })
    // the label ring the slot reads: 03 all along the lower half (in the
    // slot while 03 fills the window), 18 all along the upper
    const half = (lo) => pathOf(sector(LRING.r0, LRING.r1, lo, lo + 180, 60))
    g.knock(N, (ctx) => ctx.fill(pathOf(sector(LRING.r0 - 0.05, LRING.r1 + 0.03, 0, 360, 120))))
    g.ink(Y, (ctx) => ctx.fill(half(0)))
    g.ink(P, (ctx) => ctx.fill(half(180)))
    const rb = SLOT.r1 - 0.13
    const labelSet = (main, short, spin) => (ctx) => {
      ctx.rotate(spin)
      arcType(ctx, g, main, rb, 90, { size: 0.3, tracking: 0.05 })
      for (const a of [26, 154]) arcType(ctx, g, short, rb, a, { size: 0.3, tracking: 0.05 })
      ctx.fillStyle = '#000'
      for (const a of [48, 132, 8, 172]) {
        ctx.beginPath()
        ctx.arc(Math.cos(a * DEG) * (rb - 0.1), Math.sin(a * DEG) * (rb - 0.1), 0.045, 0, TAU)
        ctx.fill()
      }
    }
    const l03 = labelSet('03 · SOLAR SYSTEM', '03', 0)
    const l18 = labelSet('18 · N-BODY GRAVITY', '18', Math.PI)
    g.knock(Y, l03)
    g.ink(N, l03)
    g.knock(P, l18)
    g.ink(N, l18)
  },
}

const plate = {
  id: 'plate',
  kind: 'flat',
  on: 'page:L',
  day: 3,
  at: [ORR.x, ORR.y],
  outline: () => {
    const t = trace({ x0: -4.6, y0: -4.6, w: 9.2, h: 11.1 }, (ctx) => {
      ctx.beginPath()
      ctx.arc(0, 0, ORR.plate, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(-3.7, 2.8, 7.4, NAME.y + NAME.h - 2.8, 0.35)
      ctx.fill()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fill(pathOf(sector(WINDOW.r0, WINDOW.r1, WINDOW.a0, WINDOW.a1)))
      ctx.fill(pathOf(sector(SLOT.r0, SLOT.r1, SLOT.a0, SLOT.a1)))
    })
    return { outline: t.outline, holes: t.holes }
  },
  front(g) {
    g.fill(Y, rect(-5, -5, 10, 12), 0.6)
    // engraved ring and ticks round the window, in clean federal
    const engrave = (ctx) => {
      ctx.beginPath()
      ctx.arc(0, 0, WINDOW.r1 + 0.1, WINDOW.a0 * DEG, WINDOW.a1 * DEG)
      ctx.stroke()
      const n = 12
      for (let i = 0; i <= n; i++) {
        const a = (WINDOW.a0 + ((WINDOW.a1 - WINDOW.a0) * i) / n) * DEG
        const r0 = WINDOW.r1 + 0.1
        const r1 = r0 + (i % 3 ? 0.17 : 0.34)
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0)
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1)
        ctx.stroke()
      }
      ctx.beginPath()
      ctx.arc(0, 0, ORR.plate - 0.14, (SLOT.a1 + 6) * DEG, (SLOT.a0 + 354) * DEG)
      ctx.stroke()
    }
    g.knock(Y, (ctx) => {
      ctx.lineWidth = 0.12
      engrave(ctx)
    })
    g.ink(N, (ctx) => {
      ctx.lineWidth = 0.07
      engrave(ctx)
    })
    // the instruction, along the lower arc, with arrows both ways
    const turn = (ctx) => {
      arcType(ctx, g, 'TURN THE RIM', 2.98, 90, { size: 0.28, tracking: 0.24 })
      ctx.lineWidth = 0.08
      for (const [a0, a1] of [
        [44, 22],
        [136, 158],
      ]) {
        ctx.beginPath()
        ctx.arc(0, 0, 2.86, a0 * DEG, a1 * DEG, a1 < a0)
        ctx.stroke()
        const t = a1 * DEG
        const d = Math.sign(a1 - a0)
        const tx = -Math.sin(t) * d
        const ty = Math.cos(t) * d
        const x = Math.cos(t) * 2.86
        const y = Math.sin(t) * 2.86
        ctx.beginPath()
        ctx.moveTo(x + tx * 0.2, y + ty * 0.2)
        ctx.lineTo(x - tx * 0.05 + Math.cos(t) * 0.15, y - ty * 0.05 + Math.sin(t) * 0.15)
        ctx.lineTo(x - tx * 0.05 - Math.cos(t) * 0.15, y - ty * 0.05 - Math.sin(t) * 0.15)
        ctx.closePath()
        ctx.fill()
      }
    }
    g.knock(Y, turn)
    g.ink(N, turn)
    // the sun at the rivet
    g.fill(P, starburst(0, 0, WINDOW.r0 - 0.08, 1.0, 16))
    g.circle(P, 0, 0, 0.95)
    g.circle(Y, -0.25, -0.25, 0.42, 0.7)
    g.circle(N, 0, 0, 0.07)
    // nameplate: everything on it knocked out of the federal band
    const band = rect(-3.8, NAME.y, 7.6, NAME.h + 0.3)
    g.knock(Y, (ctx) => ctx.fill(pathOf(band)))
    g.fill(N, band)
    const name = (ctx) => setType(ctx, g, 'Orrery', 0, NAME.y + 0.98, { kind: 'display', size: 0.68, align: 'center' })
    g.knock(N, name)
    g.ink(Y, name)
    const sub = (ctx) => setType(ctx, g, 'CLOCKWORK · GRAVITY', 0, NAME.y + 1.5, { size: 0.28, align: 'center', tracking: 0.14 })
    g.knock(N, sub)
    g.ink(P, sub)
  },
}

// -------------------------------------------------------------------- pages

const idx = dayIndex({ days: CH.days, side: 'R', x: 7.2, y: 19.3, width: 12.2, cols: 2, gap: 1.2, size: 0.4, ink: N, accent: P })

/**
 * The tunnel's floor, printed across the gutter from the last ring's feet: a
 * striped lane widening toward the reader through the feet of every ring,
 * its stripes bunching and darkening with distance, so the paper rings become
 * the near end of an endless tube.
 */
const FLOOR = { y0: 18.9, y1: 24.6, w0: 0.35, slope: 1.15, n: 11 }
function tunnelFloor(g, side) {
  const X = (d) => (side === 'L' ? W - d : d)
  const half = (y) => FLOOR.w0 + FLOOR.slope * (y - FLOOR.y0)
  const ys = Array.from({ length: FLOOR.n + 1 }, (_, k) => FLOOR.y0 + (FLOOR.y1 - FLOOR.y0) * (k / FLOOR.n) ** 1.5)
  for (let k = 0; k < FLOOR.n; k++) {
    const ya = ys[k]
    const yb = ya + (ys[k + 1] - ya) * 0.55
    const quad = [
      [X(0), ya],
      [X(half(ya)), ya],
      [X(half(yb)), yb],
      [X(0), yb],
    ]
    g.fill(k % 2 ? Y : P, quad, 0.35 + (0.6 * k) / FLOOR.n)
    const dark = 0.6 * (1 - k / (FLOOR.n * 0.55))
    if (dark > 0) g.fill(N, quad, dark)
  }
  g.stroke(N, [
    [X(half(FLOOR.y0)), FLOOR.y0],
    [X(half(FLOOR.y1)), FLOOR.y1],
  ], 0.08, 0.8)
}

function leftPage(g) {
  // a few early stars round the title
  for (let i = 0; i < 26; i++) {
    const x = g.rng.range(0.8, 12)
    const y = g.rng.range(1.4, 7.5)
    if (x < 9 && y > 2 && y < 7) continue
    g.circle(g.rng.pick([Y, P]), x, y, g.rng.range(0.03, 0.07))
  }
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', N)
  // numeral and title
  g.text(Y, CH.numeral, M.outer + 0.12, 5.42, { kind: 'display', size: 3.4 })
  g.text(P, CH.numeral, M.outer, 5.3, { kind: 'display', size: 3.4 })
  g.text(N, 'The Night', 3.3, 3.75, { kind: 'display', size: 1.2 })
  g.text(N, 'Sky', 3.3, 5.2, { kind: 'display', size: 1.2 })
  g.text(P, 'seven days of looking up', 3.32, 6.0, { kind: 'serif', size: 0.42, italic: true })
  g.para(
    N,
    'A solar system you could tour like a film. A sandbox where gravity merges whatever you throw into it. A globe of city hubs strung on glowing corridors, a tunnel that never ends, a planet grown from noise, the Earth with its arcs of data, and twenty postcards adrift in the void.',
    M.outer,
    7.35,
    8.6,
    { size: 0.37, leading: 0.5 },
  )
  tunnelFloor(g, 'L')
  g.text(N, 'turn the toothed rim: clockwork becomes gravity', ORR.x, 24.0, { kind: 'serif', size: 0.33, italic: true, align: 'center', tone: 0.85 })
  folio(g, pl, 'L', N)
}

function rightPage(g) {
  runningHead(g, 'days 03 · 18 · 19 · 28 · 34 · 40 · 52', 'R', N)
  tunnelFloor(g, 'R')
  // postcards drifting off toward the fore-edge, with their fling trails
  const cards = [
    [12.2, 3.4, -14, 1.9],
    [15.6, 2.4, 9, 1.5],
    [17.6, 5.6, -6, 1.2],
  ]
  for (const [x, y, a, s] of cards) {
    g.ink(N, (ctx) => {
      ctx.translate(x, y)
      ctx.rotate(a * DEG)
      ctx.lineWidth = 0.06
      ctx.strokeRect(-s / 2, -s * 0.33, s, s * 0.66)
      ctx.fillStyle = g.tone(0.5)
      ctx.fillRect(s / 2 - s * 0.24, -s * 0.33 + s * 0.08, s * 0.16, s * 0.2)
      for (let k = 1; k <= 6; k++) {
        ctx.beginPath()
        ctx.arc(-s / 2 - 0.1 - k * 0.24, k * 0.05, 0.05, 0, TAU)
        ctx.fill()
      }
    })
    g.ink(P, (ctx) => {
      ctx.translate(x, y)
      ctx.rotate(a * DEG)
      ctx.fillStyle = g.tone(0.55)
      ctx.fillRect(-s / 2 + 0.12, -s * 0.33 + 0.12, s * 0.5, s * 0.66 - 0.24)
    })
  }
  // under the postcard: the hole it was covering, and the planet's name
  const { hx, y0, HL, BW } = PC
  g.fill(N, rect(hx - BW + 0.1, y0 + 0.1, BW - 0.2, HL - 0.2))
  for (let i = 0; i < 30; i++) {
    const x = g.rng.range(hx - BW + 0.3, hx - 0.3)
    const y = g.rng.range(y0 + 0.3, y0 + HL - 0.3)
    g.knock(N, (ctx) => ctx.fill(discPath(x, y, 0.07)))
    g.circle(Y, x, y, g.rng.chance(0.25) ? 0.06 : 0.035)
  }
  g.knock(N, (ctx) => ctx.fillRect(hx - BW + 0.35, y0 + HL - 1.55, 3.6, 1.2))
  g.text(P, '34', hx - BW + 0.45, y0 + HL - 0.85, { kind: 'display', size: 0.62 })
  g.text(N, 'a planet grown', hx - BW + 1.35, y0 + HL - 1.08, { kind: 'serif', size: 0.3, italic: true })
  g.text(N, 'from noise', hx - BW + 1.35, y0 + HL - 0.7, { kind: 'serif', size: 0.3, italic: true })
  idx.paint(g)
  folio(g, pr, 'R', N)
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: leftPage, R: rightPage },
  pieces: [sky, ...SLICES.map((glue, k) => globeSlice(`globe-${'abc'[k]}`, glue, k)), ...RINGS.map(ring), orrery, plate, postcard, planet],
  spots: [
    ...idx.spots,
    // the planet's name, printed in the hole under the postcard
    { day: 34, on: 'page:R', rect: [PC.hx - PC.BW + 0.2, PC.y0 + PC.HL - 1.6, 3.8, 1.3] },
  ],
}
