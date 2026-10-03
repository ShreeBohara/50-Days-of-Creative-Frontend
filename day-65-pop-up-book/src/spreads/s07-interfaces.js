// Chapter VII — Interfaces. Nine days on the side of the screen people touch,
// built as the one thing a screen can only pretend to have: real layers.
// Back to front, a z-index made of card, every layer wearing its day tag in
// the same teal label as the title's "z-index: 65":
//
//   gallery   the masonry wall (day 9): quiet tints, columns running out past
//             its own top edge
//   dash      the dashboards (21, 36), telemetry bars breaking out of the frame
//   kanban    the board (25): columns and a card mid-drag on its left wing,
//             a short stub on the right
//   graph     the dependency graph (26), mirrored and a little nearer: a stub
//             on the left, the network on the right, its loops die-cut open
//   bento     a bento-grid platform (37) carrying the pricing trio (35)
//
// and two things for the reader's hands:
//
//   cmdk      a ⌘K palette (56) on the right page, hinged like a door: swing it
//             open and the palette pops up out of the hinge, while the page it
//             uncovers says ↵ and runs a dashed route into the scene
//   wizard    a pull-tab onboarding card (29) on the left page: pull it and its
//             pointer walks the steps, the avatar and the progress bar fill in
//             through die-cut windows, and its top edge uncovers "Onboarding
//             request sent."

import { makeRng } from '../art/rng.js'
import { makeCanvas } from '../art/riso.js'
import { trace } from '../art/trace.js'
import { W } from '../paper/dims.js'
import { area } from '../paper/polygon.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayIndex, folio, ngon, pad2, runningHead, starburst } from './furniture.js'

const CH = CHAPTERS[6]
const [pl, pr] = folios(7)
const [TEAL, PINK, INK] = CH.inks // teal, pink, black
const DEG = Math.PI / 180
const ALL = [[-40, -40], [40, -40], [40, 40], [-40, 40]]

// ------------------------------------------------------------------ helpers

/** One line of type inside an ink callback (any transform), set at 100× like g.text. */
function say(g, ctx, str, x, y, o = {}) {
  const { kind = 'mono', size = 0.3, weight = 400, italic = false, align = 'left', tracking = 0, tone = 1 } = o
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(0.01, 0.01)
  ctx.font = g.font(kind, size * 100, { weight, italic })
  ctx.fillStyle = g.tone(tone)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const tr = tracking * size * 100
  const chars = [...str]
  const w = tr ? chars.reduce((s, ch) => s + ctx.measureText(ch).width + tr, -tr) : ctx.measureText(str).width
  let sx = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
  if (!tr) ctx.fillText(str, sx, 0)
  else {
    for (const ch of chars) {
      ctx.fillText(ch, sx, 0)
      sx += ctx.measureText(ch).width + tr
    }
  }
  ctx.restore()
}

const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}
/** Fill a rounded rect in one ink (tone = tint). */
const box = (g, ink, x, y, w, h, r = 0.12, tone = 1) =>
  g.ink(ink, (ctx) => {
    ctx.fillStyle = g.tone(tone)
    rr(ctx, x, y, w, h, r)
    ctx.fill()
  })
/** Erase one ink under a rounded rect, so whatever is below prints clean. */
const unbox = (g, ink, x, y, w, h, r = 0.12) =>
  g.knock(ink, (ctx) => {
    rr(ctx, x, y, w, h, r)
    ctx.fill()
  })
/** Clear `under` from a line of type, then print it in `ink`: colour type that survives a dark ground. */
function clean(g, ink, under, str, x, y, o) {
  for (const u of under) g.knock(u, (ctx) => say(g, ctx, str, x, y, o))
  g.ink(ink, (ctx) => say(g, ctx, str, x, y, o))
}

/** ⌘, the place-of-interest sign, stroked (no font in the book carries it). */
function cmdGlyph(ctx, cx, cy, s, lw) {
  const a = s * 0.16
  const r = s * 0.17
  const e = a + r
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(cx - a, cy - e)
  ctx.lineTo(cx - a, cy + e)
  ctx.moveTo(cx + a, cy - e)
  ctx.lineTo(cx + a, cy + e)
  ctx.moveTo(cx - e, cy - a)
  ctx.lineTo(cx + e, cy - a)
  ctx.moveTo(cx - e, cy + a)
  ctx.lineTo(cx + e, cy + a)
  ctx.stroke()
  for (const [sx, sy, t0] of [
    [1, 1, -0.5],
    [-1, 1, 0],
    [-1, -1, 0.5],
    [1, -1, 1],
  ]) {
    ctx.beginPath()
    ctx.arc(cx + sx * e, cy + sy * e, r, t0 * Math.PI, (t0 + 1.5) * Math.PI)
    ctx.stroke()
  }
}

/** A tick, as a stroke. */
function tick(ctx, x, y, s, lw) {
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x - s * 0.5, y)
  ctx.lineTo(x - s * 0.15, y + s * 0.36)
  ctx.lineTo(x + s * 0.55, y - s * 0.42)
  ctx.stroke()
}

/** An arrow from (x0,y0) to (x1,y1) with an open head. */
function arrow(ctx, x0, y0, x1, y1, head, lw) {
  const t = Math.atan2(y1 - y0, x1 - x0)
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.moveTo(x1 - head * Math.cos(t - 0.55), y1 - head * Math.sin(t - 0.55))
  ctx.lineTo(x1, y1)
  ctx.lineTo(x1 - head * Math.cos(t + 0.55), y1 - head * Math.sin(t + 0.55))
  ctx.stroke()
}

/** The return key glyph ↵. */
function enterGlyph(ctx, x, y, s, lw) {
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x + s, y - s * 0.7)
  ctx.lineTo(x + s, y)
  ctx.lineTo(x, y)
  ctx.moveTo(x + s * 0.32, y - s * 0.3)
  ctx.lineTo(x, y)
  ctx.lineTo(x + s * 0.32, y + s * 0.3)
  ctx.stroke()
}

/**
 * Snap traced vertices onto a card's glue edge, exactly: the line through the
 * origin at angle `a` (0 = the straight bottom edge y = 0 of a 90/90 card).
 */
function snapBase(poly, a = 0, eps = 0.07) {
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  return poly.map(([x, y]) => {
    if (Math.abs(x * dy - y * dx) >= eps) return [x, y]
    const t = x * dx + y * dy
    return [t * dx, t * dy]
  })
}

/**
 * Spread a cut's vertices evenly along its edge (no edge longer than `step`).
 * The cut is the same; a traced curve no longer outweighs a long straight
 * edge wherever a panel's vertices are averaged (the preview's depth sort).
 */
function even(poly, step = 0.45) {
  const out = []
  poly.forEach(([x, y], i) => {
    const [nx, ny] = poly[(i + 1) % poly.length]
    const n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / step))
    for (let k = 0; k < n; k++) out.push([x + ((nx - x) * k) / n, y + ((ny - y) * k) / n])
  })
  return out
}

/**
 * Extra vertices along a card's glue edge (y = 0), a micron inside the card
 * (the panel clip drops points lying exactly on a glue line). The cut is the
 * same; it only weights the vertex average the preview sorts panels by, so a
 * tall card standing behind another doesn't get painted over it.
 */
function ballast(poly, step) {
  const out = []
  poly.forEach(([x, y], i) => {
    const [nx, ny] = poly[(i + 1) % poly.length]
    out.push([x, y])
    if (y !== 0 || ny !== 0) return
    const n = Math.ceil(Math.abs(nx - x) / step)
    for (let k = 1; k < n; k++) out.push([x + ((nx - x) * k) / n, -1e-4])
  })
  return out
}

/**
 * Trace a card drawing into one die-cut piece, its glue edge snapped exact.
 *   minHole  cut out the enclosed gaps bigger than this (cm²) too, and return
 *            { outline, holes }
 *   lean     the drawing is authored upright and turned by −lean onto a
 *            slanted glue edge (a leaning V-fold, see leanOf)
 */
function cut(name, bounds, draw, { minHole = 0, lean = 0 } = {}) {
  const t = trace(bounds, (ctx) => {
    ctx.rotate(-lean)
    draw(ctx)
  })
  if (t.islands.length) console.warn(`interfaces/${name}: ${t.islands.length} loose island(s) left out of the cut`)
  const outline = even(snapBase(t.outline, -lean))
  if (!minHole) return outline
  return { outline, holes: t.holes.filter((h) => Math.abs(area(h)) > minHole) }
}

/** A rounded rectangle as a cut polygon. */
function pillPts(x, y, w, h, r, k = 5) {
  const pts = []
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= k; i++) {
      const a = a0 + (i / k) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  corner(x + w - r, y + r, -Math.PI / 2)
  corner(x + w - r, y + h - r, 0)
  corner(x + r, y + h - r, Math.PI / 2)
  corner(x + r, y + r, Math.PI)
  return pts
}

/**
 * A painter kit drawn through an extra transform: for cards that sit turned
 * on the page (the ⌘K flap), so their art can be authored the way the
 * reader sees it. Only the calls those painters use.
 */
function turned(g, m) {
  const on = (fn) => (ctx) => {
    ctx.transform(...m)
    fn(ctx)
  }
  const k = {
    tone: g.tone,
    font: g.font,
    measure: g.measure,
    ink: (name, fn) => g.ink(name, on(fn)),
    knock: (name, fn) => g.knock(name, on(fn)),
    fill: (name, shape, tone = 1) =>
      k.ink(name, (ctx) => {
        ctx.fillStyle = g.tone(tone)
        ctx.fill(Array.isArray(shape) ? g.path(shape) : shape)
      }),
    text: (name, str, x, y, o = {}) => k.ink(name, (ctx) => say(g, ctx, str, x, y, o)),
    knockText: (name, str, x, y, o = {}) => k.knock(name, (ctx) => say(g, ctx, str, x, y, o)),
  }
  return k
}

