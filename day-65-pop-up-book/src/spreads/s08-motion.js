// Chapter VIII — Motion. A studio whiteboard of motion sketches leans at the
// back in cool aqua; in front of it a giant purple pointer swoops toward the
// reader on a comet of spring particles, a chat bubble rides beside it, and a
// warm paper scroll unrolls at the front of the stage. Speed streaks fan out
// across the paper beneath. On the left page a NovaDesk window hides a stack
// of toasts that a pull-tab slides into view; on the right a coffee receipt
// lifts like a cover and a cup of a year's coffee, one dot per four cups,
// stands up.

import { trace } from '../art/trace.js'
import { W } from '../paper/dims.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayIndex, folio, runningHead } from './furniture.js'

const CH = CHAPTERS[7]
const [pl, pr] = folios(8)
const PU = 'purple'
const YE = 'yellow'
const AQ = 'aqua'
const RAD = Math.PI / 180

// ------------------------------------------------------------ geometry kit
const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
const lerp = (a, b, t) => a + (b - a) * t

/** Rounded rectangle as a clockwise polygon. */
function rounded(x, y, w, h, r, seg = 5) {
  const out = []
  const corners = [
    [x + w - r, y + r, -90],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, 90],
    [x + r, y + r, 180],
  ]
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = (a0 + (90 * i) / seg) * RAD
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  return out
}

function pathOf(ctx, pts) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

/** Points along a cubic Bézier. */
function cubic(c, n) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const u = 1 - t
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t]
    return [0, 1].map((j) => k.reduce((acc, kk, m) => acc + kk * c[m][j], 0))
  })
}

/** Cumulative arc length of a polyline. */
function arcLen(pts) {
  const len = [0]
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return len
}

/**
 * A tapered band along a polyline: half-width w(t) at fraction t of its
 * length. Returns a closed polygon (left side out, right side back).
 */
function band(pts, w) {
  const len = arcLen(pts)
  const L = len[len.length - 1]
  const left = []
  const right = []
  pts.forEach(([x, y], i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    const h = w(len[i] / L)
    left.push([x - (dy / l) * h, y + (dx / l) * h])
    right.push([x + (dy / l) * h, y - (dx / l) * h])
  })
  return [...left, ...right.reverse()]
}

/**
 * V-fold glue lines in card coordinates: half A leaves the origin at angle
 * βa from the crease, half B at βb. y of each glue line at card x.
 */
const glueY = ([ba, bb], x) => (x <= 0 ? x / Math.tan(ba * RAD) : -x / Math.tan(bb * RAD))

/** Erase everything of a trace mask below a V-fold's glue lines. */
function cutGlue(ctx, ang) {
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(-30, glueY(ang, -30))
  ctx.lineTo(0, 0)
  ctx.lineTo(30, glueY(ang, 30))
  ctx.lineTo(30, 30)
  ctx.lineTo(-30, 30)
  ctx.closePath()
  ctx.fill()
}

/** Traced outlines land a hair off the glue lines; snap the feet onto them. */
function footed(t, ang = [90, 90]) {
  const snap = (loop) =>
    loop.map(([x, y]) => {
      const gy = glueY(ang, x)
      return [x, Math.abs(y - gy) < 0.08 ? gy : y]
    })
  return { outline: snap(t.outline), holes: t.holes }
}

/** The classic arrow pointer, tip at (x, y), s cm per unit, turned rot° clockwise. */
const POINTER = [[0, 0], [0, 16.6], [4, 12.8], [6.9, 19.4], [9.8, 18.1], [7, 11.7], [12.2, 11.7]]
function pointer(x, y, s, rot = 0) {
  const c = Math.cos(rot * RAD)
  const n = Math.sin(rot * RAD)
  return POINTER.map(([u, v]) => [x + (u * c - v * n) * s, y + (u * n + v * c) * s])
}

/** Paint inside a transformed frame: every ink call of g goes through m. */
function within(g, m, fn) {
  const ink = g.ink
  g.ink = (name, f) =>
    ink.call(g, name, (ctx, k) => {
      ctx.transform(...m)
      f(ctx, k)
    })
  try {
    fn(g)
  } finally {
    g.ink = ink
  }
}
const turn = (x, y, deg) => {
  const c = Math.cos(deg * RAD)
  const s = Math.sin(deg * RAD)
  return [c, s, -s, c, x, y]
}

/** A tint over a whole surface (the die-cut trims it to the card). */
const flood = (g, ink, tone) => g.fill(ink, rectPts(g.box.x0, g.box.y0, g.box.w, g.box.h), tone)

/** On a back, paint in the front's card coordinates (backs read mirrored). */
const behind = (g, fn) => within(g, [-1, 0, 0, 1, 2 * g.box.x0 + g.box.w, 0], fn)
const behindX = (g, x) => 2 * g.box.x0 + g.box.w - x

/** Type that prints clean: knock the ink beneath out of its shape first. */
function clean(g, under, ink, str, x, y, opts) {
  const orig = g.ink
  g.ink = (name, f) =>
    orig.call(g, name, (ctx, k) => {
      ctx.globalCompositeOperation = 'destination-out'
      f(ctx, k)
    })
  try {
    for (const u of [].concat(under)) g.text(u, str, x, y, opts)
  } finally {
    g.ink = orig
  }
  g.text(ink, str, x, y, opts)
}

/** Knock several inks out under a polygon. */
function knockAll(g, inks, pts) {
  for (const ink of inks) {
    g.knock(ink, (ctx) => {
      pathOf(ctx, pts)
      ctx.fill()
    })
  }
}

/**
 * A small cursor with a name tag (multiplayer presence, days 27 + 39). The
 * tag sits below-right of the pointer, or to its left with side = -1.
 */
function presence(g, x, y, s, ink, tagInk, name, side = 1) {
  g.fill(ink, pointer(x, y, s))
  const opts = { kind: 'mono', size: 0.26 }
  const w = g.measure(name, opts) + 0.34
  const tx = side > 0 ? x + 9 * s : x - 0.18 - w
  const ty = side > 0 ? y + 15.5 * s : y + 2 * s
  const tag = rounded(tx, ty, w, 0.44, 0.12, 3)
  knockAll(g, [PU, AQ, YE].filter((k) => k !== tagInk), tag)
  g.fill(tagInk, tag)
  g.text(PU, name, tx + 0.17, ty + 0.32, opts)
}

// ------------------------------------------------------------- the board
// Day 39: a two-panel whiteboard on legs, leaning back as the backdrop. Its
// frame prints in aqua so it recedes behind the purple pointer.
const B = { x0: -9.4, x1: 9.4, y0: -10.6, y1: -3.2, at: 10.7, glue: 62, angle: 100 }

