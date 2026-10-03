// Chapter III — Light & Liquid.
//
// At the back a rose window (day 45) leans into a glow of overprinted mesh
// gradient (day 54). Its panes are die-cut holes, so the glass you see is the
// light printed on the page behind it, and the book's lamp shines straight
// through. In the middle a liquid-glass card (day 2), itself a die-cut window,
// and a lava lamp of metaball goo (day 53) stand in a pool on one V-fold, the
// goo spilt across the crease between them. A pair of breakers of dyed water
// (day 7) curl toward each other across the front, their barrels cut clean
// through. Two things to work: a shader editor (day 20) on the left page whose
// pull-tab scrubs t under its canvas, and a camera (day 61) on the right whose
// dial turns a disc of real die-cut iris holes under the lens, so the light
// seen through it closes from f/1.4 to a point.

import { trace } from '../art/trace.js'
import { H, W } from '../paper/dims.js'
import { clipHalfPlane } from '../paper/polygon.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayIndex, folio, runningHead } from './furniture.js'

const CH = CHAPTERS[2]
const [pl, pr] = folios(3)
const INK = { blue: 'blue', aqua: 'aqua', pink: 'pink', sun: 'yellow' }
const ALL_INKS = Object.values(INK)
const D = Math.PI / 180

// ------------------------------------------------------------------ helpers

const arcPts = (cx, cy, r, a0, a1, n = 24) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = (a0 + ((a1 - a0) * i) / n) * D
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r]
  })

/** Rounded rectangle as a polygon (clockwise on the canvas). */
function rrect(x, y, w, h, r, n = 5) {
  const pts = []
  const corners = [
    [x + w - r, y + r, -90],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, 90],
    [x + r, y + r, 180],
  ]
  for (const [cx, cy, a] of corners) {
    for (let i = 0; i <= n; i++) {
      const t = (a + (90 * i) / n) * D
      pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
    }
  }
  return pts
}

const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
const circlePts = (cx, cy, r, n = 48) => arcPts(cx, cy, r, 0, 360 - 360 / n, n - 1)
const mirrorX = (pts) => pts.map(([x, y]) => [-x, y])

/**
 * Ballast for the preview: k collinear points on the outline's edge nearest
 * `near`, clustered within ±span of it. The cut is unchanged; the preview
 * script draws cards in the order of their vertex averages, and this keeps a
 * card that stands in front of (or lies on top of) another drawn after it.
 */
function ballast(poly, near, k, span = 0.1) {
  let best = null
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l2 = dx * dx + dy * dy || 1e-9
    const t = Math.max(0, Math.min(1, ((near[0] - a[0]) * dx + (near[1] - a[1]) * dy) / l2))
    const d = Math.hypot(a[0] + dx * t - near[0], a[1] + dy * t - near[1])
    if (!best || d < best.d) best = { i, t, d, l: Math.sqrt(l2), a, dx, dy }
  }
  const { i, t, l, a, dx, dy } = best
  const s = span / l
  const t0 = Math.max(0.01, t - s)
  const t1 = Math.min(0.99, t + s)
  const pts = Array.from({ length: k }, (_, j) => {
    const u = t0 + ((t1 - t0) * (j + 0.5)) / k
    return [a[0] + dx * u, a[1] + dy * u]
  })
  return [...poly.slice(0, i + 1), ...pts, ...poly.slice(i + 1)]
}

function polyTo(ctx, pts) {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

function pathOf(...loops) {
  const p = new Path2D()
  for (const l of loops) {
    l.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
    p.closePath()
  }
  return p
}

const memo = (fn) => {
  let v
  return () => (v ??= fn())
}

/** Draw one line of type straight into a ctx (for knock-outs), like g.text. */
function rawText(g, ctx, str, x, y, { size = 0.4, kind = 'mono', align = 'left', weight = 400, italic = false, tracking = 0 } = {}) {
  const S = 100
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1 / S, 1 / S)
  ctx.font = g.font(kind, size * S, { weight, italic })
  ctx.textAlign = 'left'
  const track = tracking * size * S
  const chars = [...str]
  const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width + track, 0) - track
  let at = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
  if (!track) ctx.fillText(str, at, 0)
  else {
    for (const ch of chars) {
      ctx.fillText(ch, at, 0)
      at += ctx.measureText(ch).width + track
    }
  }
  ctx.restore()
}

/** Type knocked out of some inks (prints bare card), optionally filled with another. */
function knockText(g, inks, str, x, y, opts, fill = null) {
  for (const ink of inks) g.knock(ink, (ctx) => rawText(g, ctx, str, x, y, opts))
  if (fill) g.ink(fill, (ctx) => rawText(g, ctx, str, x, y, opts))
}

/** Characters set around a circle, centred on angle `mid` (deg, canvas), upright at the top. */
function ringText(g, ctx, str, cx, cy, r, mid, size, track = 0.08, kind = 'mono') {
  const S = 100
  ctx.font = g.font(kind, size * S)
  ctx.textAlign = 'center'
  const chars = [...str]
  const widths = chars.map((ch) => ctx.measureText(ch).width / S + track * size)
  const total = widths.reduce((a, b) => a + b, 0)
  let a = mid * D - total / r / 2
  chars.forEach((ch, i) => {
    const t = a + widths[i] / 2 / r
    ctx.save()
    ctx.translate(cx + r * Math.cos(t), cy + r * Math.sin(t))
    ctx.rotate(t + Math.PI / 2)
    ctx.scale(1 / S, 1 / S)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    a += widths[i] / r
  })
}

/** Soft disc for a metaball: (1 − q²)² falloff, reaching 0.5 at radius r. */
function softDisc(ctx, x, y, r) {
  const R = r / 0.541
  const gr = ctx.createRadialGradient(x, y, 0, x, y, R)
  for (let i = 0; i <= 10; i++) {
    const q = i / 10
    gr.addColorStop(q, `rgba(0,0,0,${((1 - q * q) ** 2).toFixed(4)})`)
  }
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.arc(x, y, R, 0, Math.PI * 2)
  ctx.fill()
}

/** Everything a card has above its glue line (y ≤ 0): clip a trace to it. */
const aboveGlue = (ctx) => {
  ctx.beginPath()
  ctx.rect(-30, -30, 60, 30)
  ctx.clip()
}

// --------------------------------------------------------- the rose window
// A pointed arch with a stone border, a twelve-petal rose, six lancets and
// four round lights, standing on a solid stone dado so every pane starts
// above the figures in front. Card coords: the crease runs up the middle
// (x = 0); the glue lines leave the origin at 97° to it (the window leans
// back a little), so the base slopes gently down to each corner.

const RW = { beta: 97, w: 6.5, ys: -4.0, rho: 8.7, b: 0.72, rr: 3.25, sill: 2.6 }
const LIFT = -RW.ys - 2.7 // how much taller the arch is than the first draft
const K = -Math.cos(RW.beta * D) / Math.sin(RW.beta * D) // base slope
const RC = RW.rho - RW.w // arc centres sit at ∓RC on the spring line
const APEX = RW.ys - Math.sqrt(RW.rho * RW.rho - RC * RC)
const RO = (() => {
  // the rose is tangent to the inside of the arch
  const d = RW.rho - RW.b - RW.rr
  return { x: 0, y: RW.ys - Math.sqrt(d * d - RC * RC), r: RW.rr }
})()

/** Arch outline of radius rho (same centres), its bottom on the sloped base raised by `lift`. */
function archPoly(rho, lift = 0, n = 28) {
  const xj = rho - RC
  const a = Math.acos(RC / rho) / D
  return [
    [0, -lift],
    [xj, xj * K - lift],
    [xj, RW.ys],
    ...arcPts(-RC, RW.ys, rho, 0, -a, n).slice(1),
    ...arcPts(RC, RW.ys, rho, -180 + a, -180, n).slice(1),
    [-xj, xj * K - lift],
  ]
}
const OUTER = archPoly(RW.rho)
const INNER = archPoly(RW.rho - RW.b, RW.sill)

const LANCETS = (() => {
  const xin = RW.rho - RW.b - RC - 0.32
  const mull = 0.36
  const half = 0.27
  const wl = (xin - half - 2 * mull) / 3
  return [-3.42, -4.6, -4.25].map((apex, i) => {
    const xl = half + i * (wl + mull)
    const top = apex - LIFT
    return { xl, xr: xl + wl, apex: top, spring: top + wl * 0.866 }
  })
})()

function lancetPoly(l, side) {
  const w = l.xr - l.xl
  const pts = [
    [l.xl, l.xl * K - RW.sill],
    [l.xr, l.xr * K - RW.sill],
    [l.xr, l.spring],
    ...arcPts(l.xl, l.spring, w, 0, -60, 10).slice(1),
    ...arcPts(l.xr, l.spring, w, -120, -180, 10).slice(1),
  ]
  return pts.map(([x, y]) => [x * side, y])
}