// The day tag every layer wears: a teal label, its type knocked to paper,
// with a hairline of paper round it so it reads on any ground (even teal).
const TAG = { h: 0.54, pad: 0.17, ring: 0.07, r: 0.1 }
const TAG_TYPE = { kind: 'mono', size: 0.32, tracking: 0.06 }
const tagW = (g, str) => g.measure(str, TAG_TYPE) + TAG.pad * 2
/** Print a tag with its top-left at (x, y) through kit k (g or a turned kit); returns its width. */
function tag(k, g, str, x, y, clear = [PINK, INK, TEAL]) {
  const w = tagW(g, str)
  const { h, ring: q, r } = TAG
  for (const ink of clear) {
    k.knock(ink, (ctx) => {
      rr(ctx, x - q, y - q, w + 2 * q, h + 2 * q, r + q)
      ctx.fill()
    })
  }
  k.ink(TEAL, (ctx) => {
    rr(ctx, x, y, w, h, r)
    ctx.fill()
  })
  k.knock(TEAL, (ctx) => say(g, ctx, str, x + TAG.pad, y + h / 2 + TAG_TYPE.size * 0.36, TAG_TYPE))
  return w
}

// ------------------------------------------------- gallery · masonry (day 9)
// The backdrop: a masonry wall whose columns run out past its own top edge,
// as if the infinite scroll had nowhere left to go. Leans back 10°. Printed
// in tints, so it stays wallpaper: only three tiles are solid ink.

const GAL = { at: 10.6, glue: 68, angle: 100 }
const GAL_DROP = Math.tan((GAL.angle - 90) * DEG) // the glue edge falls this much per cm outward
const galFoot = (x) => Math.abs(x) * GAL_DROP
const GAL_COLS = [-8.3, -9.7, -8.8, -9.9, -8.9, -10.1, -8.5, -9.3].map((top, i) => ({
  x0: -9.8 + i * 2.1,
  x1: -9.8 + (i + 1) * 2.1,
  top,
}))

function skyline(cols, foot, r = 0.32) {
  const pts = [[cols[0].x0, foot(cols[0].x0)]]
  cols.forEach((c, i) => {
    const leftOpen = i === 0 || cols[i - 1].top > c.top
    const rightOpen = i === cols.length - 1 || cols[i + 1].top > c.top
    if (leftOpen) for (let k = 0; k <= 4; k++) pts.push([c.x0 + r + r * Math.cos(Math.PI + (k / 4) * Math.PI / 2), c.top + r + r * Math.sin(Math.PI + (k / 4) * Math.PI / 2)])
    else pts.push([c.x0, c.top])
    if (rightOpen) for (let k = 0; k <= 4; k++) pts.push([c.x1 - r + r * Math.cos(1.5 * Math.PI + (k / 4) * Math.PI / 2), c.top + r + r * Math.sin(1.5 * Math.PI + (k / 4) * Math.PI / 2)])
    else pts.push([c.x1, c.top])
  })
  const xr = cols[cols.length - 1].x1
  pts.push([xr, foot(xr)], [0, 0])
  return pts
}
const GAL_OUTLINE = even(skyline(GAL_COLS, galFoot))

// the solid accents, by column:row
const GAL_ACCENT = new Map([
  ['1:1', 'pink'],
  ['3:1', 'night'],
  ['6:1', 'teal'],
])

// tiles: stacked from each column's top down past the glue edge. Flat
// "photos" in tints, never the same picture twice running in a column or
// across a row.
const GAL_TILES = (() => {
  const rng = makeRng('interfaces:masonry')
  const out = []
  let left = []
  GAL_COLS.forEach((c, ci) => {
    let y = c.top + 0.08
    let k = 0
    let prev = -1
    const mine = []
    while (y < 2.4) {
      const h = rng.range(2.6, 3.8)
      const beside = left.find((t) => t.y < y + h / 2 && t.y + t.h > y + h / 2)
      let motif = rng.int(0, 4)
      for (let n = 0; n < 6 && (motif === prev || motif === beside?.motif); n++) motif = (motif + 1) % 5
      const t = { x: c.x0 + 0.08, y, w: c.x1 - c.x0 - 0.16, h: h - 0.16, motif, ci, k, tone: rng.range(0.45, 0.6), accent: GAL_ACCENT.get(`${ci}:${k}`) }
      out.push(t)
      mine.push(t)
      prev = motif
      y += h
      k++
    }
    left = mine
  })
  return out
})()