function boardOutline() {
  const { x0, x1, y0, y1 } = B
  const r = 0.6
  const b = B.angle * RAD
  const s = Math.sin(b)
  const c = Math.cos(b)
  const dA = [-s, -c]
  const dB = [s, -c]
  const nA = [c, -s]
  const nB = [-c, -s]
  const lw = 0.32
  const xl = 7.1
  const hf = 0.42
  const [f0, f1] = [6.2, 8.3]
  const on = (d, dir, n, h) => [d * dir[0] + h * n[0], d * dir[1] + h * n[1]]
  // where a vertical line x = X meets the top of a foot
  const footTop = (X, dir, n) => on((X - hf * n[0]) / dir[0], dir, n, hf)
  const out = []
  const arc = (cx, cy, a0) => {
    for (let i = 0; i <= 5; i++) {
      const a = (a0 + 18 * i) * RAD
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  arc(x0 + r, y0 + r, 180)
  arc(x1 - r, y0 + r, 270)
  arc(x1 - r, y1 - r, 0)
  // right leg (side B), outer edge first, down to a foot on the glue line
  out.push([xl + lw, y1], footTop(xl + lw, dB, nB), on(f1, dB, nB, hf), on(f1, dB, nB, 0))
  out.push(on(f0, dB, nB, 0), on(f0, dB, nB, hf), footTop(xl - lw, dB, nB), [xl - lw, y1])
  // left leg (side A), inner edge first
  out.push([-xl + lw, y1], footTop(-xl + lw, dA, nA), on(f0, dA, nA, hf), on(f0, dA, nA, 0))
  out.push(on(f1, dA, nA, 0), on(f1, dA, nA, hf), footTop(-xl - lw, dA, nA), [-xl - lw, y1])
  arc(x0 + r, y1 - r, 90)
  return out
}
const BOARD_OUT = boardOutline()
const BOARD_IN = rounded(B.x0 + 0.38, B.y0 + 0.38, B.x1 - B.x0 - 0.76, B.y1 - B.y0 - 0.76, 0.28)

function easing(g, ox, oy, w, h) {
  g.stroke(PU, [[ox, oy - h - 0.3], [ox, oy], [ox + w + 0.3, oy]], 0.05)
  const c1 = [ox + w * 0.42, oy]
  const c2 = [ox + w * 0.58, oy - h]
  g.stroke(AQ, [[ox, oy], c1], 0.05)
  g.stroke(AQ, [[ox + w, oy - h], c2], 0.05)
  g.circle(AQ, ...c1, 0.16)
  g.circle(AQ, ...c2, 0.16)
  g.ink(PU, (ctx) => {
    ctx.lineWidth = 0.16
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], ox + w, oy - h)
    ctx.stroke()
  })
  // keyframes on equal time steps, bunched at both ends
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    g.circle(PU, ox + w * t, oy - h * e, 0.09)
  }
}

function spring(g, ox, oy, w, amp) {
  g.ink(PU, (ctx) => {
    ctx.setLineDash([0.16, 0.14])
    ctx.lineWidth = 0.045
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(ox + w, oy)
    ctx.stroke()
  })
  g.ink(AQ, (ctx) => {
    ctx.lineWidth = 0.17
    ctx.beginPath()
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      const y = oy - amp * Math.exp(-3.2 * t) * Math.cos(t * 5.2 * Math.PI)
      if (i) ctx.lineTo(ox + w * t, y)
      else ctx.moveTo(ox, y)
    }
    ctx.stroke()
  })
}

function sticky(g, x, y, size, deg, lines) {
  within(g, turn(x, y, deg), () => {
    g.fill(YE, rectPts(0, 0, size, size))
    g.fill(YE, rectPts(0, 0, size, 0.3), 0.55)
    lines.forEach((ln, i) => g.text(PU, ln, 0.2, 0.92 + i * 0.5, { kind: 'serif', size: 0.4, italic: true, weight: 600 }))
  })
}