const SPANDRELS = [
  [4.45, -5.25 - LIFT, 0.38],
  [3.85, -6.2 - LIFT, 0.3],
]

function finial(ctx, grow = 0) {
  // a drop for a finial: this is a chapter about liquid
  ctx.beginPath()
  ctx.arc(0, APEX - 0.55, 0.42 + grow, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-0.4 - grow, APEX - 0.42)
  ctx.lineTo(0, APEX - 1.3 - grow * 1.5)
  ctx.lineTo(0.4 + grow, APEX - 0.42)
  ctx.lineTo(0.5 + grow, APEX + 0.3 + grow)
  ctx.lineTo(-0.5 - grow, APEX + 0.3 + grow)
  ctx.closePath()
  ctx.fill()
}

function drawRose(ctx) {
  ctx.beginPath()
  polyTo(ctx, OUTER)
  ctx.fill()
  finial(ctx)
  // panes
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(RO.x, RO.y, RO.r - 0.46, 0, Math.PI * 2)
  ctx.fill()
  for (const l of LANCETS) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      polyTo(ctx, lancetPoly(l, s))
      ctx.fill()
    }
  }
  for (const [x, y, r] of SPANDRELS) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(x * s, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // tracery back in: twelve spokes (two of them on the crease), a ring, the hub
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineWidth = 0.34
  ctx.lineCap = 'butt'
  for (let k = 0; k < 12; k++) {
    const t = (-90 + k * 30) * D
    ctx.beginPath()
    ctx.moveTo(RO.x, RO.y)
    ctx.lineTo(RO.x + Math.cos(t) * RO.r, RO.y + Math.sin(t) * RO.r)
    ctx.stroke()
  }
  ctx.lineWidth = 0.3
  ctx.beginPath()
  ctx.arc(RO.x, RO.y, 2.1, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(RO.x, RO.y, 1.15, 0, Math.PI * 2)
  ctx.fill()
}

const roseShape = memo(() => {
  const t = trace({ x0: -7.0, y0: APEX - 1.8, w: 14.0, h: 1.8 - APEX + 1.6 }, drawRose, { res: 26, tol: 0.015 })
  return { outline: t.outline, holes: t.holes }
})

const ROSE_ALL = rect(-9, APEX - 3, 18, -APEX + 6)

const rose = {
  id: 'rose',
  kind: 'vfold',
  on: 'gutter',
  at: 12.9,
  glue: [64, 64],
  angle: [RW.beta, RW.beta],
  day: 45,
  outline: roseShape,
  front(g) {
    // the leading: blue over pink prints a deep violet
    g.fill(INK.blue, ROSE_ALL)
    g.fill(INK.pink, ROSE_ALL)
    // the stone frame (and the dado under the sill) catches the light:
    // knocked clean, then warm tints
    const frame = (ctx) => {
      ctx.beginPath()
      polyTo(ctx, OUTER)
      polyTo(ctx, INNER)
      ctx.fill('evenodd')
      finial(ctx, 0.12)
    }
    g.knock(INK.blue, frame)
    g.knock(INK.pink, frame)
    g.ink(INK.sun, (ctx) => {
      ctx.fillStyle = g.tone(0.85)
      frame(ctx)
    })
    g.ink(INK.pink, (ctx) => {
      ctx.fillStyle = g.tone(0.3)
      frame(ctx)
    })
    // voussoirs: joints radiating from the arc centres, courses down the jambs
    g.ink(INK.blue, (ctx) => {
      ctx.lineWidth = 0.05
      const a = Math.acos(RC / RW.rho) / D
      for (const s of [-1, 1]) {
        for (let k = 1; k < 9; k++) {
          const t = (s > 0 ? -a * (k / 9) : -180 + a * (k / 9)) * D
          const cx = -RC * s
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(t) * (RW.rho - RW.b), RW.ys + Math.sin(t) * (RW.rho - RW.b))
          ctx.lineTo(cx + Math.cos(t) * RW.rho, RW.ys + Math.sin(t) * RW.rho)
          ctx.stroke()
        }
        for (let y = RW.ys + 1.0; y < RW.w * K - RW.sill - 0.3; y += 1.0) {
          ctx.beginPath()
          ctx.moveTo(s * (RW.rho - RW.b - RC), y)
          ctx.lineTo(s * RW.w, y)
          ctx.stroke()
        }
      }
    })
    // the dado: a sill moulding, then two courses of ashlar, joints staggered
    const xi = RW.rho - RW.b - RC
    g.ink(INK.blue, (ctx) => {
      ctx.lineWidth = 0.09
      ctx.beginPath()
      ctx.moveTo(-xi, xi * K - RW.sill + 0.2)
      ctx.lineTo(0, -RW.sill + 0.2)
      ctx.lineTo(xi, xi * K - RW.sill + 0.2)
      ctx.stroke()
      ctx.lineWidth = 0.05
      const c1 = -RW.sill + 0.2 + (RW.sill - 0.2) / 2
      ctx.beginPath()
      ctx.moveTo(-RW.w, RW.w * K + c1)
      ctx.lineTo(0, c1)
      ctx.lineTo(RW.w, RW.w * K + c1)
      ctx.stroke()
      for (const [y0, y1, off] of [
        [-RW.sill + 0.2, c1, 0],
        [c1, 0, 0.6],
      ]) {
        for (let x = -RW.w + 0.6 + off; x < RW.w - 0.3; x += 1.2) {
          if (Math.abs(x) < 0.2) continue
          ctx.beginPath()
          ctx.moveTo(x, Math.abs(x) * K + y0)
          ctx.lineTo(x, Math.abs(x) * K + y1)
          ctx.stroke()
        }
      }
    })
    g.ink(INK.pink, (ctx) => {
      ctx.fillStyle = g.tone(0.35)
      ctx.beginPath()
      ctx.moveTo(-xi, xi * K - RW.sill)
      ctx.lineTo(0, -RW.sill)
      ctx.lineTo(xi, xi * K - RW.sill)
      ctx.lineTo(xi, xi * K - RW.sill + 0.2)
      ctx.lineTo(0, -RW.sill + 0.2)
      ctx.lineTo(-xi, xi * K - RW.sill + 0.2)
      ctx.closePath()
      ctx.fill()
    })
    // a sun in the hub
    const hub = (ctx) => {
      ctx.beginPath()
      ctx.arc(RO.x, RO.y, 0.98, 0, Math.PI * 2)
      ctx.fill()
    }
    g.knock(INK.blue, hub)
    g.knock(INK.pink, hub)
    g.circle(INK.sun, RO.x, RO.y, 0.98)
    g.glow(INK.pink, circlePts(RO.x, RO.y, 0.98), RO.x, RO.y, 0.98, 0.9, 0.1)
    g.text(INK.blue, '45', RO.x, RO.y + 0.27, { kind: 'display', size: 0.74, align: 'center' })
    // a glint of light along every pane's edge
    g.ink(INK.sun, (ctx) => {
      ctx.lineWidth = 0.08
      for (const h of roseShape().holes) {
        ctx.beginPath()
        polyTo(ctx, h)
        ctx.stroke()
      }
    })
  },
  back(g) {
    // the outside of the church: pale stone, the leading in blue
    g.fill(INK.aqua, ROSE_ALL, 0.42)
    g.fill(INK.sun, ROSE_ALL, 0.2)
    g.ink(INK.blue, (ctx) => {
      ctx.lineWidth = 0.07
      for (const h of roseShape().holes) {
        ctx.beginPath()
        polyTo(ctx, mirrorX(h))
        ctx.stroke()
      }
      ctx.lineWidth = 0.05
      ctx.beginPath()
      polyTo(ctx, mirrorX(INNER))
      ctx.stroke()
    })
    g.text(INK.blue, 'VITRAIL · DAY 45', 0, -0.4, { kind: 'mono', size: 0.26, align: 'center', tracking: 0.14 })
  },
}

// ------------------------------------------ the glass card and the lava lamp
// One V-fold: on half A a Liquid Glass card (day 2), its body a die-cut
// window with the refraction stripe left as a bridge across it; on half B a
// lava lamp (day 53). The goo has run out of the lamp and across the crease
// to the foot of the card: that spill is the paper joining the two halves.
// The lamp is also laminated on as its own flat card, so it taps as day 53.

const GC = { x0: -5.3, x1: -0.32, y0: -6.7, r: 0.6, rim: 0.45, band: 2.0 }
const GLASS_CARD = [
  [GC.x1, 0],
  ...arcPts(GC.x1 - GC.r, GC.y0 + GC.r, GC.r, 0, -90, 6),
  ...arcPts(GC.x0 + GC.r, GC.y0 + GC.r, GC.r, -90, -180, 6),
  [GC.x0, 0],
]
const WIN = rrect(GC.x0 + GC.rim, GC.y0 + GC.rim, GC.x1 - GC.x0 - 2 * GC.rim, -GC.band - GC.y0 - GC.rim, 0.32)
// the refraction stripe: a band of bare card from low left to high right
const STRIPE = (() => {
  const p0 = [GC.x0, -2.85]
  const p1 = [GC.x1, -5.55]
  const d = [p1[0] - p0[0], p1[1] - p0[1]]
  const l = Math.hypot(d[0], d[1])
  return { p0, p1, n: [-d[1] / l, d[0] / l], half: 0.36 }
})()
const glassHoles = memo(() => {
  const { p0, n, half } = STRIPE
  const at = (k) => [p0[0] + n[0] * half * k, p0[1] + n[1] * half * k]
  return [clipHalfPlane(WIN, at(1), n), clipHalfPlane(WIN, at(-1), [-n[0], -n[1]])].filter((h) => h.length >= 3)
})