function tileArt(g, t) {
  const { x, y, w, h } = t
  const v = t.tone
  const clip = (ctx) => {
    rr(ctx, x, y, w, h, 0.16)
    ctx.clip()
  }
  const hill = (ctx, lift = 0) => {
    ctx.beginPath()
    ctx.ellipse(x + w * 0.25, y + h * (1.08 - lift), w * 0.95, h * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const sun = (ctx, r = Math.min(w, h) * 0.2) => {
    ctx.beginPath()
    ctx.arc(x + w * 0.68, y + h * 0.3, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const waves = (ctx) => {
    ctx.lineWidth = 0.1
    for (let yy = y + h * 0.45; yy < y + h; yy += 0.4) {
      ctx.beginPath()
      for (let xx = x - 0.2; xx <= x + w + 0.2; xx += 0.1) ctx.lineTo(xx, yy + Math.sin(xx * 5.5 + yy) * 0.07)
      ctx.stroke()
    }
  }
  if (t.accent === 'night') {
    // a night shot: paper moon and hill cut out of solid black
    box(g, INK, x, y, w, h, 0.16)
    g.knock(INK, (ctx) => {
      clip(ctx)
      hill(ctx, 0.06)
      sun(ctx, Math.min(w, h) * 0.15)
    })
    return
  }
  if (t.accent === 'pink') {
    box(g, PINK, x, y, w, h, 0.16)
    g.knock(PINK, (ctx) => {
      clip(ctx)
      hill(ctx)
      sun(ctx)
    })
    return
  }
  if (t.accent === 'teal') {
    box(g, TEAL, x, y, w, h, 0.16)
    g.knock(TEAL, (ctx) => {
      clip(ctx)
      waves(ctx)
    })
    g.circle(PINK, x + w * 0.3, y + h * 0.22, Math.min(w, h) * 0.14)
    return
  }
  switch (t.motif) {
    case 0: // a pink print: sun and hill cut out of it
      box(g, PINK, x, y, w, h, 0.16, v)
      g.knock(PINK, (ctx) => {
        clip(ctx)
        hill(ctx)
        sun(ctx)
      })
      break
    case 1: // teal, with a pink sun over a paper hill
      box(g, TEAL, x, y, w, h, 0.16, v)
      g.knock(TEAL, (ctx) => {
        clip(ctx)
        hill(ctx, 0.05)
        sun(ctx)
      })
      g.ink(PINK, (ctx) => {
        ctx.fillStyle = g.tone(0.6)
        sun(ctx)
      })
      break
    case 2: // paper sky, teal hill, pink sun overprinting it
      g.ink(TEAL, (ctx) => {
        clip(ctx)
        ctx.fillStyle = g.tone(0.14)
        ctx.fillRect(x, y, w, h)
        ctx.fillStyle = g.tone(v)
        hill(ctx, 0.1)
      })
      g.ink(PINK, (ctx) => {
        ctx.fillStyle = g.tone(0.5)
        sun(ctx, Math.min(w, h) * 0.24)
      })
      break
    case 3: // a portrait
      box(g, PINK, x, y, w, h, 0.16, v * 0.55)
      g.ink(TEAL, (ctx) => {
        clip(ctx)
        ctx.fillStyle = g.tone(v)
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h * 0.42, Math.min(w, h) * 0.21, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(x + w / 2, y + h + 0.05, w * 0.36, h * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
      })
      break
    default: // the sea, paper waves cut out of a teal tint
      box(g, TEAL, x, y, w, h, 0.16, v)
      g.knock(TEAL, (ctx) => {
        clip(ctx)
        waves(ctx)
      })
      g.circle(PINK, x + w * 0.3, y + h * 0.22, Math.min(w, h) * 0.13, 0.6)
  }
}

const gallery = {
  id: 'gallery',
  kind: 'vfold',
  on: 'gutter',
  day: 9,
  at: GAL.at,
  glue: [GAL.glue, GAL.glue],
  angle: [GAL.angle, GAL.angle],
  outline: GAL_OUTLINE,
  front(g) {
    for (const t of GAL_TILES) tileArt(g, t)
    tag(g, g, '09 · MASONRY', GAL_COLS[0].x0 + 0.22, GAL_COLS[0].top + 0.26)
  },
  back(g) {
    g.fill(TEAL, ALL, 0.22)
    g.knock(TEAL, (ctx) => {
      for (const t of GAL_TILES) {
        rr(ctx, -t.x - t.w, t.y, t.w, t.h, 0.14)
        ctx.lineWidth = 0.08
        ctx.stroke()
      }
    })
  },
}

// --------------------------------------------- dash · the dashboards (21, 36)
// A dark screen in a teal bezel. Its telemetry bars run up out of the chart,
// through the bezel and off the top of the card; a pink alert bubble sits on
// its corner. Everything coloured on the black screen has the black knocked
// out under it first, or it would print as more black.

const DASH = { at: 12.9, glue: 56, x0: -7.0, x1: 9.0, top: -7.6 }
const SCR = { x0: -6.6, x1: 8.6, y0: -6.75, y1: -0.5 }
const BARS = [
  [4.55, -8.6],
  [5.45, -9.8],
  [6.35, -9.1],
  [7.25, -10.2],
].map(([x, top]) => ({ x, top, w: 0.68 }))
const BUBBLE = { x: -6.75, y: -7.45, r: 0.72 }
// day 21's tag on the title bar (the dash card itself is PulseGrid, 36)
const TAG21 = { str: '21 · DASHBOARD', x: -5.8, y: (DASH.top + SCR.y0) / 2 - TAG.h / 2 }

const dashOutline = () =>
  ballast(cut('dash', { x0: -8, y0: -10.6, w: 17.6, h: 10.8 }, (ctx) => {
    rr(ctx, DASH.x0, DASH.top, DASH.x1 - DASH.x0, -DASH.top + 0.05, [0.5, 0.5, 0, 0])
    ctx.fill()
    for (const b of BARS) {
      rr(ctx, b.x, b.top, b.w, -b.top - 1, [0.18, 0.18, 0, 0])
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(BUBBLE.x, BUBBLE.y, BUBBLE.r, 0, Math.PI * 2)
    ctx.fill()
  }), 0.2)

// a little line chart, as points in the left half of the screen
const LINE = [0.2, 0.34, 0.28, 0.5, 0.44, 0.62, 0.55, 0.78, 0.7, 0.9]

const dash = {
  id: 'dash',
  kind: 'vfold',
  on: 'gutter',
  day: 36,
  at: DASH.at,
  glue: [DASH.glue, DASH.glue],
  angle: [90, 90],
  outline: dashOutline,
  front(g) {
    // bezel, screen
    g.fill(TEAL, ALL)
    unbox(g, TEAL, SCR.x0, SCR.y0, SCR.x1 - SCR.x0, SCR.y1 - SCR.y0, 0.2)
    box(g, INK, SCR.x0, SCR.y0, SCR.x1 - SCR.x0, SCR.y1 - SCR.y0, 0.2)
    // stat cards (21): count-up numbers
    const stat = (x, num, label) => {
      g.knock(INK, (ctx) => {
        rr(ctx, x, -6.4, 2.85, 1.55, 0.14)
        ctx.lineWidth = 0.1
        ctx.stroke()
      })
      g.ink(TEAL, (ctx) => {
        rr(ctx, x, -6.4, 2.85, 1.55, 0.14)
        ctx.lineWidth = 0.05
        ctx.stroke()
      })
      clean(g, PINK, [INK], num, x + 0.2, -5.5, { kind: 'display', size: 0.62 })
      clean(g, TEAL, [INK], label, x + 0.22, -5.06, { size: 0.24, tracking: 0.06 })
    }
    stat(-6.35, '12,480', 'VISITORS +14%')
    stat(-3.3, '98.6%', 'UPTIME')
    // line chart
    const cx0 = -6.3
    const cx1 = -0.55
    const cy0 = -4.35
    const cy1 = -0.85
    const pts = LINE.map((v, i) => [cx0 + ((cx1 - cx0) * i) / (LINE.length - 1), cy1 - (cy1 - cy0) * v])
    const grid = (ctx) => {
      for (let k = 0; k <= 3; k++) {
        const y = cy0 + ((cy1 - cy0) * k) / 3
        ctx.beginPath()
        ctx.moveTo(cx0, y)
        ctx.lineTo(cx1, y)
        ctx.stroke()
      }
    }
    g.knock(INK, (ctx) => {
      ctx.lineWidth = 0.07
      grid(ctx)
    })
    g.ink(TEAL, (ctx) => {
      ctx.lineWidth = 0.035
      grid(ctx)
    })
    const under = [...pts, [cx1, cy1], [cx0, cy1]]
    g.knock(INK, (ctx) => ctx.fill(g.path(under)))
    g.ramp(PINK, under, 0, cy0, 0, cy1, 0.7, 0.15)
    g.knock(INK, (ctx) => {
      ctx.lineWidth = 0.16
      ctx.stroke(g.path(pts, false))
    })
    g.stroke(PINK, pts, 0.11)
    for (const [x, y] of pts.slice(-1)) {
      g.knock(INK, (ctx) => {
        ctx.beginPath()
        ctx.arc(x, y, 0.2, 0, Math.PI * 2)
        ctx.fill()
      })
      g.circle(PINK, x, y, 0.17)
    }
    // gauge (36)
    const gx = 2.15
    const gy = -3.55
    g.knock(INK, (ctx) => {
      ctx.lineWidth = 0.42
      ctx.beginPath()
      ctx.arc(gx, gy, 1.45, Math.PI, Math.PI * 2)
      ctx.stroke()
    })
    g.ink(TEAL, (ctx) => {
      ctx.lineWidth = 0.36
      ctx.beginPath()
      ctx.arc(gx, gy, 1.45, Math.PI, Math.PI * 2)
      ctx.stroke()
    })
    g.knock(TEAL, (ctx) => {
      ctx.lineWidth = 0.42
      ctx.beginPath()
      ctx.arc(gx, gy, 1.45, Math.PI, Math.PI * 1.72)
      ctx.stroke()
    })
    g.ink(PINK, (ctx) => {
      ctx.lineWidth = 0.36
      ctx.beginPath()
      ctx.arc(gx, gy, 1.45, Math.PI, Math.PI * 1.72)
      ctx.stroke()
    })
    g.knock(INK, (ctx) => say(g, ctx, '72%', gx, gy - 0.16, { kind: 'display', size: 0.62, align: 'center' }))
    clean(g, TEAL, [INK], 'CPU', gx, gy + 0.3, { size: 0.26, align: 'center', tracking: 0.14 })
    // heatmap
    const hm = makeRng('interfaces:heat')
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        const x = 0.35 + c * 0.55
        const y = -2.35 + r * 0.6
        unbox(g, INK, x, y, 0.47, 0.5, 0.06)
        box(g, TEAL, x, y, 0.47, 0.5, 0.06, hm.pick([0.2, 0.35, 0.55, 0.8, 1, 1]))
      }
    }
    // the bars, out through the bezel, on a clean teal baseline
    for (const b of BARS) {
      for (const ink of [INK, TEAL]) unbox(g, ink, b.x, b.top, b.w, -b.top - 0.75, [0.18, 0.18, 0, 0])
      box(g, PINK, b.x, b.top, b.w, -b.top - 0.75, [0.18, 0.18, 0, 0])
    }
    unbox(g, INK, 4.36, -0.83, 3.83, 0.12, 0)
    box(g, TEAL, 4.4, -0.8, 3.75, 0.06, 0)
    // title bar: the alert bubble on the corner, then one tag per day, as tabs
    g.knock(TEAL, (ctx) => {
      ctx.beginPath()
      ctx.arc(BUBBLE.x, BUBBLE.y, BUBBLE.r + 0.1, 0, Math.PI * 2)
      ctx.fill()
    })
    g.circle(PINK, BUBBLE.x, BUBBLE.y, BUBBLE.r)
    g.knock(PINK, (ctx) => say(g, ctx, '3', BUBBLE.x, BUBBLE.y + 0.22, { kind: 'display', size: 0.62, align: 'center' }))
    const ty = TAG21.y
    tag(g, g, TAG21.str, TAG21.x, ty, [TEAL])
    const w36 = tag(g, g, '36 · PULSEGRID', 0.25, ty, [TEAL])
    g.knock(TEAL, (ctx) => {
      ctx.beginPath()
      ctx.arc(0.25 + w36 + 0.32, ty + TAG.h / 2, 0.15, 0, Math.PI * 2)
      ctx.fill()
    })
    g.circle(PINK, 0.25 + w36 + 0.32, ty + TAG.h / 2, 0.12)
  },
  back(g) {
    g.fill(TEAL, ALL, 0.85)
    g.knock(TEAL, (ctx) => {
      ctx.lineWidth = 0.08
      for (let x = -6; x <= 6; x += 0.5) {
        ctx.beginPath()
        ctx.moveTo(x, -6.6)
        ctx.lineTo(x, -5.4)
        ctx.stroke()
      }
      say(g, ctx, 'VII', -1.5, -2.6, { kind: 'display', size: 1.4, align: 'center' })
    })
  },
}

// Day 21's tag again, cut as a label card of its own and glued right over the
// printed one, so a tap on "21" opens day 21 and not the PulseGrid card under
// it. `at` is the dash card's origin: the label is drawn in its coordinates.
const dashTag = {
  id: 'dashTag',
  kind: 'flat',
  on: 'dash.A',
  day: 21,
  at: [0, 0],
  outline: () => {
    // tagW without a print kit (the fonts are in before a spread compiles)
    const ctx = makeCanvas(8, 8).getContext('2d')
    ctx.font = `400 ${TAG_TYPE.size * 100}px "Fragment Mono"`
    const tr = TAG_TYPE.tracking * TAG_TYPE.size * 100
    const w = [...TAG21.str].reduce((s, ch) => s + ctx.measureText(ch).width + tr, -tr) / 100 + TAG.pad * 2
    const q = TAG.ring
    return pillPts(TAG21.x - q, TAG21.y - q, w + 2 * q, TAG.h + 2 * q, TAG.r + q)
  },
  front(g) {
    tag(g, g, TAG21.str, TAG21.x, TAG21.y, [])
  },
  // its back only ever faces the dash: left blank
}

// ------------------------------------------- the middle layer, split in two
// The kanban (25) stands on the left and the dependency graph (26) a step
// nearer on the right, each with its art out on one wing and a short stub
// glued on the other page, so the middle stays open and the screen shows
// through. Their glue is mirrored, [60°, 44°] and [44°, 60°]: each art
// wing glues at 60° and faces the reader, each stub at 44° tucks in. A
// V-fold with unequal glue angles only folds flat if its card angles differ
// by the same amount the other way (βa − βb = θb − θa), so the cards are cut
// [82°, 98°] and [98°, 82°]: their glue edges are slanted lines, and the
// two lean apart a little as they stand, the kanban left, the graph right.

const MID = { stub: 1.4 }
/** The glue edge's slope on a card cut at these angles. */
const leanOf = (angle) => (angle[0] - 90) * DEG
/** Art is authored upright on a floor at y = 0, then turned onto the slanted glue edge. */
const rotFor = (lean) => [Math.cos(-lean), Math.sin(-lean), -Math.sin(-lean), Math.cos(-lean), 0, 0]
const rotPt = (m) => ([u, v]) => [u * m[0] + v * m[2], u * m[1] + v * m[3]]
/** A back painter's view of card points: backs are painted flipped left-to-right. */
const flipX = (g, pts) => pts.map(([x, y]) => [2 * g.box.x0 + g.box.w - x, y])
/** The floor strip a middle card stands on: a teal guide rule and its name. */
function floor(g, u0, u1, name, x, align) {
  g.ink(TEAL, (ctx) => {
    ctx.fillRect(u0 + 0.2, -0.86, u1 - u0 - 0.4, 0.06)
    ctx.fillStyle = g.tone(0.5)
    for (let u = u0 + 0.35; u < u1 - 0.3; u += 0.5) ctx.fillRect(u, -0.12, 0.25, 0.04)
  })
  g.text(TEAL, name, x, -0.3, { size: 0.26, tracking: 0.14, align })
}
/** The dark floor strip seen from behind, along the slanted glue edge. */
function floorBack(g, m, u0, u1) {
  g.fill(PINK, ALL, 0.28)
  g.fill(INK, flipX(g, [[u0, -0.9], [u1, -0.9], [u1, 0.3], [u0, 0.3]].map(rotPt(m))), 0.85)
}

// ---------------------------------------------------------- kanban (day 25)

const KAN = { at: 15.2, glue: [60, 44], angle: [82, 98] }
KAN.lean = leanOf(KAN.angle)
KAN.rot = rotFor(KAN.lean)
const KCOLS = [
  { x: -8.6, top: -4.9, name: 'TO DO', cards: 3 },
  { x: -6.65, top: -3.95, name: 'DOING', cards: 2 },
  { x: -4.7, top: -5.8, name: 'DONE', cards: 3 },
]
const KW = 1.75
const KTAB = { x: -8.6, y: -5.9, w: 1.05, h: 1.2 } // the tag's tab, up off the first column
const DRAG = { cx: -5.85, cy: -4.55, w: 2.0, h: 1.08, rot: -13 }

function dragPath(ctx, pad = 0) {
  ctx.save()
  ctx.translate(DRAG.cx, DRAG.cy)
  ctx.rotate(DRAG.rot * DEG)
  rr(ctx, -DRAG.w / 2 - pad, -DRAG.h / 2 - pad, DRAG.w + pad * 2, DRAG.h + pad * 2, 0.16 + pad)
  ctx.restore()
}
// the hand on the dragged card: an arrow cursor
const CURSOR = [
  [0, 0],
  [0, 1.05],
  [0.26, 0.8],
  [0.46, 1.22],
  [0.62, 1.14],
  [0.43, 0.73],
  [0.78, 0.71],
].map(([x, y]) => [x - 5.3, y - 4.75])
const cursorPath = (ctx) => {
  ctx.beginPath()
  CURSOR.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

const kanbanOutline = () =>
  cut(
    'kanban',
    { x0: -9.9, y0: -8.2, w: 12.2, h: 9.2 },
    (ctx) => {
      rr(ctx, -8.6, -0.9, 8.6 + MID.stub, 0.95, [0.2, 0.2, 0, 0])
      ctx.fill()
      for (const c of KCOLS) {
        rr(ctx, c.x, c.top, KW, -c.top, [0.26, 0.26, 0, 0])
        ctx.fill()
      }
      rr(ctx, KTAB.x, KTAB.y, KTAB.w, KTAB.h, [0.22, 0.22, 0, 0])
      ctx.fill()
      dragPath(ctx, 0.1)
      ctx.fill()
      ctx.lineWidth = 0.22
      ctx.lineJoin = 'round'
      cursorPath(ctx)
      ctx.fill()
      ctx.stroke()
    },
    { lean: KAN.lean },
  )

const kanban = {
  id: 'kanban',
  kind: 'vfold',
  on: 'gutter',
  day: 25,
  at: KAN.at,
  glue: KAN.glue,
  angle: KAN.angle,
  outline: kanbanOutline,
  front(g0) {
    const g = turned(g0, KAN.rot)
    // the floor strip stays paper, ruled like a baseline guide, so the two
    // middle cards don't add up to one more chevron
    floor(g, -8.6, MID.stub, 'KANBAN BOARD', -8.35, 'left')
    // columns: teal lanes under solid headers, paper cards with a coloured edge
    const rng = makeRng('interfaces:kanban')
    for (const c of KCOLS) {
      box(g, TEAL, c.x - 0.2, c.top - 0.2, KW + 0.4, -c.top - 0.7, [0.3, 0.3, 0, 0], 0.45)
      box(g, TEAL, c.x - 0.2, c.top - 0.2, KW + 0.4, 0.82, [0.3, 0.3, 0, 0])
      g.knock(TEAL, (ctx) => {
        say(g0, ctx, c.name, c.x + 0.12, c.top + 0.42, { size: 0.24, tracking: 0.1 })
        say(g0, ctx, String(c.cards), c.x + KW - 0.12, c.top + 0.42, { size: 0.24, align: 'right' })
      })
      for (let i = 0; i < c.cards; i++) {
        const y = c.top + 0.8 + i * 1.02
        unbox(g, TEAL, c.x + 0.06, y, KW - 0.12, 0.9, 0.12)
        g.ink(INK, (ctx) => {
          rr(ctx, c.x + 0.06, y, KW - 0.12, 0.9, 0.12)
          ctx.lineWidth = 0.035
          ctx.stroke()
          ctx.fillStyle = g.tone(0.85)
          ctx.fillRect(c.x + 0.36, y + 0.26, rng.range(0.75, 1.25), 0.1)
          ctx.fillStyle = g.tone(0.5)
          ctx.fillRect(c.x + 0.36, y + 0.47, rng.range(0.5, 1.0), 0.07)
        })
        const edge = c.name === 'DONE' ? TEAL : (i + KCOLS.indexOf(c)) % 2 ? INK : PINK
        g.ink(edge, (ctx) => {
          ctx.save()
          rr(ctx, c.x + 0.06, y, KW - 0.12, 0.9, 0.12)
          ctx.clip()
          ctx.fillRect(c.x + 0.06, y, 0.16, 0.9)
          ctx.restore()
        })
        if (c.name === 'DONE') g.ink(TEAL, (ctx) => tick(ctx, c.x + 0.52, y + 0.7, 0.3, 0.08))
        else box(g, i % 2 ? TEAL : PINK, c.x + 0.36, y + 0.62, 0.5, 0.14, 0.07, 0.8)
      }
    }
    // the card being dragged: its shadow on the lane, the card, the hand on it
    g.ink(INK, (ctx) => {
      ctx.translate(0.16, 0.24)
      dragPath(ctx)
      ctx.fillStyle = g.tone(0.45)
      ctx.fill()
    })
    for (const ink of [TEAL, INK]) {
      g.knock(ink, (ctx) => {
        dragPath(ctx, 0.1)
        ctx.fill()
      })
    }
    g.ink(PINK, (ctx) => {
      dragPath(ctx)
      ctx.fill()
    })
    g.knock(PINK, (ctx) => {
      ctx.translate(DRAG.cx, DRAG.cy)
      ctx.rotate(DRAG.rot * DEG)
      ctx.fillRect(-0.82, -0.3, 1.35, 0.13)
      ctx.fillRect(-0.82, -0.05, 0.95, 0.09)
      rr(ctx, -0.82, 0.2, 0.58, 0.17, 0.085)
      ctx.fill()
    })
    g.knock(PINK, (ctx) => {
      ctx.lineWidth = 0.2
      ctx.lineJoin = 'round'
      cursorPath(ctx)
      ctx.stroke()
    })
    g.ink(INK, (ctx) => {
      cursorPath(ctx)
      ctx.fill()
    })
    tag(g, g0, '25', KTAB.x + 0.14, KTAB.y + 0.13)
  },
  back(g) {
    floorBack(g, KAN.rot, -9, MID.stub + 0.2)
  },
}

// -------------------------------------------------- graph · dependencies (26)
// Its loops are die-cut, so the dashboard behind shows through the network.

const GRAPH = { at: 16.4, glue: [44, 60], angle: [98, 82] }
GRAPH.lean = leanOf(GRAPH.angle)
GRAPH.rot = rotFor(GRAPH.lean)
const NODES = [
  { x: 5.25, y: -4.35, r: 1.05, label: 'react', ink: PINK },
  { x: 7.7, y: -3.05, r: 0.64, label: 'd3', ink: TEAL },
  { x: 7.35, y: -5.6, r: 0.55, label: 'svg', ink: TEAL },
  { x: 3.35, y: -6.25, r: 0.6, label: 'motion', ink: INK },
  { x: 5.75, y: -6.9, r: 0.34, label: '', ink: PINK },
  { x: 3.1, y: -2.5, r: 0.5, label: 'dom', ink: INK },
  { x: 8.3, y: -1.45, r: 0.28, label: '', ink: INK },
]
const LINKS = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 5],
  [2, 4],
  [3, 4],
  [1, 6],
  [1, -1],
  [5, -1],
  [0, -1],
]
const GTAB = { x: 1.65, y: -7.5, w: 1.5, h: 0.8 } // the tag's tab, hung off the "motion" node
const nodeAt = (i, n) => (i < 0 ? { x: NODES[n].x, y: -0.45 } : NODES[i])
function links(ctx) {
  for (const [a, b] of LINKS) {
    const p = nodeAt(a, b)
    const q = nodeAt(b, a)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(q.x, q.y)
    ctx.stroke()
  }
}

const graphOutline = () =>
  cut(
    'graph',
    { x0: -3, y0: -9.4, w: 12.4, h: 10 },
    (ctx) => {
      rr(ctx, -MID.stub, -0.9, MID.stub + 8.6, 0.95, [0.2, 0.2, 0, 0])
      ctx.fill()
      ctx.lineWidth = 0.45
      links(ctx)
      for (const n of NODES) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + 0.13, 0, Math.PI * 2)
        ctx.fill()
      }
      rr(ctx, GTAB.x, GTAB.y, GTAB.w, GTAB.h, 0.22)
      ctx.fill()
    },
    { minHole: 0.2, lean: GRAPH.lean },
  )

const graph = {
  id: 'graph',
  kind: 'vfold',
  on: 'gutter',
  day: 26,
  at: GRAPH.at,
  glue: GRAPH.glue,
  angle: GRAPH.angle,
  outline: graphOutline,
  front(g0) {
    const g = turned(g0, GRAPH.rot)
    floor(g, -MID.stub, 8.6, 'DEPENDENCY GRAPH', 8.35, 'right')
    // black links with a paper edge, then the nodes
    g.ink(INK, (ctx) => {
      ctx.lineWidth = 0.2
      links(ctx)
    })
    for (const n of NODES) {
      g.knock(INK, (ctx) => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + 0.05, 0, Math.PI * 2)
        ctx.fill()
      })
      g.ink(n.ink, (ctx) => {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fill()
      })
      if (n.label) {
        const size = Math.min(0.3, (n.r * 1.55) / Math.max(2.2, n.label.length) / 0.6)
        g.knockText(n.ink, n.label, n.x, n.y + size * 0.36, { size, align: 'center' })
      }
    }
    tag(g, g0, '26', GTAB.x + 0.13, GTAB.y + 0.13)
  },
  back(g) {
    floorBack(g, GRAPH.rot, -MID.stub - 0.2, 9)
  },
}