const board = {
  id: 'board',
  kind: 'vfold',
  on: 'gutter',
  at: B.at,
  glue: [B.glue, B.glue],
  angle: [B.angle, B.angle],
  day: 39,
  outline: BOARD_OUT,
  front(g) {
    // an aqua frame and legs: the cool backdrop
    g.fill(AQ, BOARD_OUT)
    g.knock(AQ, (ctx) => {
      pathOf(ctx, BOARD_IN)
      ctx.fill()
    })
    // a darker aqua lip under the board's tray
    g.fill(AQ, rectPts(B.x0, B.y1 - 0.38, B.x1 - B.x0, 0.38), 1)
    g.fill(PU, rectPts(B.x0, B.y1 - 0.38, B.x1 - B.x0, 0.38), 0.35)
    // the infinite canvas' dot grid, in a light purple
    g.ink(PU, (ctx) => {
      ctx.save()
      pathOf(ctx, BOARD_IN)
      ctx.clip()
      ctx.fillStyle = g.tone(0.3)
      for (let x = B.x0 + 0.55; x < B.x1; x += 0.7) {
        for (let y = B.y0 + 0.55; y < B.y1; y += 0.7) {
          ctx.beginPath()
          ctx.arc(x, y, 0.05, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    })
    clean(g, AQ, PU, '39 · WHITEBOARD', B.x1 - 0.7, B.y0 + 0.3, { kind: 'mono', size: 0.26, align: 'right', tracking: 0.12 })
    // left panel: the title, an easing curve, a bouncing ball
    g.fill(YE, rectPts(-8.75, -9.55, 5.55, 0.36))
    g.text(PU, 'motion studies', -8.75, -9.4, { kind: 'display', size: 0.7 })
    easing(g, -8.4, -4.55, 3.4, 3.6)
    g.text(PU, 'EASE-IN-OUT', -8.4, -3.85, { kind: 'mono', size: 0.26, tracking: 0.1 })
    // a bouncing ball: squash on the floor, stretch in the air
    const floor = -4.45
    g.stroke(PU, [[-4.5, floor], [-0.9, floor]], 0.05)
    g.ink(PU, (ctx) => {
      ctx.setLineDash([0.1, 0.12])
      ctx.lineWidth = 0.04
      ctx.beginPath()
      ctx.moveTo(-4.3, -8.3)
      ctx.quadraticCurveTo(-3.6, -8.3, -3.2, floor)
      ctx.quadraticCurveTo(-2.55, -7.6, -1.95, floor)
      ctx.quadraticCurveTo(-1.55, -6.2, -1.15, floor)
      ctx.stroke()
    })
    for (const [x, y, sx, sy] of [[-4.3, -8.3, 1, 1], [-3.45, -6.3, 0.82, 1.22], [-3.2, floor, 1.35, 0.62], [-2.55, -7.25, 1, 1], [-1.95, floor, 1.3, 0.66]]) {
      const r = 0.33
      g.ink(YE, (ctx) => {
        ctx.beginPath()
        ctx.ellipse(x, y - r * sy, r * sx, r * sy, 0, 0, Math.PI * 2)
        ctx.fill()
      })
      g.ink(PU, (ctx) => {
        ctx.lineWidth = 0.05
        ctx.beginPath()
        ctx.ellipse(x, y - r * sy, r * sx, r * sy, 0, 0, Math.PI * 2)
        ctx.stroke()
      })
    }
    // right panel: a spring and two sticky notes
    g.text(PU, 'SPRING  k 180  c 12', 3.3, -9.35, { kind: 'mono', size: 0.28, tracking: 0.08 })
    spring(g, 3.3, -7.75, 3.0, 1.2)
    sticky(g, 4.05, -5.75, 2.0, -4, ['60 fps', 'or bust'])
    sticky(g, 6.75, -6.15, 2.0, 5, ['undo', 'x 9'])
    // two remote cursors from other tabs, pointing at the work: one rides the
    // spring, one grabs the easing curve's handle (its tag clear to the left)
    presence(g, 5.9, -8.1, 0.06, YE, YE, 'Brisk Bolt')
    presence(g, -6.43, -8.15, 0.06, PU, YE, 'Lunar Comet', -1)
  },
  back(g) {
    g.fill(AQ, BOARD_OUT, 0.32)
    g.fill(AQ, rectPts(-11, B.y1 - 0.4, 22, 6))
    g.text(PU, 'DAY 39 · A WHITEBOARD WITHOUT EDGES', 0, -9.4, { kind: 'mono', size: 0.3, align: 'center', tracking: 0.12 })
  },
}

// ------------------------------------------------------------ the pointer
// Day 15: a giant arrow pointer, its left edge on the crease so it stands
// flat and readable, with a comet of spring particles hooking round behind it
// on the other half, down to the base. It leans: half B tips toward the
// reader, as if the pointer were swooping out of the board.
const AR = { at: 14.6, glue: [50, 58], angle: [92, 84] }
const P_TIP = [0, -11.5]
const P_S = 0.53
const ARROW = pointer(P_TIP[0], P_TIP[1], P_S)

// the particle chain: a cubic hook from the pointer's flank round to the
// left and down to the base; ten beads spaced evenly, the leaders biggest
const TRAIL_C = [[-0.6, -6.3], [-4.8, -9.6], [-7.9, -4.0], [-3.1, -1.62]]
const TRAIL_PTS = cubic(TRAIL_C, 200)
const TRAIL_LEN = arcLen(TRAIL_PTS)
const R0 = 0.7
const R1 = 0.26
const trailR = (s) => lerp(R0, R1, s)
const TRAIL = (() => {
  const L = TRAIL_LEN[TRAIL_LEN.length - 1]
  const n = 10
  return Array.from({ length: n }, (_, i) => {
    const want = (L * i) / (n - 1)
    const j = TRAIL_LEN.findIndex((l) => l >= want - 1e-9)
    return [...TRAIL_PTS[j], trailR(i / (n - 1))]
  })
})()

/** The comet: one smooth tapered ribbon along the chain, m cm proud of the beads. */
function ribbon(ctx, m) {
  const L = TRAIL_LEN[TRAIL_LEN.length - 1]
  ctx.beginPath()
  TRAIL_PTS.forEach(([x, y], i) => {
    const r = trailR(TRAIL_LEN[i] / L) + m
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, Math.PI * 2)
  })
  // the tail runs on down into the base
  const [ex, ey] = TRAIL_PTS[TRAIL_PTS.length - 1]
  for (let k = 0; k <= 6; k++) {
    const y = ey + (0.7 * k) / 6
    ctx.moveTo(ex + R1 + m, y)
    ctx.arc(ex, y, R1 + m, 0, Math.PI * 2)
  }
}

const BURST = [-165, -140, -115, -90].map((a) => {
  const c = Math.cos(a * RAD)
  const s = Math.sin(a * RAD)
  return [[P_TIP[0] + c * 0.55, P_TIP[1] + s * 0.55], [P_TIP[0] + c * 1.45, P_TIP[1] + s * 1.45]]
})

// the base: a band of even height standing on both (leaning) glue lines
const BASE = { x0: -3.9, x1: 5.1, h: 1.3 }
const BASE_POLY = (() => {
  const bot = (x) => glueY(AR.angle, x)
  return [[BASE.x0, bot(BASE.x0)], [0, 0], [BASE.x1, bot(BASE.x1)], [BASE.x1, bot(BASE.x1) - BASE.h], [0, -BASE.h], [BASE.x0, bot(BASE.x0) - BASE.h]]
})()
const BASE_SLANT = -(90 - AR.angle[1]) // the B half's glue line, in degrees on the card

function drawArrowMask(ctx, m) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.lineWidth = m * 2
  pathOf(ctx, ARROW)
  ctx.fill()
  ctx.stroke()
  ribbon(ctx, m)
  ctx.fill()
  // the click burst, joined to the tip so it cuts as one piece
  ctx.lineWidth = 0.26 + m * 2
  for (const [, b] of BURST) {
    ctx.beginPath()
    ctx.moveTo(...P_TIP)
    ctx.lineTo(...b)
    ctx.stroke()
  }
  ctx.lineWidth = 0.5
  pathOf(ctx, BASE_POLY.map(([x, y]) => [x, y + 0.6 * (y > -0.9 ? 1 : 0)]))
  ctx.fill()
  ctx.stroke()
}

const arrow = {
  id: 'arrow',
  kind: 'vfold',
  on: 'gutter',
  at: AR.at,
  glue: AR.glue,
  angle: AR.angle,
  day: 15,
  outline: () =>
    footed(
      trace({ x0: -10, y0: -14, w: 19, h: 15 }, (ctx) => {
        drawArrowMask(ctx, 0.15)
        cutGlue(ctx, AR.angle)
      }),
      AR.angle,
    ),
  front(g) {
    // the comet's glow: a pale halftone ribbon, warm at the head, cool at the tail
    const head = TRAIL_PTS[0]
    const tail = TRAIL_PTS[TRAIL_PTS.length - 1]
    g.ink(YE, (ctx) => {
      const gr = ctx.createLinearGradient(head[0], head[1] - 2, tail[0], tail[1])
      gr.addColorStop(0, g.tone(0.2))
      gr.addColorStop(1, g.tone(0.03))
      ctx.fillStyle = gr
      ribbon(ctx, 0.15)
      ctx.fill()
    })
    g.ink(AQ, (ctx) => {
      const gr = ctx.createLinearGradient(head[0], head[1] - 2, tail[0], tail[1])
      gr.addColorStop(0, g.tone(0.02))
      gr.addColorStop(1, g.tone(0.16))
      ctx.fillStyle = gr
      ribbon(ctx, 0.15)
      ctx.fill()
    })
    // the chain's spring line
    g.ink(PU, (ctx) => {
      ctx.lineWidth = 0.045
      ctx.strokeStyle = g.tone(0.7)
      ctx.beginPath()
      TRAIL.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
      ctx.stroke()
    })
    // the particles run leader → tail from yellow, through lime tints, to
    // aqua; each with a white glint knocked out
    TRAIL.forEach(([x, y, r], i) => {
      const t = i / (TRAIL.length - 1)
      const disc = (ctx) => {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const ink of [PU, YE, AQ]) g.knock(ink, disc)
      g.circle(YE, x, y, r, 1 - t)
      g.circle(AQ, x, y, r, t)
      g.ink(PU, (ctx) => {
        ctx.lineWidth = 0.04
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
      })
      for (const ink of [YE, AQ]) {
        g.knock(ink, (ctx) => {
          ctx.beginPath()
          ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2)
          ctx.fill()
        })
      }
    })
    // click burst
    for (const [a, b] of BURST) g.stroke(YE, [a, b], 0.26)
    // the pointer: an aqua drop shadow, then solid purple printed clean
    g.fill(AQ, ARROW.map(([x, y]) => [x + 0.35, y + 0.3]))
    knockAll(g, [AQ, YE], ARROW)
    g.fill(PU, ARROW)
    // the base: day number on the trail's half, the name on the pointer's
    knockAll(g, [AQ, YE], BASE_POLY)
    g.fill(PU, BASE_POLY.map(([x, y]) => [x, y + (y > -1 ? 0.6 : 0)]))
    clean(g, PU, YE, '15', BASE.x0 / 2 - 0.05, -0.32, { kind: 'display', size: 0.86, align: 'center' })
    within(g, turn(0.42, -0.4, BASE_SLANT), () => {
      clean(g, PU, YE, 'MAGNETIC CURSOR', 0, 0, { kind: 'mono', size: 0.34, tracking: 0.08 })
    })
  },
  back(g) {
    // seen from behind: the same pointer and comet, as a soft shadow
    flood(g, AQ, 0.3)
    behind(g, () => {
      g.fill(PU, ARROW, 0.55)
      g.ink(YE, (ctx) => {
        ctx.fillStyle = g.tone(0.55)
        ribbon(ctx, 0)
        ctx.fill()
      })
      g.fill(PU, BASE_POLY.map(([x, y]) => [x, y + (y > -1 ? 0.6 : 0)]))
    })
    clean(g, PU, YE, 'follow the springs', behindX(g, 2.6), -0.42, { kind: 'serif', size: 0.4, italic: true, align: 'center' })
  },
}