const LX = 3.75 // the lamp's axis on the card
const LS = 1.18 // the lamp's scale
const COLLAR = -2.15 * LS
const SHOULDER = -6.35 * LS

/** Half-width of the glass at height y (COLLAR up to SHOULDER). */
function glassHalf(y) {
  const t = (y - COLLAR) / (SHOULDER - COLLAR) // 0 at the collar, 1 under the cap
  const bulge = t < 0.32 ? Math.sin((t / 0.32) * (Math.PI / 2)) : 1 - ((t - 0.32) / 0.68) * 0.78
  return (0.78 + 0.62 * bulge) * LS
}

const lampOutline = memo(() => {
  const right = []
  const left = []
  for (let i = 0; i <= 28; i++) {
    const y = COLLAR + ((SHOULDER - COLLAR) * i) / 28
    right.push([LX + glassHalf(y), y])
    left.unshift([LX - glassHalf(y), y])
  }
  const s = LS
  return [
    [LX - 1.55 * s, 0],
    [LX + 1.55 * s, 0],
    // base: a cone, slightly bowed
    [LX + 1.42 * s, -0.7 * s],
    [LX + 1.1 * s, -1.5 * s],
    [LX + 0.82 * s, COLLAR],
    ...right,
    // cap
    [LX + 0.6 * s, -6.5 * s],
    [LX + 0.42 * s, -7.1 * s],
    ...arcPts(LX, -7.1 * s, 0.42 * s, 0, -180, 8).slice(1, -1),
    [LX - 0.42 * s, -7.1 * s],
    [LX - 0.6 * s, -6.5 * s],
    ...left,
    [LX - 0.82 * s, COLLAR],
    [LX - 1.1 * s, -1.5 * s],
    [LX - 1.42 * s, -0.7 * s],
  ]
})

// the spill: metaballs pooled along the glue line from the card to the lamp
const SPILL = [
  [-0.62, -0.28, 0.42],
  [-0.05, -0.42, 0.56],
  [0.7, -0.36, 0.5],
  [1.35, -0.5, 0.56],
  [1.95, -0.34, 0.46],
  [-0.9, 0, 0.42],
  [0.25, 0, 0.5],
  [1.05, 0, 0.5],
  [1.8, 0, 0.5],
]
function drawSpill(ctx) {
  ctx.globalCompositeOperation = 'lighter'
  for (const [x, y, r] of SPILL) softDisc(ctx, x, y, r)
  ctx.globalCompositeOperation = 'source-over'
}
const spillShapes = memo(() => {
  const t = trace({ x0: -1.8, y0: -1.6, w: 4.6, h: 1.6 }, (ctx) => {
    aboveGlue(ctx)
    drawSpill(ctx)
  }, { res: 30, tol: 0.012 })
  return [t.outline, ...t.islands]
})

const glassShape = memo(() => {
  const t = trace(
    { x0: GC.x0 - 0.3, y0: -9.2, w: LX + 2.2 - GC.x0 + 0.3, h: 9.2 },
    (ctx) => {
      aboveGlue(ctx)
      drawSpill(ctx)
      ctx.fillStyle = '#000'
      ctx.beginPath()
      polyTo(ctx, GLASS_CARD)
      polyTo(ctx, lampOutline())
      ctx.fill('nonzero')
    },
    { res: 30, tol: 0.012 },
  )
  return { outline: ballast(t.outline, [(GC.x0 + GC.x1) / 2, GC.y0], 60, 1.6), holes: glassHoles() }
})

const LAVA = [
  // [dx, y, r] inside the glass, before scaling
  [-0.1, -2.55, 0.62],
  [0.45, -2.6, 0.42],
  [-0.3, -3.55, 0.48],
  [0.35, -4.45, 0.34],
  [-0.05, -5.05, 0.42],
  [0.1, -5.95, 0.2],
  [-0.6, -3.05, 0.28],
].map(([dx, y, r]) => [LX + dx * LS, y * LS, r * LS])

/** The goo as polygons: metaballs traced from summed soft discs. */
const lavaShapes = memo(() => {
  const t = trace(
    { x0: LX - 2, y0: -8, w: 4, h: 6 },
    (ctx) => {
      ctx.globalCompositeOperation = 'lighter'
      for (const [x, y, r] of LAVA) softDisc(ctx, x, y, r)
    },
    { res: 30, tol: 0.01 },
  )
  return [t.outline, ...t.islands]
})