// ---------------------------------------------- bento · the platform (37)
// The pricing card stands across the head half of the top, so that half
// holds the quiet contribution heatmap; the tiles that should be seen (the
// 37, the clock, the theme toggle, "hi.") sit in the tail half, in front.

const BENTO = { span: [20.6, 24.8], a: 4.2, b: 4.2, h: 2.4 }
const BX = { wallA: 0, topA: 2.4, mid: 6.6, wallB: 10.8, end: 13.2 }

const bento = {
  id: 'bento',
  kind: 'box',
  on: 'gutter',
  day: 37,
  span: BENTO.span,
  a: BENTO.a,
  b: BENTO.b,
  h: BENTO.h,
  front(g) {
    const [y0, y1] = BENTO.span
    const G = 0.14
    // walls: teal, punched with a small grid
    for (const x of [BX.wallA, BX.wallB]) {
      box(g, TEAL, x, y0, 2.4, y1 - y0, 0)
      g.knock(TEAL, (ctx) => {
        for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) {
          rr(ctx, x + 0.35 + i * 0.6, y0 + 0.4 + j * 0.75, 0.42, 0.55, 0.08)
          ctx.fill()
        }
      })
    }
    // head half: the tag, then the contributions heatmap across the crease
    const tw = tag(g, g, '37', BX.topA + G + 0.06, y0 + G + 0.06)
    const hm = makeRng('interfaces:contrib')
    const hx0 = BX.topA + G + tw + 0.32
    for (let c = 0; hx0 + c * 0.5 + 0.4 < BX.wallB - G; c++) {
      const x = hx0 + c * 0.5
      if (Math.abs(x + 0.2 - BX.mid) < 0.26) continue
      for (let r = 0; r < 3; r++) box(g, TEAL, x, y0 + 0.24 + r * 0.56, 0.4, 0.42, 0.06, hm.pick([0.15, 0.3, 0.5, 0.8, 1]))
    }
    // tail half
    const ty = 22.8
    const th = y1 - G - ty
    // a big pink 37
    const x37 = BX.topA + G
    box(g, PINK, x37, ty, 2.06, th, 0.18)
    g.knock(PINK, (ctx) => say(g, ctx, '37', x37 + 1.03, 24.32, { kind: 'display', size: 1.12, align: 'center' }))
    // clock
    const xc = x37 + 2.06 + G
    const cx = xc + 0.86
    const cy = ty + th / 2
    box(g, INK, xc, ty, 1.72, th, 0.18)
    g.knock(INK, (ctx) => {
      ctx.beginPath()
      ctx.arc(cx, cy, 0.66, 0, Math.PI * 2)
      ctx.fill()
    })
    g.ink(INK, (ctx) => {
      ctx.lineWidth = 0.08
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx, cy - 0.48)
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + 0.36, cy + 0.14)
      ctx.stroke()
    })
    g.circle(PINK, cx, cy, 0.07)
    // theme toggle
    const xt = BX.mid + G
    box(g, TEAL, xt, ty, 1.62, th, 0.18)
    g.knock(TEAL, (ctx) => {
      ctx.beginPath()
      ctx.arc(xt + 0.81, cy, 0.52, 0, Math.PI * 2)
      ctx.fill()
    })
    g.ink(TEAL, (ctx) => {
      ctx.beginPath()
      ctx.arc(xt + 0.81, cy, 0.52, -Math.PI / 2, Math.PI / 2)
      ctx.fill()
    })
    // hello tile
    const xh = xt + 1.62 + G
    box(g, PINK, xh, ty, BX.wallB - G - xh, th, 0.18, 0.35)
    g.text(INK, 'hi.', xh + 0.3, ty + 1.2, { kind: 'display', size: 0.66 })
  },
  back(g) {
    g.fill(TEAL, ALL, 0.3)
  },
}