// ------------------------------------------------------------- the chat
// Day 27: a cursor with a name tag and a chat bubble, on its own little card
// standing in front of the pointer, right of the crease.
const CT = { at: 17.9, glue: [56, 56], angle: [90, 90] }
const CT_BASE = { x0: -1.2, x1: 8.9, h: 0.62 }
const CT_CURSOR = { x: 4.0, y: -3.32, s: 0.1 }
const CT_TAG = rounded(4.4, -1.32, 1.45, 0.66, 0.33, 4)
const CT_BUBBLE = rounded(5.05, -5.1, 3.85, 2.0, 0.6, 4)
const CT_TAIL = [[5.55, -3.2], [6.35, -3.2], [5.12, -2.42]]
const CT_DOTS = rounded(6.95, -3.0, 1.75, 0.78, 0.39, 4)

function drawChatMask(ctx, m) {
  ctx.lineJoin = 'round'
  ctx.lineWidth = m * 2
  for (const shape of [pointer(CT_CURSOR.x, CT_CURSOR.y, CT_CURSOR.s), CT_TAG, CT_BUBBLE, CT_TAIL, CT_DOTS]) {
    pathOf(ctx, shape)
    ctx.fill()
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.roundRect(CT_BASE.x0, -CT_BASE.h, CT_BASE.x1 - CT_BASE.x0, CT_BASE.h + 0.5, [0.3, 0.3, 0, 0])
  ctx.fill()
}

const chat = {
  id: 'chat',
  kind: 'vfold',
  on: 'gutter',
  at: CT.at,
  glue: CT.glue,
  angle: CT.angle,
  day: 27,
  outline: () =>
    footed(
      trace({ x0: -2, y0: -5.8, w: 11.6, h: 6.4 }, (ctx) => {
        drawChatMask(ctx, 0.16)
        cutGlue(ctx, CT.angle)
      }),
    ),
  front(g) {
    // the base: a strip of the room's chrome
    g.fill(AQ, rectPts(CT_BASE.x0 - 1, -CT_BASE.h, CT_BASE.x1 - CT_BASE.x0 + 2, CT_BASE.h + 0.5), 0.35)
    g.text(PU, '27 · CURSOR CHAT', 0.35, -0.17, { kind: 'mono', size: 0.28, tracking: 0.1 })
    // the bubble and its tail
    g.fill(AQ, CT_BUBBLE)
    g.fill(AQ, CT_TAIL)
    clean(g, AQ, PU, 'wheee!', 6.97, -3.66, { kind: 'display', size: 0.9, align: 'center' })
    // someone else, typing, in a second bubble tucked under the first
    knockAll(g, [AQ], CT_DOTS)
    g.fill(YE, CT_DOTS)
    for (let i = 0; i < 3; i++) g.circle(PU, 7.42 + i * 0.4, -2.61, 0.11, i === 1 ? 1 : 0.55)
    // the cursor and its tag
    g.fill(PU, pointer(CT_CURSOR.x, CT_CURSOR.y, CT_CURSOR.s))
    knockAll(g, [AQ], CT_TAG)
    g.fill(YE, CT_TAG)
    clean(g, YE, PU, 'you', 5.12, -0.85, { kind: 'mono', size: 0.36, align: 'center' })
  },
  back(g) {
    flood(g, YE, 0.45)
    behind(g, () => g.fill(AQ, CT_BUBBLE, 0.5))
    g.text(PU, 'someone is typing…', behindX(g, 3.6), -0.17, { kind: 'serif', size: 0.34, italic: true, align: 'center' })
  },
}

// ------------------------------------------------------------- the scroll
// Day 23: a paper scroll unrolled at the front of the stage, warm-tinted so it
// separates from the white board behind.
const SC = { half: 6.2, h: 3.4, roll: 1.25, rollH: 4.2 }
const rollX = (sx) => (sx < 0 ? -SC.half - SC.roll + 0.15 : SC.half - 0.15)
function drawScrollMask(ctx) {
  ctx.fillRect(-SC.half, -SC.h, SC.half * 2, SC.h + 0.5)
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.roundRect(rollX(sx), -SC.rollH, SC.roll, SC.rollH + 0.5, [0.6, 0.6, 0, 0])
    ctx.fill()
  }
}
const scroll = {
  id: 'scroll',
  kind: 'vfold',
  on: 'gutter',
  at: 21.4,
  glue: [57, 57],
  angle: [90, 90],
  day: 23,
  outline: () =>
    footed(
      trace({ x0: -8, y0: -4.6, w: 16, h: 5.2 }, (ctx) => {
        drawScrollMask(ctx)
        cutGlue(ctx, [90, 90])
      }),
    ),
  front(g) {
    // warm paper
    g.fill(YE, rectPts(-SC.half, -SC.h, SC.half * 2, SC.h), 0.3)
    // a reading-progress bar along the top edge
    const bar = 0.46
    g.fill(AQ, rectPts(-SC.half, -SC.h, SC.half * 2, bar), 0.45)
    g.knock(YE, (ctx) => ctx.fillRect(-SC.half, -SC.h, SC.half * 2, bar))
    g.fill(PU, rectPts(-SC.half, -SC.h, SC.half * 1.3, bar))
    clean(g, PU, YE, '23 · SCROLL STORY', -SC.half + 0.3, -SC.h + 0.33, { kind: 'mono', size: 0.26, tracking: 0.1 })
    // the words, one per half; a chevron sits on the crease itself
    const word = { kind: 'mono', size: 0.6, tracking: 0.14 }
    g.text(PU, 'SCROLL', -0.62, -1.25, { ...word, align: 'right' })
    g.text(PU, 'EXPLORE', 0.62, -1.25, word)
    g.stroke(PU, [[-0.34, -1.85], [0, -1.48], [0.34, -1.85]], 0.13)
    g.stroke(PU, [[-0.34, -1.4], [0, -1.03], [0.34, -1.4]], 0.13)
    for (const sx of [-1, 1]) {
      const x = rollX(sx)
      const roll = rectPts(x, -SC.rollH, SC.roll, SC.rollH)
      g.knock(YE, (ctx) => pathOf(ctx, roll) || ctx.fill())
      g.fill(AQ, roll)
      g.ramp(PU, roll, x, 0, x + SC.roll, 0, sx < 0 ? 0.05 : 0.6, sx < 0 ? 0.6 : 0.05)
      const cap = (ctx) => {
        ctx.beginPath()
        ctx.ellipse(x + SC.roll / 2, -SC.rollH + 0.32, SC.roll / 2 - 0.08, 0.26, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      g.knock(AQ, cap)
      g.knock(PU, cap)
      g.ink(YE, cap)
      // chevrons pointing down the page
      const cx = sx * 4.95
      for (const dy of [0, 0.45]) g.stroke(AQ, [[cx - 0.34, -1.95 + dy], [cx, -1.58 + dy], [cx + 0.34, -1.95 + dy]], 0.13)
    }
  },
  back(g) {
    flood(g, YE, 0.6)
    g.text(PU, 'day 23 · a story told by scrolling', 0, -1.2, { kind: 'serif', size: 0.42, italic: true, align: 'center' })
  },
}

// ------------------------------------------------- NovaDesk + toasts (page L)
// Day 31's landing page as a die-cut window. A pull-tab runs beneath it; as
// it slides, day 57's three toasts arrive in the window's slot at staggered
// speeds and settle into a fanned stack, newest in front.
const NV = { x: 1.2, y: 16.5, w: 9.4, h: 6.8 }
const SLOT = { x: 0.45, y: 0.92, w: 4.3, h: 2.5 }
const SLOT_HOLE = rounded(SLOT.x, SLOT.y, SLOT.w, SLOT.h, 0.2, 3)
const NV_OUT = (() => {
  // extra (collinear) points along the foot: harmless to the cutter, and
  // they keep simple painter's-order previews stacking the window on top
  const r = rounded(0, 0, NV.w, NV.h, 0.35, 3)
  const foot = Array.from({ length: 40 }, (_, i) => [NV.w - 0.35 - ((NV.w - 0.7) * (i + 1)) / 41, NV.h])
  return [...r.slice(0, 8), ...foot, ...r.slice(8)]
})()
const SL = { x: NV.x + SLOT.x, y: NV.y + SLOT.y } // slot top-left on the page
const TAB = { travel: 4.5, len: 11, h: 1.5, out: 1.7, y: NV.y + 3.75 }
const TAB_RUN = TAB.out + TAB.travel + NV.x + 0.35 // the part that can ever show
// layers on page L: the tab and the back toast share the first (they never
// overlap), then one per toast, then the window on top
const LIFT = (k) => 0.02 + 0.035 * (k + 0.5)

const toastTab = {
  id: 'toast',
  kind: 'slider',
  on: 'page:L',
  lift: LIFT(0),
  at: [-TAB.out, TAB.y],
  travel: [-TAB.travel, 0],
  outline: rounded(0, 0, TAB.len, TAB.h, 0.25, 3),
  front(g) {
    // everything that can slide into view is handle: purple, chevrons, PULL
    g.fill(PU, rounded(0, 0, TAB_RUN + 0.3, TAB.h, 0.25, 3))
    clean(g, PU, YE, 'PULL', 0.26, TAB.h / 2 + 0.15, { kind: 'mono', size: 0.4, tracking: 0.08 })
    for (let x = 1.75; x < TAB_RUN - 0.2; x += 0.62) {
      const strong = x < TAB.out + NV.x
      g.knock(PU, (ctx) => {
        ctx.lineWidth = 0.11
        ctx.beginPath()
        ctx.moveTo(x + 0.26, TAB.h / 2 - 0.3)
        ctx.lineTo(x, TAB.h / 2)
        ctx.lineTo(x + 0.26, TAB.h / 2 + 0.3)
        ctx.stroke()
      })
      g.stroke(YE, [[x + 0.26, TAB.h / 2 - 0.3], [x, TAB.h / 2], [x + 0.26, TAB.h / 2 + 0.3]], 0.11, strong ? 1 : 0.7)
    }
    // the rest stays under the window for good
    g.fill(AQ, rectPts(TAB_RUN + 0.3, 0, TAB.len, TAB.h), 0.15)
  },
  back(g) {
    g.fill(PU, rounded(0, 0, TAB.len, TAB.h, 0.25, 3), 0.2)
  },
}

// the toasts: real day-57 copy. Each settles at `fan` (cm from the slot's
// top-left) and arrives along `move` as the tab is pulled.
const TOASTS = [
  { id: 'toast3', eyebrow: 'CLOSING BELL', title: 'Visit remembered', w: 3.4, fan: [0.45, 0.12], move: [-5.05, -0.86], ink: AQ, tone: 0.5 },
  { id: 'toast2', eyebrow: 'COLLECTION', title: 'Object archived', w: 3.7, fan: [0.3, 0.55], move: [-4.75, -0.43], ink: AQ, tone: 0.85 },
  { id: 'toast1', eyebrow: 'FIELD NOTE', title: 'Annotation saved', w: 4.0, fan: [0.15, 0.98], move: [-4.4, 0], ink: YE, tone: 1 },
]
const TOAST_H = 1.42

const toasts = TOASTS.map((t, i) => {
  const shape = rounded(0, 0, t.w, TOAST_H, 0.24, 3)
  return {
    id: t.id,
    kind: 'flat',
    on: 'page:L',
    lift: LIFT(i),
    // rest = settled − move: tucked under the window, right of the slot
    at: [SL.x + t.fan[0] - t.move[0], SL.y + t.fan[1] - t.move[1]],
    drive: { by: 'toast', move: t.move },
    day: 57,
    outline: shape,
    front(g) {
      g.fill(t.ink, shape, t.tone)
      // the title rides the top edge: it is all a toast further back shows
      g.text(PU, t.title, 0.88, 0.37, { kind: 'serif', size: 0.33, weight: 700 })
      g.text(PU, t.eyebrow, 0.88, 0.82, { kind: 'mono', size: 0.26, tracking: 0.1 })
      // the glyph, and the countdown bar along the foot
      g.circle(PU, 0.47, 0.6, 0.26)
      g.knock(PU, (ctx) => {
        ctx.lineWidth = 0.08
        ctx.beginPath()
        ctx.moveTo(0.35, 0.6)
        ctx.lineTo(0.45, 0.71)
        ctx.lineTo(0.62, 0.49)
        ctx.stroke()
      })
      g.fill(PU, rectPts(0.24, TOAST_H - 0.3, (t.w - 0.48) * (t.ink === YE ? 0.72 : 0.4), 0.08))
      g.fill(PU, rectPts(0.24, TOAST_H - 0.3, t.w - 0.48, 0.08), 0.25)
    },
  }
})

const novadesk = {
  id: 'novadesk',
  kind: 'flat',
  on: 'page:L',
  lift: LIFT(TOASTS.length),
  at: [NV.x, NV.y],
  day: 31,
  outline: { outline: NV_OUT, holes: [SLOT_HOLE] },
  front(g) {
    // window chrome
    g.fill(PU, rounded(0, 0, NV.w, 0.75, 0.35, 3))
    g.fill(PU, rectPts(0, 0.4, NV.w, 0.35))
    ;[YE, AQ, YE].forEach((ink, i) => {
      g.knock(PU, (ctx) => {
        ctx.beginPath()
        ctx.arc(0.45 + i * 0.38, 0.38, 0.12, 0, Math.PI * 2)
        ctx.fill()
      })
      g.circle(ink, 0.45 + i * 0.38, 0.38, 0.12)
    })
    g.knock(PU, (ctx) => {
      pathOf(ctx, rounded(2.3, 0.14, 4.4, 0.48, 0.24, 3))
      ctx.fill()
    })
    g.fill(AQ, rounded(2.3, 0.14, 4.4, 0.48, 0.24, 3), 0.35)
    g.text(PU, 'novadesk.app', 4.5, 0.49, { kind: 'mono', size: 0.27, align: 'center' })
    // the screen; the toast slot sits top left, where notifications land
    g.fill(AQ, rectPts(0, 0.75, NV.w, NV.h - 0.75), 0.12)
    g.stroke(PU, SLOT_HOLE, 0.05, 1, true)
    // launch-health ring
    const [rx, ry] = [7.3, 2.05]
    g.ink(AQ, (ctx) => {
      ctx.lineWidth = 0.38
      ctx.strokeStyle = g.tone(0.45)
      ctx.beginPath()
      ctx.arc(rx, ry, 0.92, 0, Math.PI * 2)
      ctx.stroke()
    })
    g.ink(PU, (ctx) => {
      ctx.lineWidth = 0.38
      ctx.lineCap = 'butt'
      ctx.beginPath()
      ctx.arc(rx, ry, 0.92, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.86)
      ctx.stroke()
    })
    g.text(PU, '86', rx, ry + 0.21, { kind: 'display', size: 0.56, align: 'center' })
    g.text(PU, 'LAUNCH HEALTH', rx, ry + 1.5, { kind: 'mono', size: 0.26, align: 'center', tracking: 0.06 })
    // hero copy and the magnetic CTA
    g.text(PU, 'Run every launch from', 0.45, 4.32, { kind: 'serif', size: 0.47, weight: 700 })
    g.text(PU, 'one live command center.', 0.45, 4.9, { kind: 'serif', size: 0.47, weight: 700 })
    const cta = rounded(0.45, 5.3, 4.2, 0.74, 0.37, 4)
    g.knock(AQ, (ctx) => {
      pathOf(ctx, cta)
      ctx.fill()
    })
    g.fill(PU, cta)
    clean(g, PU, YE, 'Start your launch room', 2.55, 5.78, { kind: 'mono', size: 0.26, align: 'center' })
    g.fill(PU, pointer(4.85, 5.72, 0.055, -10))
    for (let i = 0; i < 3; i++) g.stroke(AQ, [[5.55 + i * 0.18, 5.37 + i * 0.26], [5.95 + i * 0.18, 5.37 + i * 0.26]], 0.06)
    g.text(PU, '31 · NOVADESK', NV.w - 0.4, NV.h - 0.32, { kind: 'mono', size: 0.26, align: 'right', tracking: 0.1 })
  },
  back(g) {
    g.fill(PU, NV_OUT, 0.2)
  },
}

// ------------------------------------------- the receipt and its cup (page R)
// Day 58: a year of coffee receipts. Lift the receipt like a book cover and
// the year stands up as one cup on its hinge: 250 dots, four cups a dot,
// poured in layers like the receipt's own lines.
const RC = { hx: 15.0, y: 14.5, len: 9.0, w: 4.7 }
const RC_OUT = (() => {
  // card x runs down the page along the hinge, card y toward the gutter;
  // the torn ends of the receipt are zigzags
  const pts = []
  const teeth = 9
  for (let i = 0; i <= teeth; i++) pts.push([i % 2 ? 0.16 : 0, (i / teeth) * RC.w])
  for (let i = teeth; i >= 0; i--) pts.push([RC.len - (i % 2 ? 0.16 : 0), (i / teeth) * RC.w])
  return pts.reverse()
})()
// page-oriented frames (lx, ly from the receipt's top-left as it reads):
// closed it lies over the gutter side of its hinge, open on the outer side
const RC_FRONT = [0, -1, 1, 0, 0, RC.w]
const RC_BACK = [0, 1, -1, 0, RC.len, 0]

// [name, cups, dots, inks] — bottom of the cup to the top
const DRINKS = [
  ['espresso', 227, 57, [PU]],
  ['decaf', 80, 20, [PU, AQ]],
  ['cappuccino', 150, 37, [YE, AQ]],
  ['filter', 263, 66, [AQ]],
  ['latte', 280, 70, [YE]],
]
const RECEIPT_ORDER = ['latte', 'filter', 'espresso', 'cappuccino', 'decaf']

const receipt = {
  id: 'receipt',
  kind: 'flap',
  on: 'page:R',
  at: [RC.hx, RC.y],
  rot: 90,
  outline: RC_OUT,
  front(g) {
    within(g, RC_FRONT, () => {
      const cx = RC.w / 2
      g.text(PU, 'ONE YEAR', cx, 1.1, { kind: 'mono', size: 0.38, align: 'center', tracking: 0.14 })
      g.text(PU, 'OF COFFEE', cx, 1.58, { kind: 'mono', size: 0.38, align: 'center', tracking: 0.14 })
      g.text(PU, 'receipt 58 · 2025', cx, 2.04, { kind: 'mono', size: 0.26, align: 'center' })
      const dash = (y) =>
        g.ink(PU, (ctx) => {
          ctx.setLineDash([0.1, 0.09])
          ctx.lineWidth = 0.03
          ctx.beginPath()
          ctx.moveTo(0.4, y)
          ctx.lineTo(RC.w - 0.4, y)
          ctx.stroke()
        })
      dash(2.35)
      RECEIPT_ORDER.forEach((name, i) => {
        const [, n, , inks] = DRINKS.find((d) => d[0] === name)
        const y = 2.92 + i * 0.46
        // each line keyed to its colour in the cup
        for (const ink of inks) g.circle(ink, 0.55, y - 0.09, 0.09)
        g.text(PU, name, 0.8, y, { kind: 'mono', size: 0.27 })
        g.text(PU, String(n), RC.w - 0.45, y, { kind: 'mono', size: 0.27, align: 'right' })
      })
      dash(5.12)
      g.text(PU, '1,000 cups', cx, 5.92, { kind: 'display', size: 0.64, align: 'center' })
      g.text(PU, 'TOTAL $4,006.50', cx, 6.38, { kind: 'mono', size: 0.26, align: 'center' })
      g.text(PU, 'PEAK 08:00 · MONDAYS', cx, 6.76, { kind: 'mono', size: 0.26, align: 'center' })
      g.ink(PU, (ctx) => {
        let x = 0.8
        let i = 0
        while (x < RC.w - 0.8) {
          const w = [0.04, 0.09, 0.05, 0.13][(i * 7) % 4]
          ctx.fillRect(x, 7.0, w, 0.6)
          x += w + [0.06, 0.1, 0.07][(i * 5) % 3]
          i++
        }
      })
      g.fill(YE, rounded(cx - 1.3, 7.9, 2.6, 0.46, 0.23, 3))
      g.text(PU, 'LIFT ME', cx, 8.24, { kind: 'mono', size: 0.28, align: 'center', tracking: 0.16 })
    })
  },
  back(g) {
    within(g, RC_BACK, () => {
      g.fill(AQ, rectPts(0, 0, RC.w, RC.len), 0.16)
      // the cup stands on the hinge (left) near the foot: the words keep to
      // the head and to the right-hand column, clear of it and its steam
      const rx = RC.w - 0.35
      g.text(PU, 'A year,', rx, 1.0, { kind: 'display', size: 0.6, align: 'right' })
      g.text(PU, 'held in', rx, 1.68, { kind: 'display', size: 0.6, align: 'right' })
      g.text(PU, 'one cup.', rx, 2.36, { kind: 'display', size: 0.6, align: 'right' })
      g.para(PU, 'a thousand receipts, one field of dots that never forgets which coffee it is', 2.85, 3.2, RC.w - 3.15, { size: 0.27, italic: true, leading: 0.36 })
    })
  },
}

// the cup: the year in five layers of dots (three inks and two overprints),
// standing up on the receipt's hinge
const CUP = { top: -4.6, bot: -0.7, rTop: 2.3, rBot: 1.62, sau: 3.25 }
const STEAM = [
  { x: -0.95, h: 2.3, sway: 0.34 },
  { x: 0.9, h: 2.75, sway: -0.34 },
]
function cupBody(ctx) {
  ctx.beginPath()
  ctx.moveTo(-CUP.rTop, CUP.top)
  ctx.lineTo(CUP.rTop, CUP.top)
  ctx.quadraticCurveTo(CUP.rTop, CUP.bot, CUP.rBot - 0.1, CUP.bot)
  ctx.lineTo(-CUP.rBot + 0.1, CUP.bot)
  ctx.quadraticCurveTo(-CUP.rTop, CUP.bot, -CUP.rTop, CUP.top)
  ctx.closePath()
}
/** Half-width of the cup's body at height y (follows cupBody's curve). */
function cupHalf(y) {
  const u = Math.min(1, Math.max(0, (y - CUP.top) / (CUP.bot - CUP.top)))
  const t = 1 - Math.sqrt(1 - u)
  return CUP.rTop - t * t * (CUP.rTop - CUP.rBot + 0.1)
}
function saucer(ctx) {
  ctx.beginPath()
  ctx.ellipse(0, -0.55, CUP.sau, 0.55, 0, Math.PI, Math.PI * 2)
  ctx.lineTo(CUP.sau, 0)
  ctx.lineTo(-CUP.sau, 0)
  ctx.closePath()
}
/** Two plumes of steam: wide, swaying, tapering bands. */
const PLUMES = STEAM.map(({ x, h, sway }) => {
  const pts = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24
    return [x + sway * Math.sin(t * Math.PI * 2), CUP.top + 0.3 - (h + 0.3) * t]
  })
  return band(pts, (t) => 0.46 * Math.pow(Math.sin(Math.PI * (0.25 + 0.75 * t)), 0.8) + 0.01)
})
function handle(ctx, w) {
  // round caps tuck the ends into the cup's wall, so it cuts as one piece
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(CUP.rTop - 0.12, -2.72, 1.05, 0.92, 0, -Math.PI / 2, Math.PI / 2)
  ctx.stroke()
}
function drawCupMask(ctx) {
  cupBody(ctx)
  ctx.fill()
  handle(ctx, 0.42)
  saucer(ctx)
  ctx.fill()
  for (const p of PLUMES) {
    pathOf(ctx, p)
    ctx.fill()
  }
}