/** The lamp, painted the same on the V-fold and on the laminated flat. */
function paintLamp(g) {
  const glassPoly = lampOutline().filter(([, y]) => y <= COLLAR + 0.01 && y >= SHOULDER - 0.01)
  const glassArea = pathOf(glassPoly)
  // the warm liquid: yellow, hottest at the bulb, a cool aqua head under the cap
  g.ramp(INK.sun, glassArea, 0, COLLAR, 0, SHOULDER, 1, 0.55)
  g.ramp(INK.aqua, glassArea, 0, COLLAR + (SHOULDER - COLLAR) * 0.72, 0, SHOULDER, 0, 0.55)
  g.glow(INK.pink, glassArea, LX, COLLAR, 2.3, 0.5, 0)
  // the goo: hot pink printed clean, a thin violet crescent on its shadow side
  const lava = lavaShapes()
  const goo = pathOf(...lava)
  for (const ink of [INK.sun, INK.aqua]) g.knock(ink, (ctx) => ctx.fill(goo))
  g.ink(INK.pink, (ctx) => ctx.fill(goo))
  g.ink(INK.blue, (ctx) => {
    ctx.save()
    ctx.clip(goo)
    ctx.fillStyle = g.tone(0.35)
    ctx.fill(goo)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.translate(-0.13, -0.05)
    ctx.fillStyle = '#000'
    ctx.fill(goo)
    ctx.restore()
  })
  // glass gloss: a long highlight down the left of the glass, a glint per blob
  const gloss = (ctx) => {
    ctx.save()
    ctx.clip(glassArea)
    ctx.lineWidth = 0.16
    ctx.beginPath()
    for (let i = 0; i <= 20; i++) {
      const y = COLLAR - 0.35 + (SHOULDER - COLLAR + 0.7) * (i / 20)
      const x = LX - glassHalf(y) + 0.36
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.restore()
    for (const [x, y, r] of LAVA) {
      if (r < 0.4) continue
      ctx.beginPath()
      ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.11, -0.7, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  for (const ink of ALL_INKS) g.knock(ink, gloss)
  // base and cap: blue metal with a pink band
  const metal = (ctx) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(LX - 3, COLLAR, 6, 3)
    ctx.rect(LX - 3, -10, 6, 10 + SHOULDER)
    ctx.clip()
    ctx.fill(pathOf(lampOutline()))
    ctx.restore()
  }
  for (const ink of [INK.sun, INK.aqua, INK.pink]) g.knock(ink, metal)
  g.ink(INK.blue, metal)
  g.fill(INK.pink, rect(LX - 3, -1.85 * LS, 6, 0.34))
  g.ink(INK.aqua, (ctx) => {
    ctx.fillStyle = g.tone(0.8)
    ctx.save()
    ctx.clip(pathOf(lampOutline()))
    ctx.fillRect(LX - 1.15 * LS, COLLAR, 0.24, -COLLAR)
    ctx.fillRect(LX - 0.45 * LS, -8.5, 0.16, 8.5 + SHOULDER)
    ctx.restore()
  })
  knockText(g, [INK.blue], '53', LX + 0.15, -0.5, { size: 0.8, kind: 'display', align: 'center' }, INK.sun)
}

/** The liquid-glass card: a conic border, a window, a solid foot with its name. */
function paintGlassCard(g) {
  const card = pathOf(GLASS_CARD)
  const cx = (GC.x0 + GC.x1) / 2
  conic(g, cx, GC.y0 / 2 - 0.4, card, 0.6)
  // the foot of the card: frosted white, the day set clean on it
  const foot = rrect(GC.x0 + GC.rim, -GC.band + 0.12, GC.x1 - GC.x0 - 2 * GC.rim, GC.band - GC.rim - 0.12, 0.22)
  for (const ink of ALL_INKS) g.knock(ink, (ctx) => ctx.fill(pathOf(foot)))
  g.fill(INK.aqua, foot, 0.16)
  g.text(INK.blue, '02', GC.x0 + GC.rim + 0.12, -0.62, { kind: 'display', size: 1.22 })
  g.text(INK.blue, 'Liquid Glass', GC.x0 + 2.05, -1.18, { kind: 'serif', size: 0.36, weight: 700 })
  g.text(INK.pink, 'DAY TWO', GC.x0 + 2.07, -0.72, { kind: 'mono', size: 0.26, tracking: 0.2 })
  // the stripe left standing across the window: bare card, edged in yellow
  const { p0, p1, n, half } = STRIPE
  const band = [
    [p0[0] + n[0] * half, p0[1] + n[1] * half],
    [p1[0] + n[0] * half, p1[1] + n[1] * half],
    [p1[0] - n[0] * half, p1[1] - n[1] * half],
    [p0[0] - n[0] * half, p0[1] - n[1] * half],
  ]
  const inWin = (fn) => (ctx) => {
    ctx.save()
    ctx.clip(pathOf(WIN))
    fn(ctx)
    ctx.restore()
  }
  for (const ink of ALL_INKS) g.knock(ink, inWin((ctx) => ctx.fill(pathOf(band))))
  g.ink(INK.sun, inWin((ctx) => {
    ctx.lineWidth = 0.12
    ctx.beginPath()
    ctx.moveTo(...band[0])
    ctx.lineTo(...band[1])
    ctx.moveTo(...band[3])
    ctx.lineTo(...band[2])
    ctx.stroke()
  }))
  // the rim of the window, a fine blue line so the cut reads as glass
  g.stroke(INK.blue, WIN, 0.05, 1, true)
}

function conic(g, cx, cy, shape, phase = 0) {
  // four inks swept round a point: a conic gradient made of overprints
  const inks = [INK.pink, INK.sun, INK.aqua, INK.blue]
  inks.forEach((ink, j) => {
    g.ink(ink, (ctx) => {
      ctx.save()
      ctx.clip(shape)
      for (let k = 0; k < 72; k++) {
        const t0 = (k / 72) * Math.PI * 2 + phase
        const u = ((k / 72) * 4 - j + 4) % 4
        const v = Math.max(0, 1 - Math.min(u, 4 - u) / 1.3)
        if (v <= 0) continue
        ctx.fillStyle = g.tone(Math.min(1, v * 1.2))
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, 30, t0, t0 + (Math.PI * 2) / 72 + 0.01)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    })
  })
}

/** The spilt goo: clean hot pink, a violet edge where it meets the ground, glints. */
function paintSpill(g) {
  const spill = pathOf(...spillShapes())
  for (const ink of [INK.sun, INK.aqua, INK.blue]) g.knock(ink, (ctx) => ctx.fill(spill))
  g.ink(INK.pink, (ctx) => ctx.fill(spill))
  g.ink(INK.blue, (ctx) => {
    ctx.save()
    ctx.clip(spill)
    ctx.fillStyle = g.tone(0.35)
    ctx.fillRect(-2, -0.16, 5, 0.2)
    ctx.restore()
  })
  g.knock(INK.pink, (ctx) => {
    for (const [x, y, r] of SPILL.slice(0, 5)) {
      ctx.beginPath()
      ctx.ellipse(x - r * 0.3, y - r * 0.32, r * 0.24, r * 0.09, -0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

const glass = {
  id: 'glass',
  kind: 'vfold',
  on: 'gutter',
  at: 15.4,
  glue: [64, 64],
  angle: [90, 90],
  day: 2,
  outline: glassShape,
  front(g) {
    paintGlassCard(g)
    paintLamp(g)
    paintSpill(g)
  },
  back(g) {
    const mx = (x) => g.box.x0 * 2 + g.box.w - x
    const all = rect(-20, -20, 40, 40)
    g.fill(INK.aqua, all, 0.45)
    g.fill(INK.pink, all, 0.12)
    // the lamp's back in the blue of its metal
    g.fill(INK.blue, lampOutline().map(([x, y]) => [mx(x), y]), 0.45)
    g.fill(INK.pink, spillShapes()[0].map(([x, y]) => [mx(x), y]), 0.8)
    g.text(INK.blue, 'glass', mx((GC.x0 + GC.x1) / 2), -1.0, { kind: 'serif', size: 0.5, italic: true, align: 'center' })
  },
}

// the lamp again, laminated onto half B as its own card: it taps as day 53
const lamp = {
  id: 'lamp',
  kind: 'flat',
  on: 'glass.B',
  at: [0, 0],
  day: 53,
  outline: lampOutline,
  front: paintLamp,
}

// ------------------------------------------------------------- the waves
// Fluid Sim (day 7): two breakers of dyed water curling toward each other
// across the crease, which sits in the trough between them. Each has a long
// gentle back, a lip that overhangs and hooks down into a curtain, claws of
// foam, and its barrel cut clean through; a small breaker rides at each end.

const WAVE_W = 8.2
const BARREL = { u: 3.28, h: 3.6, rx: 0.56, ry: 0.6, rot: -0.35 }
// foam claws on each lip: [u, h at the base, du, dh to the tip, width]
const CLAWS = [
  [2.74, 4.45, -0.46, -0.1, 0.24],
  [2.5, 4.13, -0.5, -0.2, 0.25],
  [2.41, 3.76, -0.46, -0.3, 0.24],
  [2.42, 3.32, -0.36, -0.32, 0.2],
  [6.72, 2.78, -0.3, -0.1, 0.15],
  [6.62, 2.55, -0.28, -0.2, 0.14],
]

// one half's top edge, from the outer end to the trough at the crease, as
// cubic segments in (u, h): u = distance from the crease, h = height.
// [p0, c1, c2, p3, foam from t, foam to t]
const PROFILE = [
  // the small breaker: a short back, a crest, a little lip
  [[WAVE_W, 2.25], [7.95, 2.42], [7.62, 2.8], [7.32, 2.9], 0.45, 1],
  [[7.32, 2.9], [7.0, 3.0], [6.7, 2.85], [6.6, 2.55], 0, 1],
  [[6.6, 2.55], [6.69, 2.5], [6.77, 2.45], [6.86, 2.4], 0, 0],
  // the big back: gentle at its foot, steepening into the crest
  [[6.86, 2.4], [5.9, 2.55], [4.6, 4.66], [3.6, 4.72], 0.6, 1],
  // the lip rolls over and forward, then falls as a curtain, hooking back
  [[3.6, 4.72], [2.85, 4.76], [2.42, 4.3], [2.4, 3.78], 0, 1],
  [[2.4, 3.78], [2.38, 3.3], [2.55, 2.9], [2.62, 2.62], 0, 1],
  // whitewash at its foot, then down into the trough at the crease
  [[2.62, 2.62], [2.3, 2.5], [1.4, 1.75], [-0.06, 1.6], 0, 0.3],
]

const bez = (p0, p1, p2, p3, t) => {
  const k = 1 - t
  return [0, 1].map((i) => k * k * k * p0[i] + 3 * k * k * t * p1[i] + 3 * k * t * t * p2[i] + t * t * t * p3[i])
}

/** Trace one half of the wave (s = −1 left, +1 right) as a closed shape. */
function waveHalf(ctx, s) {
  const m = (u, h) => [s * u, -h]
  ctx.beginPath()
  ctx.moveTo(...m(-0.06, 0))
  ctx.lineTo(...m(WAVE_W, 0))
  ctx.lineTo(...m(WAVE_W, 2.25))
  for (const [, c1, c2, p3] of PROFILE) ctx.bezierCurveTo(...m(...c1), ...m(...c2), ...m(...p3))
  ctx.closePath()
}

/** The stretches of crest and lip that break white, as open polylines. */
function foamLines(ctx, s) {
  const m = (u, h) => [s * u, -h]
  for (const [p0, c1, c2, p3, t0, t1] of PROFILE) {
    if (t1 <= t0) continue
    ctx.beginPath()
    for (let i = 0; i <= 16; i++) {
      const q = bez(p0, c1, c2, p3, t0 + ((t1 - t0) * i) / 16)
      if (i) ctx.lineTo(...m(...q))
      else ctx.moveTo(...m(...q))
    }
    ctx.stroke()
  }
}

function claw(ctx, s, [u, h, du, dh, w]) {
  const m = (a, b) => [s * a, -b]
  const l = Math.hypot(du, dh)
  const nu = (-dh / l) * w * 0.5
  const nh = (du / l) * w * 0.5
  ctx.beginPath()
  ctx.moveTo(...m(u + nu - du * 0.3, h + nh - dh * 0.3))
  ctx.quadraticCurveTo(...m(u + du * 0.55 + nu, h + dh * 0.45 + nh), ...m(u + du, h + dh))
  ctx.quadraticCurveTo(...m(u + du * 0.4 - nu * 0.4, h + dh * 0.6 - nh * 0.4), ...m(u - nu - du * 0.3, h - nh - dh * 0.3))
  ctx.closePath()
  ctx.fill()
}

function barrel(ctx, s, grow = 0, dx = 0, dy = 0) {
  ctx.beginPath()
  ctx.ellipse(s * (BARREL.u + dx), -(BARREL.h + dy), BARREL.rx + grow, BARREL.ry + grow, s * BARREL.rot, 0, Math.PI * 2)
  ctx.fill()
}

function drawWave(ctx) {
  aboveGlue(ctx)
  for (const s of [-1, 1]) {
    waveHalf(ctx, s)
    ctx.fill()
    for (const c of CLAWS) claw(ctx, s, c)
  }
  ctx.globalCompositeOperation = 'destination-out'
  for (const s of [-1, 1]) barrel(ctx, s)
}

const waveShape = memo(() => {
  const t = trace({ x0: -WAVE_W - 0.3, y0: -5.2, w: WAVE_W * 2 + 0.6, h: 5.2 }, drawWave, { res: 30, tol: 0.012 })
  return { outline: t.outline, holes: t.holes }
})

/** Dye stirred through each breaker, in (u, h). */
const RIBBONS = [
  // [ink, width, path]
  [INK.pink, 0.3, [[8.4, 1.25], [6.8, 1.3, 5.6, 2.2, 4.75, 2.95], [4.1, 3.5, 3.95, 2.62, 3.25, 2.68], [2.55, 2.74, 1.6, 1.25, -0.1, 1.05]]],
  [INK.sun, 0.26, [[8.4, 0.72], [6.9, 0.95, 6.1, 1.62, 5.2, 1.58], [4.3, 1.52, 3.4, 2.0, 2.4, 1.66], [1.6, 1.36, 0.8, 0.62, -0.1, 0.55]]],
]

function ribbon(ctx, s, path) {
  const m = (u, h) => [s * u, -h]
  ctx.beginPath()
  ctx.moveTo(...m(...path[0]))
  for (const [a, b, c, d, e, f] of path.slice(1)) ctx.bezierCurveTo(...m(a, b), ...m(c, d), ...m(e, f))
}

const wave = {
  id: 'wave',
  kind: 'vfold',
  on: 'gutter',
  at: 19.2,
  glue: [50, 50],
  angle: [90, 90],
  day: 7,
  outline: waveShape,
  front(g) {
    const body = pathOf(waveShape().outline)
    g.fill(INK.aqua, body)
    // deeper toward the foot, but never past half-tone
    g.ramp(INK.blue, body, 0, -2.2, 0, 0, 0, 0.48)
    // the inside of each barrel, in shadow
    g.ink(INK.blue, (ctx) => {
      ctx.save()
      ctx.clip(body)
      ctx.fillStyle = g.tone(0.7)
      for (const s of [-1, 1]) barrel(ctx, s, 0.3, 0.1, -0.1)
      ctx.restore()
    })
    // dye ribbons stirred through the water, printed clean
    for (const [ink, w, path] of RIBBONS) {
      const stroke = (ctx) => {
        ctx.save()
        ctx.clip(body)
        ctx.lineWidth = w
        for (const s of [-1, 1]) {
          ribbon(ctx, s, path)
          ctx.stroke()
        }
        ctx.restore()
      }
      for (const k of ALL_INKS) if (k !== ink) g.knock(k, stroke)
      g.ink(ink, stroke)
    }
    // foam: bare card along each crest and lip, the claws, the whitewash, spray
    const foam = (ctx) => {
      ctx.lineWidth = 0.44
      for (const s of [-1, 1]) {
        foamLines(ctx, s)
        for (const c of CLAWS) claw(ctx, s, c)
        const m = (u, h) => [s * u, -h]
        for (const [u, h, r] of [[2.48, 2.45, 0.2], [2.12, 2.3, 0.13], [1.85, 2.08, 0.08], [6.55, 2.32, 0.1], [2.9, 4.05, 0.07], [4.35, 4.0, 0.06], [4.0, 4.25, 0.05]]) {
          ctx.beginPath()
          ctx.arc(...m(u, h), r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    for (const ink of ALL_INKS) g.knock(ink, foam)
    knockText(g, ALL_INKS, 'FLUID SIM', -5.3, -0.36, { size: 0.36, tracking: 0.16, align: 'center' })
    knockText(g, ALL_INKS, '07', 5.3, -0.3, { size: 0.84, kind: 'display', align: 'center' })
  },
  back(g) {
    const body = mirrorX(waveShape().outline)
    g.fill(INK.aqua, body, 0.65)
    g.fill(INK.blue, body, 0.3)
  },
}

// ------------------------------------------------- the camera and its dial
// Aperture 61: a camera glued flat on the right page, its lens a die-cut
// window. Beneath it a disc turns on a rivet straight above the lens; six
// hexagonal holes of falling size pass under the lens, each ringed with
// printed iris blades, and the light printed on the page below shows through
// whichever is there. The camera hides the disc except a band of its rim,
// which stands above the body as the dial, showing the f-number against a
// pink index that overhangs the camera's top edge.

const LENS = { x: 13.95, y: 19.95, r: 1.12 }
const R0 = 2.32 // the ring of holes
const RIVET = { x: LENS.x, y: LENS.y - R0 }
const BLADE_R = LENS.r + 0.08 // iris blades printed this far round each hole
const COVER_R = R0 + BLADE_R + 0.06 // the camera hides the disc inside this
const DISC_R = COVER_R + 1.25
const NUM_R = COVER_R + 0.36 // baseline of the f-numbers
const TH_W = 90 // the lens, seen from the rivet: straight down
const STOPS = [
  ['1.4', 1.02],
  ['2.8', 0.76],
  ['4', 0.56],
  ['5.6', 0.41],
  ['8', 0.28],
  ['16', 0.15],
]
// the disc turns clockwise; hole k sits under the lens after k × 60°
const holeAt = (k) => {
  const t = (TH_W - k * 60) * D
  return [Math.cos(t) * R0, Math.sin(t) * R0]
}
const hexPts = (cx, cy, s, rot) => Array.from({ length: 6 }, (_, i) => [cx + s * Math.cos(rot + (i * Math.PI) / 3), cy + s * Math.sin(rot + (i * Math.PI) / 3)])

const CAM = { x0: 8.95, y0: RIVET.y - COVER_R, x1: 18.95, y1: 23.2 }
const HUMP = { x0: 16.55, x1: 18.5, h: 0.95 }
const POINTER = [
  [RIVET.x - 0.34, CAM.y0],
  [RIVET.x, CAM.y0 - 0.3],
  [RIVET.x + 0.34, CAM.y0],
]
const cameraShape = () => {
  // the body, with the dial's index and a viewfinder hump spliced into its
  // top edge (clockwise)
  const body = ballast(rrect(CAM.x0, CAM.y0, CAM.x1 - CAM.x0, CAM.y1 - CAM.y0, 0.7), [LENS.x, CAM.y1], 16, 2)
  const hump = [
    [HUMP.x0, CAM.y0],
    [HUMP.x0 + 0.35, CAM.y0 - HUMP.h],
    [HUMP.x1 - 0.35, CAM.y0 - HUMP.h],
    [HUMP.x1, CAM.y0],
  ]
  return {
    // the rrect wraps from its last point (top-left) to its first (top-right):
    // the index and the hump go in between
    outline: [...body, ...POINTER, ...hump],
    holes: [circlePts(LENS.x, LENS.y, LENS.r, 40)],
  }
}

const dial = {
  id: 'dial',
  kind: 'wheel',
  on: 'page:R',
  at: [RIVET.x, RIVET.y],
  radius: DISC_R,
  day: 61,
  outline: () => ({
    outline: circlePts(0, 0, DISC_R, 90),
    holes: STOPS.map(([, s], k) => {
      const [hx, hy] = holeAt(k)
      return hexPts(hx, hy, s, k * 0.37)
    }),
  }),
  front(g) {
    const disc = circlePts(0, 0, DISC_R + 0.1, 90)
    g.fill(INK.blue, disc)
    // knurled grip on the very edge of the rim
    g.ink(INK.pink, (ctx) => {
      ctx.lineWidth = 0.09
      for (let k = 0; k < 120; k++) {
        const t = (k / 120) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(t) * (DISC_R - 0.25), Math.sin(t) * (DISC_R - 0.25))
        ctx.lineTo(Math.cos(t) * (DISC_R + 0.1), Math.sin(t) * (DISC_R + 0.1))
        ctx.stroke()
      }
    })
    // the f-number of each hole, set where the dial shows above the camera
    STOPS.forEach(([f], k) => {
      const mid = 270 - k * 60
      const set = (ctx) => ringText(g, ctx, `f/${f}`, 0, 0, NUM_R, mid, 0.62, 0.02, 'display')
      for (const ink of [INK.blue, INK.pink]) g.knock(ink, set)
      g.ink(INK.sun, set)
    })
    // iris blades round every hole: a pinwheel of overlapping leaves
    const unit = (a, b) => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1])
      return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]
    }
    STOPS.forEach(([, s], k) => {
      const [hx, hy] = holeAt(k)
      const v = hexPts(hx, hy, s, k * 0.37)
      const clip = pathOf(circlePts(hx, hy, BLADE_R, 40))
      for (let i = 0; i < 6; i++) {
        const a = v[i]
        const b = v[(i + 1) % 6]
        const d1 = unit(a, b)
        const d0 = unit(v[(i + 5) % 6], a)
        const blade = [a, b, [b[0] + d1[0] * 4, b[1] + d1[1] * 4], [a[0] + d0[0] * 4, a[1] + d0[1] * 4]]
        g.ink(INK.pink, (ctx) => {
          ctx.save()
          ctx.clip(clip)
          ctx.fillStyle = g.tone(i % 2 ? 0.8 : 0.4)
          ctx.fill(pathOf(blade))
          ctx.restore()
        })
      }
      g.ink(INK.sun, (ctx) => {
        ctx.save()
        ctx.clip(clip)
        ctx.lineWidth = 0.05
        for (let i = 0; i < 6; i++) {
          const a = v[i]
          const d = unit(a, v[(i + 1) % 6])
          ctx.beginPath()
          ctx.moveTo(a[0], a[1])
          ctx.lineTo(a[0] + d[0] * 5, a[1] + d[1] * 5)
          ctx.stroke()
        }
        ctx.restore()
      })
    })
  },
  back(g) {
    g.fill(INK.aqua, circlePts(0, 0, DISC_R + 0.1, 90), 0.45)
    g.text(INK.blue, 'f/1.4 — f/16', 0, 1.6, { kind: 'mono', size: 0.3, align: 'center' })
  },
}

const camera = {
  id: 'camera',
  kind: 'flat',
  on: 'page:R',
  at: [0, 0],
  day: 61,
  outline: cameraShape,
  front(g) {
    const all = rect(CAM.x0 - 0.2, CAM.y0 - 1.3, CAM.x1 - CAM.x0 + 0.4, CAM.y1 - CAM.y0 + 1.5)
    // leatherette body: a blue half-tone, so the lens stays the darkest thing
    g.fill(INK.blue, all, 0.7)
    // top plate and viewfinder hump in aqua, knocked clean
    const plate = rect(CAM.x0 - 0.2, CAM.y0 - 1.3, CAM.x1 - CAM.x0 + 0.4, 2.55)
    g.knock(INK.blue, (ctx) => ctx.fill(pathOf(plate)))
    g.fill(INK.aqua, plate)
    g.fill(INK.blue, rect(CAM.x0 - 0.2, CAM.y0 + 1.2, CAM.x1 - CAM.x0 + 0.4, 0.07))
    g.fill(INK.blue, rrect(HUMP.x0 + 0.5, CAM.y0 - 0.7, 0.95, 0.5, 0.12, 2))
    g.fill(INK.pink, rrect(HUMP.x0 + 0.63, CAM.y0 - 0.62, 0.35, 0.32, 0.08, 2), 0.7)
    // the dial's index: solid pink on a knocked patch, overhanging the edge
    const index = [...POINTER, [RIVET.x + 0.12, CAM.y0 + 0.36], [RIVET.x - 0.12, CAM.y0 + 0.36]]
    g.knock(INK.aqua, (ctx) => ctx.fill(pathOf(index)))
    g.fill(INK.pink, index)
    g.text(INK.blue, 'APERTURE', CAM.x0 + 0.55, CAM.y0 + 0.82, { kind: 'mono', size: 0.32, tracking: 0.18 })
    g.circle(INK.sun, HUMP.x1 - 0.5, CAM.y0 + 0.62, 0.42)
    g.circle(INK.pink, HUMP.x1 - 0.5, CAM.y0 + 0.62, 0.27)
    // a curved arrow and the word: turn
    g.ink(INK.pink, (ctx) => {
      const cx = RIVET.x + 0.95
      const cy = CAM.y0 + 0.62
      ctx.lineWidth = 0.07
      ctx.beginPath()
      ctx.arc(cx, cy, 0.24, Math.PI * 0.9, Math.PI * 2.15)
      ctx.stroke()
      const t = Math.PI * 2.15
      const tx = cx + Math.cos(t) * 0.24
      const ty = cy + Math.sin(t) * 0.24
      ctx.beginPath()
      ctx.moveTo(tx + 0.13, ty - 0.02)
      ctx.lineTo(tx - 0.09, ty + 0.12)
      ctx.lineTo(tx - 0.05, ty - 0.13)
      ctx.closePath()
      ctx.fill()
    })
    g.text(INK.pink, 'turn', RIVET.x + 1.35, CAM.y0 + 0.8, { kind: 'serif', size: 0.4, italic: true, weight: 600 })
    // a ridged grip and a self-timer lamp
    const grip = rrect(16.95, CAM.y0 + 1.75, 1.65, 5.0, 0.35, 3)
    g.fill(INK.pink, grip, 0.55)
    g.ink(INK.blue, (ctx) => {
      ctx.save()
      ctx.clip(pathOf(grip))
      ctx.lineWidth = 0.07
      for (let x = 17.08; x < 18.6; x += 0.22) {
        ctx.beginPath()
        ctx.moveTo(x, CAM.y0 + 1.7)
        ctx.lineTo(x, CAM.y0 + 7.2)
        ctx.stroke()
      }
      ctx.restore()
    })
    g.circle(INK.sun, CAM.x0 + 0.85, CAM.y0 + 1.95, 0.3)
    g.circle(INK.pink, CAM.x0 + 0.85, CAM.y0 + 1.95, 0.17)
    // the lens barrel: knocked clean, then rings
    const barrelArea = (ctx) => {
      ctx.beginPath()
      ctx.arc(LENS.x, LENS.y, 2.7, 0, Math.PI * 2)
      ctx.fill()
    }
    g.knock(INK.blue, barrelArea)
    g.knock(INK.pink, barrelArea)
    g.ink(INK.sun, (ctx) => {
      ctx.lineWidth = 0.48
      ctx.beginPath()
      ctx.arc(LENS.x, LENS.y, 2.42, 0, Math.PI * 2)
      ctx.stroke()
    })
    g.ink(INK.blue, (ctx) => {
      for (const [r, w] of [[2.68, 0.09], [2.15, 0.05]]) {
        ctx.lineWidth = w
        ctx.beginPath()
        ctx.arc(LENS.x, LENS.y, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      // focus scale ticks on the yellow ring
      ctx.lineWidth = 0.04
      for (let k = 0; k < 48; k++) {
        const t = (k / 48) * Math.PI * 2
        const r1 = k % 4 ? 2.33 : 2.21
        ctx.beginPath()
        ctx.moveTo(LENS.x + Math.cos(t) * r1, LENS.y + Math.sin(t) * r1)
        ctx.lineTo(LENS.x + Math.cos(t) * 2.63, LENS.y + Math.sin(t) * 2.63)
        ctx.stroke()
      }
    })
    g.ink(INK.pink, (ctx) => {
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.arc(LENS.x, LENS.y, 1.86, 0, Math.PI * 2)
      ctx.stroke()
    })
    g.knock(INK.pink, (ctx) => ringText(g, ctx, 'APERTURE 61 · FOUR GLSL LENSES', LENS.x, LENS.y, 1.76, -90, 0.26, 0.1))
    for (const ink of [INK.blue, INK.pink]) {
      g.ink(ink, (ctx) => {
        ctx.lineWidth = 0.36
        ctx.beginPath()
        ctx.arc(LENS.x, LENS.y, LENS.r + 0.18, 0, Math.PI * 2)
        ctx.stroke()
      })
    }
    // a 61 on the body, yellow knocked clean
    knockText(g, [INK.blue, INK.pink], '61', 17.75, 22.55, { size: 1.3, kind: 'display', align: 'center' }, INK.sun)
  },
  back(g) {
    g.fill(INK.blue, rect(0, 0, W, H), 0.3)
  },
}

// ------------------------------------------- the shader editor and its tab
// Shader Playground (day 20): an editor card glued flat on the left page with
// two windows: its canvas, and an odometer slot. A strip slides beneath it;
// pulling the tab out past the page edge scrubs t, and the colour field in
// the canvas flows. The editor is wide enough that the field never leaves
// it: every part of the strip that comes out is the pink handle.

const ED = { x0: M.outer, y0: 16.1, w: 11.2, h: 5.35 }
const ED_X1 = ED.x0 + ED.w
const CANVAS = { x: ED.x0 + 3.0, y: ED.y0 + 1.12, s: 2.6 }
const PULL = 2.6 // cm of travel
const TIME_PER_CM = (Math.PI * 2) / PULL // t runs 0 … 2π, once round
const T_STEP = Math.PI / 2 // one number per window: 0, π/2, π, 3π/2, 2π
const SLOT = { w: T_STEP / TIME_PER_CM - 0.04, h: 0.62, y: CANVAS.y + CANVAS.s + 0.36 }
SLOT.x = CANVAS.x + CANVAS.s - 0.15 - SLOT.w
const T0X = SLOT.x + SLOT.w / 2 // where t = 0 sits at rest

const editorShape = () => ({
  outline: ballast(rrect(ED.x0, ED.y0, ED.w, ED.h, 0.32), [ED.x0 + 0.4, ED.y0 + ED.h], 90, 0.08),
  holes: [rect(CANVAS.x, CANVAS.y, CANVAS.s, CANVAS.s), rrect(SLOT.x, SLOT.y, SLOT.w, SLOT.h, 0.1, 2)],
})

// the strip: a tall body carrying the field and the numbers, and a narrow tab
// running out to the handle. The body starts far enough in that, pulled all
// the way, it is still under the editor.
const STRIP = { x0: CANVAS.x - 0.25, x1: CANVAS.x + CANVAS.s + PULL + 0.3, y0: CANVAS.y - 0.22, y1: SLOT.y + SLOT.h + 0.22 }
const TAB = { x0: -1.0, y0: 17.95, y1: 19.75 }
const stripShape = () => [
  ...arcPts(TAB.x0 + 0.5, TAB.y0 + 0.5, 0.5, 180, 270, 5),
  [STRIP.x0, TAB.y0],
  [STRIP.x0, STRIP.y0],
  [STRIP.x1, STRIP.y0],
  [STRIP.x1, STRIP.y1],
  [STRIP.x0, STRIP.y1],
  [STRIP.x0, TAB.y1],
  ...arcPts(TAB.x0 + 0.5, TAB.y1 - 0.5, 0.5, 90, 180, 5),
]

/** The colour field the shader draws, at strip point (x, y): three inks of sine. */
function field(x, y) {
  const u = x * 1.6
  const v = y * 1.6
  const w = Math.sin(u + Math.sin(v * 0.9 + u * 0.35)) + Math.sin(v * 1.3 - u * 0.6)
  return [
    0.5 + 0.5 * Math.sin(w * 1.6), // pink
    0.5 + 0.5 * Math.sin(w * 1.6 + 2.1), // yellow
    0.5 + 0.5 * Math.sin(w * 1.6 + 4.2), // aqua
  ]
}

const strip = {
  id: 'strip',
  kind: 'slider',
  on: 'page:L',
  at: [0, 0],
  travel: [-PULL, 0],
  day: 20,
  outline: stripShape,
  front(g) {
    // the field, printed only where the canvas can ever see it
    const fx0 = CANVAS.x - 0.2
    const step = 0.13
    const inks = [INK.pink, INK.sun, INK.aqua]
    inks.forEach((ink, j) => {
      g.ink(ink, (ctx) => {
        for (let x = fx0; x < STRIP.x1; x += step) {
          for (let y = CANVAS.y - 0.12; y < CANVAS.y + CANVAS.s + 0.12; y += step) {
            ctx.fillStyle = g.tone(field(x, y)[j] * 0.95)
            ctx.fillRect(x, y, step + 0.01, step + 0.01)
          }
        }
      })
    })
    // the odometer band: bare card, one number per window width
    for (let t = 0; t <= Math.PI * 2 + 0.01; t += T_STEP) {
      const x = T0X + t / TIME_PER_CM
      g.text(INK.blue, t.toFixed(1), x, SLOT.y + 0.46, { kind: 'display', size: 0.34, align: 'center' })
    }
    // the handle: everything left of the field is the pink tab
    const tab = rect(TAB.x0, TAB.y0, fx0 - TAB.x0, TAB.y1 - TAB.y0)
    g.fill(INK.pink, tab)
    g.fill(INK.sun, tab, 0.3)
    g.fill(INK.pink, rect(STRIP.x0 - 0.1, STRIP.y0, fx0 - STRIP.x0 + 0.1, STRIP.y1 - STRIP.y0))
    const pullArrow = (ctx) => {
      const ax = TAB.x0 + 0.3
      const ay = (TAB.y0 + TAB.y1) / 2
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(ax + 0.34, ay - 0.24)
      ctx.lineTo(ax + 0.34, ay + 0.24)
      ctx.closePath()
      ctx.fill()
    }
    for (const ink of [INK.pink, INK.sun]) g.knock(ink, pullArrow)
    knockText(g, [INK.pink, INK.sun], 'PULL', TAB.x0 + 1.5, (TAB.y0 + TAB.y1) / 2 + 0.14, { size: 0.38, tracking: 0.1, align: 'center' })
    // further along the handle, for when it is pulled right out
    knockText(g, [INK.pink, INK.sun], 'PULL', TAB.x0 + 3.65, (TAB.y0 + TAB.y1) / 2 + 0.14, { size: 0.38, tracking: 0.1, align: 'center' })
  },
  back(g) {
    g.fill(INK.pink, rect(-30, 0, 60, 30), 0.35)
  },
}

const SHADER = [
  // [text, colour] runs per line: 0 = plain (blue), 1 = names (pink)
  [['uniform float ', 1], ['t', 0], [';', 0]],
  [['void ', 1], ['main', 1], ['() {', 0]],
  [['  vec2', 1], [' p = uv * 6.;', 0]],
  [['  float', 1], [' w = ', 0], ['sin', 1], ['(p.x+t);', 0]],
  [['  w += ', 0], ['sin', 1], ['(p.y * 1.3);', 0]],
  [['  gl_FragColor', 1], ['=', 0], ['hue', 1], ['(w);}', 0]],
]
const CODE = { x: CANVAS.x + CANVAS.s + 0.42, y: CANVAS.y - 0.06, size: 0.32, pitch: 0.56 }

const editor = {
  id: 'editor',
  kind: 'flat',
  on: 'page:L',
  at: [0, 0],
  day: 20,
  outline: editorShape,
  front(g) {
    const all = rect(ED.x0 - 0.2, ED.y0 - 0.2, ED.w + 0.4, ED.h + 0.4)
    g.fill(INK.blue, all, 0.7)
    // title bar
    const bar = rect(ED.x0 - 0.2, ED.y0 - 0.2, ED.w + 0.4, 0.86)
    g.knock(INK.blue, (ctx) => ctx.fill(pathOf(bar)))
    g.fill(INK.aqua, bar)
    ;[INK.pink, INK.sun, INK.blue].forEach((ink, i) => g.circle(ink, ED.x0 + 0.42 + i * 0.36, ED.y0 + 0.32, 0.12))
    g.text(INK.blue, 'playground.frag', CANVAS.x, ED.y0 + 0.44, { kind: 'mono', size: 0.28 })
    g.fill(INK.pink, rrect(ED_X1 - 1.4, ED.y0 + 0.1, 1.1, 0.44, 0.1, 2))
    g.fill(INK.blue, [[ED_X1 - 1.25, ED.y0 + 0.2], [ED_X1 - 1.03, ED.y0 + 0.32], [ED_X1 - 1.25, ED.y0 + 0.44]])
    g.text(INK.blue, 'RUN', ED_X1 - 0.66, ED.y0 + 0.43, { kind: 'mono', size: 0.26, align: 'center' })
    // the day, down the left
    knockText(g, [INK.blue], '20', ED.x0 + 0.35, CANVAS.y + 1.15, { size: 1.25, kind: 'display' }, INK.pink)
    knockText(g, [INK.blue], 'SHADER', ED.x0 + 0.38, CANVAS.y + 1.75, { size: 0.28, tracking: 0.14 })
    knockText(g, [INK.blue], 'PLAYGROUND', ED.x0 + 0.38, CANVAS.y + 2.15, { size: 0.28, tracking: 0.14 })
    // the canvas frame
    g.ink(INK.sun, (ctx) => {
      ctx.lineWidth = 0.08
      ctx.strokeRect(CANVAS.x - 0.06, CANVAS.y - 0.06, CANVAS.s + 0.12, CANVAS.s + 0.12)
    })
    // the odometer: its label, a clean frame and pink index marks
    const patch = rrect(SLOT.x - 1.02, SLOT.y - 0.38, SLOT.w + 1.1, SLOT.h + 0.76, 0.14, 2)
    for (const ink of [INK.blue, INK.aqua]) g.knock(ink, (ctx) => ctx.fill(pathOf(patch)))
    g.text(INK.blue, 't =', SLOT.x - 0.16, SLOT.y + 0.46, { kind: 'display', size: 0.4, align: 'right' })
    g.fill(INK.pink, [[T0X - 0.17, SLOT.y - 0.3], [T0X + 0.17, SLOT.y - 0.3], [T0X, SLOT.y - 0.06]])
    g.fill(INK.pink, [[T0X - 0.17, SLOT.y + SLOT.h + 0.3], [T0X + 0.17, SLOT.y + SLOT.h + 0.3], [T0X, SLOT.y + SLOT.h + 0.06]])
    // the code, on a pale panel
    const panel = rrect(CODE.x - 0.18, CODE.y, ED_X1 - 0.25 - (CODE.x - 0.18), SLOT.y + SLOT.h - CODE.y, 0.14, 2)
    g.knock(INK.blue, (ctx) => ctx.fill(pathOf(panel)))
    g.fill(INK.aqua, panel, 0.22)
    const o = { kind: 'mono', size: CODE.size }
    SHADER.forEach((runs, i) => {
      const y = CODE.y + 0.55 + i * CODE.pitch
      let x = CODE.x
      for (const [str, c] of runs) {
        if (c === 1) {
          g.knock(INK.aqua, (ctx) => rawText(g, ctx, str, x, y, o))
          g.text(INK.pink, str, x, y, o)
        } else g.text(INK.blue, str, x, y, o)
        x += g.measure(str, o)
      }
    })
  },
  back(g) {
    g.fill(INK.blue, rect(0, 0, W, H), 0.3)
  },
}

// ----------------------------------------------------------------- pages

const TEXT =
  'Seven days spent chasing light through things that bend it: a pane of frosted glass that tilts toward your hand, dye stirred into water until it ran rainbow, shaders typed live, a rose window of leaded jewels, goo that pulls itself back together, a gradient that drifts like weather, and a lens that warps whatever it looks at.'

/** Spread x (gutter at 0, left page negative) to page x. */
const px = (side, X) => (side === 'L' ? W + X : X)
const PAGE = rect(0, 0, W, H)

/**
 * The light behind the window: an overprinted mesh gradient (day 54). Its
 * heart, under the leaning window, is what shows through the die-cut panes;
 * its halo glows round the arch.
 */
function meshLight(g, side) {
  const halo = [
    [INK.sun, 0, 5.0, 12.5, 0.7],
    [INK.pink, -7.0, 2.5, 6.5, 0.75],
    [INK.aqua, 7.0, 2.0, 7.0, 0.8],
    [INK.blue, 0, -2.0, 6.5, 0.7],
  ]
  const heart = [
    [INK.blue, 0, 1.2, 4.2, 0.9],
    [INK.pink, -3.6, 4.6, 3.6, 1],
    [INK.aqua, 3.6, 4.2, 3.8, 1],
    [INK.sun, 0, 6.8, 4.6, 1],
    [INK.pink, 2.8, 9.8, 3.4, 0.95],
    [INK.aqua, -2.8, 9.6, 3.4, 0.9],
    [INK.blue, 5.6, 9.0, 2.6, 0.7],
    [INK.blue, -5.6, 9.0, 2.6, 0.7],
  ]
  for (const [ink, X, y, r, t] of [...halo, ...heart]) g.glow(ink, PAGE, px(side, X), y, r, t, 0)
}

const POOL = { y: 19.8, rx: 8.1, ry: 5.6 }

/** The pool the figures stand in and the waves run across, under the pop-ups. */
function pool(g, side) {
  const cx = px(side, 0)
  g.ink(INK.aqua, (ctx) => {
    ctx.fillStyle = g.tone(0.5)
    ctx.beginPath()
    ctx.ellipse(cx, POOL.y, POOL.rx, POOL.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  // ripples: broken wavy rings
  g.ink(INK.blue, (ctx) => {
    ctx.strokeStyle = g.tone(0.75)
    ctx.lineWidth = 0.06
    for (const [k, ph] of [[0.9, 0], [0.76, 1.3], [0.6, 2.6], [0.97, 0.7]]) {
      ctx.beginPath()
      let pen = false
      for (let a = 0; a <= Math.PI * 2 + 1e-6; a += 0.02) {
        const on = Math.sin(a * 5 + ph) > -0.55
        const wob = 1 + Math.sin(a * 22 + ph) * 0.015
        const x = cx + Math.cos(a) * POOL.rx * k * wob
        const y = POOL.y + Math.sin(a) * POOL.ry * k * wob
        if (on && pen) ctx.lineTo(x, y)
        else if (on) ctx.moveTo(x, y)
        pen = on
      }
      ctx.stroke()
    }
  })
  // light from the window falling on the water, a few warm glints
  g.ink(INK.sun, (ctx) => {
    for (let i = 0; i < 9; i++) {
      const X = -6 + i * 1.5 + Math.sin(i * 2.7) * 0.4
      const y = 16.2 + ((i * 1.7) % 3) * 0.9
      ctx.beginPath()
      ctx.ellipse(px(side, X), y, 0.42, 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

const idx = dayIndex({ days: CH.days, side: 'R', x: 10.6, y: 2.2, width: 8.6, ink: INK.blue, accent: INK.pink, gap: 1.18, size: 0.4 })

// the mesh gradient is the light itself: it is labelled on the rim of its
// halo, and tapping there opens day 54
const MESH = { x: 10.6, y: 11.35 }
const meshSpot = { day: 54, on: 'page:R', rect: [MESH.x - 0.2, MESH.y - 0.55, 6.4, 0.85] }

function pageL(g) {
  meshLight(g, 'L')
  pool(g, 'L')
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', INK.blue)
  // the numeral: pink with a yellow shadow, knocked so the pink prints clean
  const III = { kind: 'display', size: 4.4 }
  g.text(INK.sun, 'III', M.outer + 0.16, 6.76, III)
  g.knock(INK.sun, (ctx) => rawText(g, ctx, 'III', M.outer, 6.6, III))
  g.text(INK.pink, 'III', M.outer, 6.6, III)
  g.text(INK.blue, 'Light & Liquid', M.outer, 8.75, { kind: 'display', size: 1.42 })
  g.text(INK.pink, 'chapter three · glass, dye, goo and a lens', M.outer, 9.55, { kind: 'serif', size: 0.42, italic: true })
  g.para(INK.blue, TEXT, M.outer, 10.75, 9.6, { size: 0.39, leading: 0.54 })
  g.para(INK.blue, 'Pull the tab: time runs, and the colour flows through the canvas.', M.outer, ED.y0 + ED.h + 0.75, 9.6, { size: 0.32, italic: true, leading: 0.44 })
  folio(g, pl, 'L', INK.blue)
}

function pageR(g) {
  meshLight(g, 'R')
  pool(g, 'R')
  runningHead(g, 'seven days of light', 'R', INK.blue)
  idx.paint(g)
  // the mesh gradient's own label: four overprinted dots and its name
  const dots = [[INK.pink, 0], [INK.sun, 0.3], [INK.aqua, 0.6], [INK.blue, 0.9]]
  for (const [ink, dx] of dots) g.circle(ink, MESH.x + 0.2 + dx, MESH.y - 0.11, 0.2, 0.85)
  g.text(INK.blue, 'MESH GRADIENT · 54', MESH.x + 1.55, MESH.y, { kind: 'mono', size: 0.3, tracking: 0.14 })
  // the light the lens looks at, printed on the page under the dial's holes
  g.circle(INK.sun, LENS.x, LENS.y, LENS.r + 0.25)
  g.glow(INK.pink, circlePts(LENS.x, LENS.y, LENS.r + 0.25), LENS.x, LENS.y, LENS.r * 0.9, 1, 0.05)
  g.knock(INK.pink, (ctx) => {
    ctx.lineWidth = 0.06
    for (let k = 0; k < 8; k++) {
      const t = (k / 8) * Math.PI * 2 + 0.2
      ctx.beginPath()
      ctx.moveTo(LENS.x + Math.cos(t) * 0.3, LENS.y + Math.sin(t) * 0.3)
      ctx.lineTo(LENS.x + Math.cos(t) * (k % 2 ? 0.6 : 1.1), LENS.y + Math.sin(t) * (k % 2 ? 0.6 : 1.1))
      ctx.stroke()
    }
  })
  // a light meter for first-time readers: a wide sun, an arrow, a pinpoint
  const my = CAM.y1 + 0.6
  const mx0 = CAM.x0 + 0.05
  g.circle(INK.sun, mx0 + 0.32, my, 0.32)
  g.circle(INK.pink, mx0 + 0.32, my, 0.16, 0.8)
  g.ink(INK.blue, (ctx) => {
    ctx.lineWidth = 0.05
    ctx.beginPath()
    ctx.moveTo(mx0 + 0.78, my)
    ctx.lineTo(mx0 + 1.32, my)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(mx0 + 1.42, my)
    ctx.lineTo(mx0 + 1.28, my - 0.09)
    ctx.lineTo(mx0 + 1.28, my + 0.09)
    ctx.closePath()
    ctx.fill()
  })
  g.circle(INK.sun, mx0 + 1.62, my, 0.09)
  g.circle(INK.pink, mx0 + 1.62, my, 0.05)
  g.para(INK.blue, 'Turn the dial: the iris closes, and the light it lets through shrinks to a point.', mx0 + 2.0, my + 0.11, CAM.x1 - mx0 - 2.0, { size: 0.32, italic: true, leading: 0.44 })
  folio(g, pr, 'R', INK.blue)
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: pageL, R: pageR },
  // order matters for flats: the strip slides under the editor, the disc
  // turns under the camera, the lamp is laminated onto the glass V-fold
  pieces: [rose, glass, lamp, wave, strip, editor, dial, camera],
  spots: [...idx.spots, meshSpot],
}