// --------------------------------------------- pricing · three plans (35)

// day 35's own plans and monthly prices (its content.js), Pro the "Most Popular"
const PRICE = { at: 21.0, glue: 52 }
const TABLETS = [
  { x: -3.85, w: 2.45, top: -3.75, name: 'Starter', price: '$29' },
  { x: -1.15, w: 2.3, top: -4.95, name: 'Pro', price: '$79', hot: true },
  { x: 1.4, w: 2.45, top: -3.75, name: 'Enterprise', price: '$249' },
]
const PTAB = { x: -3.85, y: -4.5, w: 1.04, h: 1.0 }
const BADGE = starburst(0, -5.05, 0.86, 0.66, 12, -Math.PI / 2)

const pricingOutline = () =>
  cut('pricing', { x0: -4.2, y0: -6.2, w: 8.4, h: 6.4 }, (ctx) => {
    rr(ctx, -3.85, -0.6, 7.7, 0.65, 0)
    ctx.fill()
    for (const t of TABLETS) {
      rr(ctx, t.x, t.top, t.w, -t.top, [0.28, 0.28, 0, 0])
      ctx.fill()
    }
    rr(ctx, PTAB.x, PTAB.y, PTAB.w, PTAB.h, [0.22, 0.22, 0, 0])
    ctx.fill()
    ctx.fill(new Path2D(BADGE.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + 'Z'))
  })

const pricing = {
  id: 'pricing',
  kind: 'vfold',
  on: 'bento',
  day: 35,
  at: PRICE.at,
  glue: [PRICE.glue, PRICE.glue],
  angle: [90, 90],
  outline: pricingOutline,
  front(g) {
    // three solid plans, the type knocked out to paper
    for (const t of TABLETS) {
      const cx = t.x + t.w / 2
      const ink = t.hot ? PINK : TEAL
      box(g, ink, t.x, t.top, t.w, -t.top + 0.1, [0.28, 0.28, 0, 0])
      g.knock(ink, (ctx) => {
        if (t.hot) {
          say(g, ctx, t.name, cx, t.top + 1.4, { kind: 'serif', size: 0.38, weight: 700, align: 'center' })
          say(g, ctx, t.price, cx, t.top + 2.5, { kind: 'display', size: 0.95, align: 'center' })
          say(g, ctx, 'PER MONTH', cx, t.top + 2.95, { size: 0.24, align: 'center', tracking: 0.08 })
          for (let i = 0; i < 3; i++) ctx.fillRect(cx - 0.65, t.top + 3.3 + i * 0.28, 1.3 - i * 0.24, 0.09)
        } else {
          say(g, ctx, t.name, cx, t.top + 0.75, { kind: 'serif', size: 0.36, weight: 700, align: 'center' })
          // 0.78, so "$249" keeps a margin on its 2.45 cm tablet
          say(g, ctx, t.price, cx, t.top + 1.72, { kind: 'display', size: 0.78, align: 'center' })
          for (let i = 0; i < 3; i++) ctx.fillRect(cx - 0.65, t.top + 2.2 + i * 0.27, 1.3 - i * 0.26, 0.09)
        }
      })
    }
    g.fill(INK, BADGE)
    g.knock(INK, (ctx) => say(g, ctx, 'POPULAR', 0, -4.97, { size: 0.22, align: 'center', tracking: 0.02 }))
    // the monthly / yearly toggle on the base
    box(g, INK, -4, -0.62, 8, 0.7, 0)
    g.knock(INK, (ctx) => {
      say(g, ctx, 'MONTHLY', -0.6, -0.17, { size: 0.24, align: 'right', tracking: 0.06 })
      say(g, ctx, 'YEARLY', 0.6, -0.17, { size: 0.24, tracking: 0.06 })
      rr(ctx, -0.42, -0.47, 0.84, 0.38, 0.19)
      ctx.lineWidth = 0.05
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0.21, -0.28, 0.13, 0, Math.PI * 2)
      ctx.fill()
    })
    tag(g, g, '35', PTAB.x + 0.12, PTAB.y + 0.12)
  },
  back(g) {
    g.fill(PINK, ALL, 0.3)
  },
}

// ------------------------------------------- cmdk · the ⌘K palette (56)
// A flap hinged along its right edge (rot 90: its hinge runs down the page,
// toward the reader). The reader swings it open like a door; the palette
// card glued across the hinge stands up out of it, and the page it uncovers
// answers: ↵, jump to the kanban, and a dashed route off into the scene.

const FLAP = { x: 14.4, y: 17.6, len: 7.0, wid: 5.4 } // hinge at page x, from page y, len along it; body wid toward the spine
const flapOutline = (() => {
  const { len: L, wid: Wd } = FLAP
  const r = 0.4
  const pts = [
    [0, 0],
    [L, 0],
  ]
  for (let k = 0; k <= 5; k++) pts.push([L - r + r * Math.cos((k / 5) * Math.PI / 2), Wd - r + r * Math.sin((k / 5) * Math.PI / 2)])
  for (let k = 0; k <= 5; k++) pts.push([r + r * Math.cos(Math.PI / 2 + (k / 5) * Math.PI / 2), Wd - r + r * Math.sin(Math.PI / 2 + (k / 5) * Math.PI / 2)])
  return pts
})()
// page-aligned frames: (u, v) = cm right and down from the card's top-left as the reader sees it
const FLAP_FRONT = [0, -1, 1, 0, 0, FLAP.wid] // closed, lying over x ∈ [x − wid, x]
const FLAP_BACK = [0, 1, -1, 0, FLAP.len, 0] // open, lying face down over x ∈ [x, x + wid]