/**
 * 250 dots on a hex lattice, packed bottom-up from just above the saucer,
 * coloured in the drinks' layers: one dot is four cups.
 */
const CUP_DOTS = (() => {
  const d = 0.23
  const dy = d * 0.87
  const dots = []
  for (let k = 0; dots.length < 250 && k < 40; k++) {
    const y = -1.3 - k * dy
    const half = cupHalf(y) - 0.2
    const shift = (k % 2) * 0.5
    const row = []
    for (let i = -20; i <= 20; i++) {
      const x = (i + shift) * d
      if (Math.abs(x) <= half) row.push([x, y])
    }
    // the last, partial row keeps to the middle
    row.sort((p, q) => Math.abs(p[0]) - Math.abs(q[0]))
    dots.push(...row.slice(0, 250 - dots.length).sort((p, q) => p[0] - q[0]))
  }
  const out = []
  let i = 0
  for (const [, , count, inks] of DRINKS) {
    for (let c = 0; c < count; c++, i++) out.push([...dots[i], inks])
  }
  return out
})()

const cup = {
  id: 'cup',
  kind: 'vfold',
  on: 'receipt',
  at: 6.85,
  glue: [52, 52],
  angle: [90, 90],
  day: 58,
  outline: () =>
    footed(
      trace({ x0: -4, y0: -8.2, w: 8, h: 8.7 }, (ctx) => {
        drawCupMask(ctx)
        cutGlue(ctx, [90, 90])
      }),
    ),
  front(g) {
    // steam: aqua halftone, fading as it rises
    for (const [i, p] of PLUMES.entries()) {
      const s = STEAM[i]
      g.ramp(AQ, p, 0, CUP.top, 0, CUP.top - s.h, 0.6, 0.2)
    }
    g.ink(PU, (ctx) => saucer(ctx) || ctx.fill())
    clean(g, PU, YE, '1 dot = 4 cups', 0, -0.2, { kind: 'mono', size: 0.3, align: 'center', tracking: 0.04 })
    for (const [x, y, inks] of CUP_DOTS) for (const ink of inks) g.circle(ink, x, y, 0.088)
    g.ink(PU, (ctx) => handle(ctx, 0.24))
    g.fill(PU, rectPts(-CUP.rTop, CUP.top, CUP.rTop * 2, 0.2))
    // the cup's wall, a fine line
    g.ink(PU, (ctx) => {
      ctx.lineWidth = 0.05
      cupBody(ctx)
      ctx.stroke()
    })
  },
  back(g) {
    flood(g, PU, 0.3)
    behind(g, () => g.ink(PU, (ctx) => saucer(ctx) || ctx.fill()))
    behind(g, () => {
      for (const p of PLUMES) g.fill(AQ, p, 0.4)
    })
  },
}