const cmdk = {
  id: 'cmdk',
  kind: 'flap',
  on: 'page:R',
  day: 56,
  at: [FLAP.x, FLAP.y],
  rot: 90,
  outline: flapOutline,
  front(g) {
    const k = turned(g, FLAP_FRONT)
    const Wd = FLAP.wid
    k.fill(INK, ALL)
    const tw = tag(k, g, '56', 0.42, 0.4, [INK])
    const name = { kind: 'display', size: 0.44 }
    k.knockText(INK, 'CommandOS', 0.42 + tw + 0.24, 0.85, name)
    k.text(PINK, 'CommandOS', 0.42 + tw + 0.24, 0.85, name)
    // search field
    k.knock(INK, (ctx) => {
      rr(ctx, 0.45, 1.3, Wd - 0.9, 1.0, 0.5)
      ctx.fill()
    })
    k.ink(INK, (ctx) => {
      ctx.lineWidth = 0.07
      ctx.beginPath()
      ctx.arc(0.98, 1.75, 0.17, 0, Math.PI * 2)
      ctx.moveTo(1.11, 1.88)
      ctx.lineTo(1.28, 2.05)
      ctx.stroke()
    })
    k.text(INK, 'Search days, commands…', 1.5, 1.9, { size: 0.27, tone: 0.75 })
    // the two keys
    for (const [x, glyph] of [
      [0.6, 'cmd'],
      [2.9, 'K'],
    ]) {
      k.knock(INK, (ctx) => {
        rr(ctx, x - 0.08, 2.83, 2.06, 2.37, 0.32)
        ctx.fill()
      })
      k.ink(TEAL, (ctx) => {
        rr(ctx, x, 2.78, 1.9, 2.2, 0.28)
        ctx.fill()
      })
      k.ink(TEAL, (ctx) => {
        ctx.fillStyle = g.tone(0.5)
        rr(ctx, x - 0.02, 4.83, 1.94, 0.28, [0, 0, 0.28, 0.28])
        ctx.fill()
      })
      if (glyph === 'cmd') k.knock(TEAL, (ctx) => cmdGlyph(ctx, x + 0.95, 3.85, 1.35, 0.12))
      else k.knockText(TEAL, 'K', x + 0.95, 4.33, { kind: 'display', size: 1.2, align: 'center' })
    }
    // the prompt, pink on a clean ground
    const swing = (ctx) => arrow(ctx, 0.55, 6.15, 2.25, 6.15, 0.2, 0.08)
    const hint = { kind: 'serif', size: 0.4, italic: true }
    k.knock(INK, (ctx) => {
      ctx.save()
      swing(ctx)
      ctx.lineWidth = 0.16
      ctx.stroke()
      ctx.restore()
    })
    k.ink(PINK, swing)
    k.knockText(INK, 'swing open', 2.5, 6.28, hint)
    k.text(PINK, 'swing open', 2.5, 6.28, hint)
  },
  back(g) {
    const k = turned(g, FLAP_BACK)
    const Wd = FLAP.wid
    // the palette stands on the strip within 2.6 cm of the hinge, so the
    // type keeps to the 2.3 cm beyond it, where nothing stands in front
    const R = Wd - 0.35
    const fit = 2.3
    k.fill(TEAL, ALL, 0.16)
    k.ink(PINK, (ctx) => {
      rr(ctx, 0, 0, Wd, 1.0, [0, 0.4, 0, 0])
      ctx.fill()
    })
    k.knockText(PINK, 'COMMAND / 56', R, 0.64, { size: 0.26, tracking: 0.08, align: 'right' })
    const name = { kind: 'display', size: 0.62 }
    name.size = Math.min(0.62, (0.62 * fit) / g.measure('CommandOS', name))
    k.text(INK, 'CommandOS', R, 1.85, { ...name, align: 'right' })
    ;['built from scratch:', 'fuzzy search,', 'nested pages,', 'hands on the keys'].forEach((l, i) =>
      k.text(INK, l, R, 2.45 + i * 0.37, { kind: 'serif', size: 0.27, italic: true, align: 'right' }),
    )
    // the keys it listens for, in a row in front of the palette's foot
    const keys = [
      ['move', (ctx, x, y) => {
        arrow(ctx, x - 0.15, y + 0.14, x - 0.15, y - 0.16, 0.1, 0.045)
        arrow(ctx, x + 0.15, y - 0.16, x + 0.15, y + 0.14, 0.1, 0.045)
      }],
      ['open', (ctx, x, y) => enterGlyph(ctx, x - 0.19, y + 0.07, 0.38, 0.05)],
      ['close', (ctx, x, y) => say(g, ctx, 'esc', x, y + 0.09, { size: 0.26, align: 'center' })],
    ]
    keys.forEach(([label, glyph], i) => {
      const x = 0.5 + i * 1.65
      const y = 5.75
      k.ink(INK, (ctx) => {
        rr(ctx, x, y, 1.0, 0.6, 0.14)
        ctx.lineWidth = 0.045
        ctx.stroke()
        glyph(ctx, x + 0.5, y + 0.3)
      })
      k.text(TEAL, label, x + 0.5, y + 1.0, { kind: 'mono', size: 0.26, tracking: 0.06, align: 'center' })
    })
  },
}

const PAL = { at: 3.5, glue: 54, hw: 3.2, top: -4.2 }
const palette = {
  id: 'palette',
  kind: 'vfold',
  on: 'cmdk',
  day: 56,
  at: PAL.at,
  glue: [PAL.glue, PAL.glue],
  angle: [90, 90],
  outline: (() => {
    const { hw, top } = PAL
    const r = 0.3
    const pts = [[-hw, 0], [hw, 0]]
    for (let k = 0; k <= 4; k++) pts.push([hw - r + r * Math.cos((-k / 4) * Math.PI / 2), top + r + r * Math.sin((-k / 4) * Math.PI / 2)])
    for (let k = 0; k <= 4; k++) pts.push([-hw + r + r * Math.cos(-Math.PI / 2 - (k / 4) * Math.PI / 2), top + r + r * Math.sin(-Math.PI / 2 - (k / 4) * Math.PI / 2)])
    return pts
  })(),
  front(g) {
    const { hw, top } = PAL
    // a dark search bar across the top, the results on paper below it
    box(g, INK, -hw, top, hw * 2, 1.1, [0.3, 0.3, 0, 0])
    const tw = tag(g, g, '56', -hw + 0.24, top + 0.28, [INK])
    const mx = -hw + 0.24 + tw + 0.38
    const q = { size: 0.38 }
    g.knock(INK, (ctx) => {
      ctx.lineWidth = 0.065
      ctx.beginPath()
      ctx.arc(mx, top + 0.52, 0.14, 0, Math.PI * 2)
      ctx.moveTo(mx + 0.1, top + 0.62)
      ctx.lineTo(mx + 0.25, top + 0.77)
      ctx.stroke()
      say(g, ctx, 'kanb', mx + 0.4, top + 0.7, q)
    })
    const caret = mx + 0.46 + g.measure('kanb', { kind: 'mono', ...q })
    unbox(g, INK, caret - 0.04, top + 0.27, 0.15, 0.56, 0)
    box(g, PINK, caret, top + 0.31, 0.07, 0.48, 0)
    g.knock(INK, (ctx) => {
      rr(ctx, hw - 1.08, top + 0.28, 0.82, 0.52, 0.1)
      ctx.lineWidth = 0.045
      ctx.stroke()
      say(g, ctx, 'esc', hw - 0.67, top + 0.62, { size: 0.24, align: 'center' })
    })
    g.ink(INK, (ctx) => {
      rr(ctx, -hw + 0.05, top + 0.05, hw * 2 - 0.1, -top - 0.05, 0.27)
      ctx.lineWidth = 0.1
      ctx.stroke()
    })
    const rows = [
      [25, 'Kanban Board'],
      [26, 'Dependency Graph'],
      [36, 'PulseGrid'],
      [37, 'Bento Grid'],
    ]
    rows.forEach(([n, name], i) => {
      const y = top + 1.36 + i * 0.72
      if (i === 0) {
        box(g, PINK, -hw + 0.18, y, hw * 2 - 0.36, 0.62, 0.14)
        g.knock(PINK, (ctx) => {
          say(g, ctx, name, -hw + 0.42, y + 0.43, { kind: 'serif', size: 0.35, weight: 700 })
          say(g, ctx, pad2(n), hw - 0.95, y + 0.42, { size: 0.28, align: 'right' })
          enterGlyph(ctx, hw - 0.72, y + 0.36, 0.34, 0.055)
        })
      } else {
        g.text(INK, name, -hw + 0.42, y + 0.43, { kind: 'serif', size: 0.34, weight: 500, tone: 0.9 })
        g.text(TEAL, pad2(n), hw - 0.42, y + 0.42, { kind: 'mono', size: 0.28, align: 'right' })
      }
    })
  },
  back(g) {
    g.fill(TEAL, ALL, 0.3)
  },
}

// --------------------------------------- wizard · a pull-tab onboarding (29)
// A form card on the left page with a pointer nub on its top-right corner.
// Pull it toward you: the nub walks down the printed steps, the card's top
// edge uncovers what the page has been holding under it, and two die-cut
// windows watch the page slide past beneath them: the avatar fills in
// (empty, Ada, a tick) and the progress bar lights segment by segment.
// Both windows sit in the band of the card (y 3.4–5.6) whose track on the
// page stays covered at every pull.

const WIZ = { x: 2.4, y: 17.0, w: 6.2, h: 9.8, travel: 3.4 }
const STEP_Y = (k) => WIZ.y + 0.45 + (k * WIZ.travel) / 4
// day 29's five steps, as its stepper names them; the last wears the tick
const STEPS = ['Personal', 'Preferences', 'Photo', 'Plan', 'Review']
const PHOTO = { cx: 1.05, cy: 4.45, r: 0.64 }
const BAR = { x: 2.2, y: 3.95, w: 3.65, h: 0.3, n: 4, gap: 0.1 }
const SEG_W = (BAR.w - BAR.gap * (BAR.n - 1)) / BAR.n
const WIZ_HOLES = [ngon(PHOTO.cx, PHOTO.cy, PHOTO.r, 40), pillPts(BAR.x, BAR.y, BAR.w, BAR.h, BAR.h / 2)]

const wizard = {
  id: 'wizard',
  kind: 'slider',
  on: 'page:L',
  day: 29,
  at: [WIZ.x, WIZ.y],
  travel: [0, WIZ.travel],
  outline: [
    [0, 0.3],
    [0.3, 0],
    [WIZ.w - 0.3, 0],
    [WIZ.w, 0.1],
    [WIZ.w + 0.55, 0.45],
    [WIZ.w, 0.8],
    [WIZ.w, WIZ.h - 0.3],
    [WIZ.w - 0.3, WIZ.h],
    [0.3, WIZ.h],
    [0, WIZ.h - 0.3],
  ],
  holes: WIZ_HOLES,
  front(g) {
    const { w } = WIZ
    const label = { kind: 'mono', size: 0.24, tracking: 0.12, tone: 0.8 }
    // the nub
    g.fill(PINK, [[w - 0.05, 0.05], [w + 0.55, 0.45], [w - 0.05, 0.85]])
    // header
    box(g, TEAL, 0, 0, w, 1.25, [0.3, 0.3, 0, 0])
    const tw = tag(g, g, '29', 0.3, 0.36, [TEAL])
    g.knock(TEAL, (ctx) => say(g, ctx, 'Create your account', 0.3 + tw + 0.24, 0.76, { kind: 'serif', size: 0.36, weight: 700 }))
    // name
    g.text(INK, 'NAME', 0.35, 1.85, label)
    g.ink(INK, (ctx) => {
      rr(ctx, 0.35, 2.0, w - 0.7, 0.72, 0.12)
      ctx.lineWidth = 0.045
      ctx.stroke()
    })
    g.text(INK, 'Ada Lovelace', 0.55, 2.49, { kind: 'serif', size: 0.32 })
    g.ink(PINK, (ctx) => ctx.fillRect(0.6 + g.measure('Ada Lovelace', { kind: 'serif', size: 0.32 }), 2.18, 0.04, 0.4))
    // photo: a die-cut window ringed in teal
    g.text(INK, 'PHOTO', 0.35, 3.42, label)
    g.ink(TEAL, (ctx) => {
      ctx.lineWidth = 0.08
      ctx.beginPath()
      ctx.arc(PHOTO.cx, PHOTO.cy, PHOTO.r + 0.1, 0, Math.PI * 2)
      ctx.stroke()
    })
    // progress: a die-cut slot, its four steps numbered under it
    g.text(INK, 'PROGRESS', BAR.x, 3.42, label)
    g.ink(INK, (ctx) => {
      rr(ctx, BAR.x - 0.08, BAR.y - 0.08, BAR.w + 0.16, BAR.h + 0.16, (BAR.h + 0.16) / 2)
      ctx.lineWidth = 0.045
      ctx.stroke()
    })
    for (let i = 0; i < BAR.n; i++) {
      g.text(INK, String(i + 1), BAR.x + i * (SEG_W + BAR.gap) + SEG_W / 2, BAR.y + 0.72, { kind: 'mono', size: 0.24, align: 'center', tone: 0.7 })
    }
    g.text(INK, 'fills in as you go', BAR.x, 5.12, { kind: 'serif', size: 0.28, italic: true, tone: 0.65 })
    // plan
    g.text(INK, 'PLAN', 0.35, 5.95, label)
    ;['Starter', 'Pro', 'Studio'].forEach((p, i) => {
      const x = 0.35 + i * 1.87
      if (p === 'Pro') {
        box(g, PINK, x, 6.1, 1.7, 0.62, 0.31)
        g.knock(PINK, (ctx) => say(g, ctx, p, x + 0.85, 6.52, { kind: 'serif', size: 0.28, weight: 700, align: 'center' }))
      } else {
        g.ink(INK, (ctx) => {
          rr(ctx, x, 6.1, 1.7, 0.62, 0.31)
          ctx.lineWidth = 0.04
          ctx.stroke()
        })
        g.text(INK, p, x + 0.85, 6.52, { kind: 'serif', size: 0.28, align: 'center' })
      }
    })
    // next
    box(g, INK, w - 2.55, 7.05, 2.2, 0.7, 0.35)
    g.knock(INK, (ctx) => say(g, ctx, 'NEXT', w - 1.75, 7.5, { size: 0.26, tracking: 0.14, align: 'center' }))
    g.knock(INK, (ctx) => arrow(ctx, w - 1.1, 7.42, w - 0.65, 7.42, 0.12, 0.05))
    g.text(INK, '‹ back', 0.4, 7.5, { kind: 'serif', size: 0.3, italic: true, tone: 0.65 })
    // the tab
    box(g, PINK, 0, 8.05, w, WIZ.h - 8.05, [0, 0, 0.3, 0.3])
    g.knock(PINK, (ctx) => {
      say(g, ctx, 'PULL', w / 2 - 0.25, 8.68, { size: 0.36, tracking: 0.3, align: 'center' })
      arrow(ctx, w / 2 + 0.75, 8.35, w / 2 + 0.75, 8.8, 0.15, 0.07)
    })
  },
  // its back only ever faces the page: left blank
}