// ------------------------------------------------------------------ pages
const idx = dayIndex({ days: CH.days, side: 'R', x: 11.6, y: 2.2, width: 8.0, ink: PU, accent: AQ, size: 0.46, gap: 1.28 })

/**
 * Speed streaks, in spread cm (page L is x 0–20, page R is 20–40): they fan
 * out of the pointer's base at the gutter and trail away down page R, with
 * one hooking round under the particle comet on page L. Each is thick at
 * the pointer and tapers to a hair.
 */
const FAN = [20.15, 15.1] // the pointer's base, on the gutter
const STREAKS = [
  // [angle below the horizontal (deg), start and end distance from FAN, half-width, bow]
  [7, 1.6, 9.6, 0.2, -0.25],
  [21, 1.0, 10.2, 0.27, -0.4],
  [36, 2.0, 10.6, 0.24, -0.45],
  [50, 1.3, 10.4, 0.2, -0.35],
  [63, 2.4, 10.0, 0.17, -0.25],
]
  .map(([deg, s0, s1, w, bow]) => {
    const [c, n] = [Math.cos(deg * RAD), Math.sin(deg * RAD)]
    const pts = Array.from({ length: 41 }, (_, i) => {
      const t = i / 40
      const s = lerp(s0, s1, t)
      const k = bow * Math.sin(t * Math.PI) // a gentle swoosh
      return [FAN[0] + c * s - n * k, FAN[1] + n * s + c * k]
    })
    // a round head at the pointer's end, tapering to a hair
    return { poly: band(pts, (t) => w * Math.sqrt(Math.min(1, t * 9)) * Math.pow(1 - t, 0.85) + 0.012), a: pts[0], b: pts[40] }
  })
  .concat(
    // the comet's echo on page L: out from the gutter, round and up
    [[[19.4, 15.8], [14.6, 18.6], [11.6, 14.8], [15.0, 11.4]]].map((c) => {
      const pts = cubic(c, 48)
      return { poly: band(pts, (t) => 0.42 * Math.sqrt(Math.min(1, t * 9)) * Math.pow(1 - t, 0.85) + 0.012), a: c[0], b: c[3] }
    }),
  )