/** What the wizard's windows see, printed on the page in their tracks. */
function wizardTracks(g) {
  const { x: X, y: Y, travel: T } = WIZ
  // the avatar: an empty dashed ring, then Ada, then a tick
  const ax = X + PHOTO.cx
  const at = (t) => Y + PHOTO.cy + T * t
  g.ink(TEAL, (ctx) => {
    ctx.lineWidth = 0.07
    ctx.setLineDash([0.16, 0.12])
    ctx.beginPath()
    ctx.arc(ax, at(0), 0.48, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineWidth = 0.08
    ctx.beginPath()
    ctx.moveTo(ax - 0.2, at(0))
    ctx.lineTo(ax + 0.2, at(0))
    ctx.moveTo(ax, at(0) - 0.2)
    ctx.lineTo(ax, at(0) + 0.2)
    ctx.stroke()
  })
  const ay = at(0.5)
  g.circle(PINK, ax, ay, 0.7, 0.45)
  g.ink(TEAL, (ctx) => {
    ctx.beginPath()
    ctx.arc(ax, ay - 0.12, 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(ax, ay + 0.62, 0.48, 0.38, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  g.ink(INK, (ctx) => {
    // her hair, parted and pinned up
    ctx.beginPath()
    ctx.arc(ax, ay - 0.16, 0.27, Math.PI * 1.02, Math.PI * 1.98)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(ax + 0.22, ay - 0.36, 0.1, 0, Math.PI * 2)
    ctx.fill()
  })
  g.circle(TEAL, ax, at(1), 0.7)
  g.knock(TEAL, (ctx) => tick(ctx, ax, at(1) + 0.04, 0.62, 0.13))
  // the progress bar: segment i lights as the pointer reaches step i + 1,
  // and all four turn teal at "Review"
  const top = Y + BAR.y
  const done = top + T * 0.875
  const end = top + T + BAR.h + 0.12
  for (let i = 0; i < BAR.n; i++) {
    const x = X + BAR.x + i * (SEG_W + BAR.gap)
    const lit = top + (T * i) / 4 - 0.06
    g.ink(PINK, (ctx) => ctx.fillRect(x, lit, SEG_W, done - lit))
    g.ink(TEAL, (ctx) => ctx.fillRect(x, done, SEG_W, end - done))
  }
}

// ---------------------------------------------------------------- the pages

/** A design-canvas dot grid, in the gutter zones the pop-ups stand on. */
function dotGrid(g, x0, x1, y0, y1) {
  g.ink(TEAL, (ctx) => {
    ctx.fillStyle = g.tone(0.6)
    for (let x = x0; x <= x1 + 1e-6; x += 0.8) {
      for (let y = y0; y <= y1 + 1e-6; y += 0.8) {
        ctx.beginPath()
        ctx.arc(x, y, 0.035, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

const PARA =
  'Nine days on the side of the screen that people actually touch: a board to drag cards across, a graph that pulls itself into shape, two dashboards that count themselves up, a gallery that never runs out, a portfolio packed like a bento box, prices that roll, a wizard that walks you to the end, and a palette that answers to Command-K. Each one was a stack of layers pretending to be flat. Here, for once, the z-index is made of card.'

function pageL(g) {
  dotGrid(g, 11.2, 19.2, 9.6, 24.8)
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', TEAL)
  // the numeral, pink over a teal offset
  g.text(TEAL, CH.numeral, M.outer + 0.14, 5.56, { kind: 'display', size: 3.5 })
  g.knock(TEAL, (ctx) => say(g, ctx, CH.numeral, M.outer, 5.4, { kind: 'display', size: 3.5 }))
  g.text(PINK, CH.numeral, M.outer, 5.4, { kind: 'display', size: 3.5 })
  // the title, selected as if in a design tool
  const tw = g.measure(CH.title, { kind: 'display', size: 1.55 })
  g.text(INK, CH.title, M.outer, 7.65, { kind: 'display', size: 1.55 })
  const handles = [
    [M.outer - 0.15, 6.3],
    [M.outer + tw + 0.15, 6.3],
    [M.outer - 0.15, 8.05],
    [M.outer + tw + 0.15, 8.05],
  ]
  g.ink(TEAL, (ctx) => {
    ctx.lineWidth = 0.035
    ctx.strokeRect(M.outer - 0.15, 6.3, tw + 0.3, 1.75)
    for (const [x, y] of handles) ctx.fillRect(x - 0.09, y - 0.09, 0.18, 0.18)
  })
  g.knock(TEAL, (ctx) => {
    for (const [x, y] of handles) ctx.fillRect(x - 0.05, y - 0.05, 0.1, 0.1)
  })
  // its dimension tag, centred under the selection like a design tool's;
  // every layer of the pop-up wears the same label
  const zw = tagW(g, 'z-index: 65')
  tag(g, g, 'z-index: 65', M.outer + tw / 2 - zw / 2, 8.3, [])
  g.text(PINK, 'nine days of things made to be used', M.outer, 9.55, { kind: 'serif', size: 0.42, italic: true })
  g.para(INK, PARA, M.outer, 10.55, 8.0, { size: 0.36, leading: 0.5 })

  // what the pull-tab uncovers: day 29's own success screen
  const rx = WIZ.x
  const ry = WIZ.y
  g.ink(TEAL, (ctx) => tick(ctx, rx + 0.7, ry + 1.35, 1.0, 0.2))
  g.text(TEAL, 'Onboarding', rx + 1.5, ry + 1.15, { kind: 'display', size: 0.66 })
  g.text(TEAL, 'request sent.', rx + 1.5, ry + 1.85, { kind: 'display', size: 0.66 })
  g.text(PINK, 'Ada is ready to launch.', rx + 1.55, ry + 2.5, { kind: 'serif', size: 0.34, italic: true })
  const rng = makeRng('interfaces:confetti')
  for (let i = 0; i < 26; i++) {
    const x = rng.range(rx + 0.2, rx + WIZ.w - 0.2)
    const y = rng.range(ry + 0.15, ry + WIZ.travel - 0.2)
    if (x > rx + 1.2 && x < rx + 6.0 && y > ry + 0.45 && y < ry + 2.75) continue
    const ink = rng.pick([PINK, TEAL, INK])
    const a = rng.range(0, Math.PI)
    g.ink(ink, (ctx) => {
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.fillRect(-0.16, -0.05, 0.32, 0.1)
    })
  }
  // what its windows see
  wizardTracks(g)
  // the steps the nub walks down
  const sx = WIZ.x + WIZ.w + 0.95
  g.ink(TEAL, (ctx) => {
    ctx.lineWidth = 0.04
    ctx.beginPath()
    ctx.moveTo(sx, STEP_Y(0))
    ctx.lineTo(sx, STEP_Y(4))
    ctx.stroke()
  })
  STEPS.forEach((s, k) => {
    const y = STEP_Y(k)
    if (k === 4) {
      g.circle(PINK, sx, y, 0.23)
      g.knock(PINK, (ctx) => tick(ctx, sx, y + 0.01, 0.26, 0.055))
    } else {
      g.knock(TEAL, (ctx) => {
        ctx.beginPath()
        ctx.arc(sx, y, 0.23, 0, Math.PI * 2)
        ctx.fill()
      })
      g.ink(TEAL, (ctx) => {
        ctx.lineWidth = 0.05
        ctx.beginPath()
        ctx.arc(sx, y, 0.2, 0, Math.PI * 2)
        ctx.stroke()
      })
      g.text(TEAL, String(k + 1), sx, y + 0.085, { kind: 'mono', size: 0.24, align: 'center' })
    }
    g.text(INK, s, sx + 0.42, y + 0.1, { kind: 'serif', size: 0.3, weight: k === 4 ? 700 : 400 })
  })
  g.text(TEAL, 'FORM WIZARD · 29 — PULL THE TAB', WIZ.x, WIZ.y - 0.45, { kind: 'mono', size: 0.26, tracking: 0.08 })
  folio(g, pl, 'L', TEAL)
}

const idx = dayIndex({ days: CH.days, side: 'R', x: 9.5, y: 3.7, width: 9.0, ink: INK, accent: PINK, gap: 1.2, size: 0.465 })

// where the palette's foot stands on the page once the flap is open
const PAL_FOOT = {
  x0: FLAP.x,
  y0: FLAP.y + PAL.at,
  x1: FLAP.x - PAL.hw * Math.sin(PAL.glue * DEG),
  y1: FLAP.y + PAL.at + PAL.hw * Math.cos(PAL.glue * DEG),
}

/** Under the flap: ↵, "Jump to Kanban Board", and the start of the route. */
function underFlap(g) {
  const x0 = FLAP.x - FLAP.wid
  // a pale panel, so the uncovered page reads as the palette's answer
  box(g, TEAL, x0 + 0.15, FLAP.y + 0.15, FLAP.wid - 0.3, FLAP.len - 0.3, 0.3, 0.12)
  const lx = x0 + 0.4
  g.text(TEAL, 'Jump to', lx, FLAP.y + 1.15, { kind: 'serif', size: 0.4, italic: true })
  g.text(INK, 'Kanban', lx, FLAP.y + 2.0, { kind: 'display', size: 0.68 })
  g.text(INK, 'Board', lx, FLAP.y + 2.8, { kind: 'display', size: 0.68 })
  g.text(PINK, '25', lx, FLAP.y + 4.05, { kind: 'display', size: 1.05 })
  // the big return key, rising just in front of the palette's foot and
  // turning for the gutter
  const ex = FLAP.x - 0.55
  const ey = FLAP.y + FLAP.len - 0.85
  const tip = x0 + 1.25
  const ret = (ctx, lw) => {
    ctx.lineJoin = 'miter'
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(ex, PAL_FOOT.y0 + (PAL_FOOT.x0 - ex) * Math.tan((90 - PAL.glue) * DEG) + 0.5)
    ctx.lineTo(ex, ey)
    ctx.lineTo(tip, ey)
    ctx.moveTo(tip + 0.5, ey - 0.5)
    ctx.lineTo(tip, ey)
    ctx.lineTo(tip + 0.5, ey + 0.5)
    ctx.stroke()
  }
  g.knock(TEAL, (ctx) => ret(ctx, 0.44))
  g.ink(PINK, (ctx) => ret(ctx, 0.28))
}

/** The dashed route from under the hinge, out past the flap, into the scene. */
const ROUTE = (() => {
  const x0 = FLAP.x - FLAP.wid
  const ey = FLAP.y + FLAP.len - 0.85
  const pts = []
  // a curve up out of the return key's arrowhead…
  const p0 = [x0 + 1.0, ey]
  const c = [x0 + 0.1, ey]
  const p1 = [x0 - 0.3, ey - 1.6]
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    pts.push([(1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * c[0] + t * t * p1[0], (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * c[1] + t * t * p1[1]])
  }
  // …then straight for the gutter, where the kanban is hinged
  pts.push([0.55, KAN.at + 0.45])
  return pts
})()

function pageR(g) {
  dotGrid(g, 0.8, 6.4, 9.6, 24.8)
  runningHead(g, 'days 09 — 56', 'R', TEAL)
  g.text(INK, 'The nine days', 9.4, 2.75, { kind: 'serif', size: 0.52, weight: 600, italic: true })
  g.text(TEAL, 'TAP ONE TO OPEN IT', W - M.outer, 2.72, { kind: 'mono', size: 0.24, tracking: 0.12, align: 'right' })
  // the index, ruled like a list view
  g.ink(TEAL, (ctx) => {
    ctx.fillStyle = g.tone(0.6)
    for (const e of idx.entries) ctx.fillRect(e.x - 0.1, e.y - 0.25, 9.1, 0.02)
    ctx.fillRect(9.4, idx.entries.at(-1).y + 1.0, 9.1, 0.02)
  })
  idx.paint(g)

  // under the flap, and the route it starts
  underFlap(g)
  g.ink(PINK, (ctx) => {
    ctx.lineWidth = 0.08
    ctx.setLineDash([0.24, 0.17])
    ctx.stroke(g.path(ROUTE, false))
    ctx.setLineDash([])
    const [ax, ay] = ROUTE.at(-1)
    const [bx, by] = ROUTE.at(-2)
    const t = Math.atan2(ay - by, ax - bx)
    arrow(ctx, ax - Math.cos(t) * 0.05, ay - Math.sin(t) * 0.05, ax, ay, 0.32, 0.08)
  })

  // beside the flap, the invitation (the open flap lies over it)
  const hx = FLAP.x + 0.55
  g.ink(PINK, (ctx) => {
    // the door's swing, drawn as an arc over the hinge
    ctx.lineWidth = 0.06
    ctx.beginPath()
    ctx.arc(FLAP.x, FLAP.y + 1.0, 1.4, -Math.PI * 0.62, -Math.PI * 0.12)
    ctx.stroke()
    const a = -Math.PI * 0.12
    const px = FLAP.x + 1.4 * Math.cos(a)
    const py = FLAP.y + 1.0 + 1.4 * Math.sin(a)
    arrow(ctx, px - 0.12 * Math.sin(a), py + 0.12 * Math.cos(a), px, py, 0.2, 0.06)
  })
  const ph = g.para(PINK, 'Lift the palette by its left edge and swing it open.', hx, FLAP.y + 2.0, W - M.outer - hx, { kind: 'serif', size: 0.4, italic: true, leading: 0.52 })
  g.text(INK, 'COMMANDOS · 56', hx, FLAP.y + 2.0 + ph + 0.3, { kind: 'mono', size: 0.26, tracking: 0.14 })
  folio(g, pr, 'R', TEAL)
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: pageL, R: pageR },
  pieces: [gallery, dash, dashTag, kanban, graph, bento, pricing, cmdk, palette, wizard],
  spots: [
    ...idx.spots,
    // day numbers printed on the pages themselves, so a tap opens the day
    // instead of turning the page: the wizard's caption…
    { day: 29, on: 'page:L', rect: [WIZ.x - 0.1, WIZ.y - 0.85, 5.85, 0.6] },
    // …"Jump to Kanban Board 25" under the ⌘K flap (only reachable open)…
    { day: 25, on: 'page:R', rect: [FLAP.x - FLAP.wid + 0.2, FLAP.y + 0.4, 4.4, 4.0] },
    // …and "COMMANDOS · 56" under the three-line invitation (the open flap covers it)
    { day: 56, on: 'page:R', rect: [FLAP.x + 0.4, FLAP.y + 3.25, 3.05, 0.85] },
  ],
}