function streaks(g, side) {
  const off = side === 'L' ? 0 : -W
  const mine = STREAKS.filter((s) => (side === 'L' ? s.a[0] < 20 : s.a[0] > 20))
  const local = (pts) => pts.map(([x, y]) => [x + off, y])
  // the dot grid prints clean of them
  for (const s of mine) {
    g.knock(AQ, (ctx) => {
      pathOf(ctx, local(s.poly))
      ctx.fill()
    })
  }
  for (const s of mine) {
    const poly = local(s.poly)
    g.fill(YE, poly)
    // aqua comes in past the middle, so the tails overprint green
    const m = [lerp(s.a[0], s.b[0], 0.3) + off, lerp(s.a[1], s.b[1], 0.3)]
    g.ramp(AQ, poly, m[0], m[1], s.b[0] + off, s.b[1], 0, 0.8)
  }
}

function gridDots(g, x0, x1, y0, y1) {
  g.ink(AQ, (ctx) => {
    ctx.fillStyle = g.tone(0.4)
    for (let x = x0; x <= x1 + 1e-6; x += 0.8) {
      for (let y = y0; y <= y1 + 1e-6; y += 0.8) {
        ctx.beginPath()
        ctx.arc(x, y, 0.05, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

const PARA =
  'Eight days spent on the half-second between a hand moving and a page answering. A pointer that drags a comet of springs behind it, stories that unroll as you scroll, strangers’ cursors drifting over a shared whiteboard, toasts that slide in and settle, and a year of coffee that pours itself into one cup. Nothing here holds still, and all of it was tuned until it felt like it had weight.'

function pageL(g) {
  gridDots(g, 11.6, 19.6, 1.6, 24.8)
  streaks(g, 'L')
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', PU)
  // numeral and title; day 33's blend-mode cursor hovers over the M
  g.text(YE, CH.numeral, M.outer, 4.0, { kind: 'display', size: 1.9 })
  for (let i = 0; i < 4; i++) g.fill(AQ, rectPts(M.outer - 0.2 - i * 0.55, 5.5 + i * 0.32, 1.4 - i * 0.2, 0.1))
  const tx = M.outer + 0.9
  const title = { kind: 'display', size: 2.4 }
  g.text(PU, CH.title, tx, 6.7, title)
  const mw = g.measure('M', title)
  const [cx, cy] = [tx + mw * 0.52, 5.88]
  g.circle(AQ, cx, cy, 0.86)
  // the custom cursor that carries the disc, at its lower-right edge
  g.fill(PU, pointer(cx + 0.5, cy + 0.5, 0.05))
  g.text(PU, '33 · a custom cursor, mix-blend-mode', tx, 7.55, { kind: 'mono', size: 0.26 })
  g.para(PU, PARA, M.outer, 9.0, 9.4, { size: 0.4 })
  // under the window's slot, the empty state the toasts arrive over
  g.fill(AQ, rectPts(SL.x, SL.y, SLOT.w, SLOT.h), 0.12)
  g.text(PU, 'no new notifications', SL.x + SLOT.w / 2, SL.y + SLOT.h / 2 + 0.1, { kind: 'serif', size: 0.3, italic: true, align: 'center' })
  g.text(PU, '57 · pull the tab: three toasts slide in and stack', NV.x, NV.y + NV.h + 0.62, { kind: 'serif', size: 0.32, italic: true })
  folio(g, pl, 'L', PU)
}

function pageR(g) {
  gridDots(g, 0.4, 8.4, 1.6, 24.8)
  streaks(g, 'R')
  runningHead(g, 'eight days that would not sit still', 'R', PU)
  idx.paint(g)
  // under the receipt: the seven-cup Tuesday
  const ux = RC.hx - RC.w / 2 - 0.45
  g.text(PU, 'that one Tuesday', ux, RC.y + 1.0, { kind: 'serif', size: 0.34, italic: true, align: 'center' })
  for (let i = 0; i < 7; i++) g.circle(AQ, ux - 1.26 + i * 0.42, RC.y + 1.55, 0.15)
  g.text(PU, '7 CUPS · SEPT 16', ux, RC.y + 2.2, { kind: 'mono', size: 0.28, align: 'center', tracking: 0.06 })
  // where the receipt lands when it opens: a coffee ring and a hint
  const ox = RC.hx + RC.w / 2
  g.ink(PU, (ctx) => {
    ctx.strokeStyle = g.tone(0.3)
    ctx.lineWidth = 0.24
    ctx.beginPath()
    ctx.arc(ox, RC.y + 3.4, 1.5, 0.3, Math.PI * 1.85)
    ctx.stroke()
  })
  g.text(PU, 'lift the receipt', ox, RC.y + 6.2, { kind: 'serif', size: 0.32, italic: true, align: 'center' })
  folio(g, pr, 'R', PU)
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: pageL, R: pageR },
  pieces: [board, arrow, chat, scroll, toastTab, ...toasts, novadesk, receipt, cup],
  spots: [
    ...idx.spots,
    { day: 33, on: 'page:L', rect: [M.outer, 4.6, 7.5, 3.25] },
    // the "57 · pull the tab…" caption under the window (a tap on bare page turns it)
    { day: 57, on: 'page:L', rect: [NV.x - 0.1, NV.y + NV.h + 0.2, 6.25, 0.65] },
  ],
}
