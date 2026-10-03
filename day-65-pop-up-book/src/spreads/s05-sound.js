// Chapter V — Sound. A little concert made of card: the day-04 circular
// spectrum stands at the back as an LED meter, the day-62 Resonance blob
// slumps off-axis in front of it, and nearest the reader an upright piano
// (day 30) stands on a box platform with its falling notes lit above the keys.
// On the right page a Wavelength Records sleeve (day 50) holds a picture disc
// (day 24) under a tonearm: the reader spins it, a die-cut window in the
// sleeve shows which day is playing, and the 3D book plays music while it
// turns.

import { trace } from '../art/trace.js'
import { circle, rect, roundRect } from '../paper/polygon.js'
import { W } from '../paper/dims.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayById, dayIndex, folio, pad2, runningHead } from './furniture.js'

const CH = CHAPTERS[4]
const [pl, pr] = folios(5)
const O = 'orange'
const P = 'purple'
const K = 'black'
const DEG = Math.PI / 180
const TAU = Math.PI * 2

// a tiny deterministic hash for outlines (compile time, no g.rng there)
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const BIG = [[-30, -30], [30, -30], [30, 30], [-30, 30]]

/** One line of type straight into a ctx (for knocks and turned lines). */
function typeset(ctx, g, str, x, y, { kind = 'serif', size = 0.4, weight = 400, italic = false, align = 'left', tracking = 0, rotate = 0 } = {}) {
  const S = 100
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotate)
  ctx.scale(1 / S, 1 / S)
  ctx.font = g.font(kind, size * S, { weight, italic })
  const track = tracking * size * S
  const chars = [...str]
  const w = chars.reduce((t, ch) => t + ctx.measureText(ch).width + track, 0) - track
  let cx = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
  ctx.textAlign = 'left'
  for (const ch of chars) {
    ctx.fillText(ch, cx, 0)
    cx += ctx.measureText(ch).width + track
  }
  ctx.restore()
}

/**
 * Type set round a circle about the ctx origin, centred on `centreDeg`
 * (canvas degrees, y down). By default the glyphs stand on the circle with
 * their tops toward the centre, which reads upright at the bottom of a disc;
 * `top: true` turns them outward to read upright at the top. `halo` (cm)
 * fattens every glyph for a knock-out ring; `maxArc` (cm) shrinks to fit.
 */
function arcText(ctx, g, str, r, centreDeg, kind, size, opts = {}) {
  const S = 100
  const { weight = 400, italic = false, tracking = 0, halo = 0, maxArc = 0, top = false } = opts
  const chars = [...str]
  const setFont = (sz) => {
    ctx.font = g.font(kind, sz * S, { weight, italic })
    const track = tracking * sz * S
    const widths = chars.map((ch) => ctx.measureText(ch).width + track)
    return { widths, total: widths.reduce((a, b) => a + b, 0) - track }
  }
  ctx.save()
  let { widths, total } = setFont(size)
  if (maxArc && total / S > maxArc) ({ widths, total } = setFont((size * maxArc * S) / total))
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  ctx.lineWidth = halo * 2 * S
  const dir = top ? 1 : -1
  let theta = centreDeg * DEG - (dir * total) / S / 2 / r
  chars.forEach((ch, i) => {
    const w = widths[i] / S
    const mid = theta + (dir * w) / 2 / r
    ctx.save()
    ctx.translate(Math.cos(mid) * r, Math.sin(mid) * r)
    ctx.rotate(mid + (dir * Math.PI) / 2)
    ctx.scale(1 / S, 1 / S)
    if (halo) ctx.strokeText(ch, 0, 0)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    theta += (dir * w) / r
  })
  ctx.restore()
}

/** A Path2D through one or more closed loops. */
function loops(...polys) {
  const p = new Path2D()
  for (const pts of polys) {
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
    p.closePath()
  }
  return p
}

/**
 * Backs are painted as seen with the card flipped left-to-right about the
 * middle of its print box. This turns a back's ctx so shapes drawn in FRONT
 * coordinates land on the same paper (for anything that isn't symmetric).
 */
function flipX(g, ctx) {
  ctx.translate(g.box.x0 * 2 + g.box.w, 0)
  ctx.scale(-1, 1)
}

// --------------------------------------------------------------- outline kit
// A V-fold's card must run exactly along its glue lines. Draw the silhouette
// clipped above the glue lines, trace it, then snap the traced base onto them.
const vy = (x, beta) => (Math.abs(x) * -Math.cos(beta * DEG)) / Math.sin(beta * DEG)

function aboveGlue(ctx, beta, reach = 20) {
  ctx.beginPath()
  ctx.moveTo(-reach, vy(-reach, beta[0]))
  ctx.lineTo(0, 0)
  ctx.lineTo(reach, vy(reach, beta[1]))
  ctx.lineTo(reach, -30)
  ctx.lineTo(-reach, -30)
  ctx.closePath()
  ctx.clip()
}

function snapGlue(poly, beta) {
  return poly.map(([x, y]) => {
    if (Math.hypot(x, y) < 0.14) return [0, 0]
    const v = vy(x, x < 0 ? beta[0] : beta[1])
    return Math.abs(y - v) < 0.12 ? [x, v] : [x, y]
  })
}

function tracedVfold(box, beta, draw) {
  return () => {
    const t = trace(box, (ctx) => {
      ctx.save()
      aboveGlue(ctx, beta)
      draw(ctx)
      ctx.restore()
    }, { res: 30, tol: 0.02 })
    return snapGlue(t.outline, beta)
  }
}

// ======================================================= the spectrum (day 4)
// The day-04 visualiser: a ring of radial FFT bars, mirrored, built as an LED
// meter. Every bar is a whole number of lit segments with a purple peak cap;
// the bass (straight up) runs tall, the highs fall away round the sides, and
// a little jitter keeps the two halves from being a perfect mirror. It stands
// furthest back and leans away.
const SP = { at: 11, glue: [60, 60], angle: [100, 100], cy: -2.3, r0: 2.7, n: 32, w: 0.45, seg: 0.42, gap: 0.07 }
const SP_BASE = SP.r0 + 0.12 // where the first LED segment starts
// lit segments per bin, from the bass at the top round to the highs
const SP_BINS = [12, 13, 9, 11, 6, 8, 4, 6, 3, 5, 3, 4, 2, 3, 2, 2]
const spBars = Array.from({ length: SP.n }, (_, k) => {
  const phi = -Math.PI / 2 + ((k + 0.5) / SP.n) * TAU
  const mirror = Math.min(k, SP.n - 1 - k)
  let segs = SP_BINS[mirror] + (hash(k + 17) > 0.62 ? 1 : 0) - (hash(k + 41) > 0.7 ? 1 : 0)
  // keep the near-horizontal bars short: they'd lean into the title
  if (Math.abs(Math.sin(phi)) < 0.35) segs = Math.min(segs, 6)
  segs = Math.max(1, Math.min(13, segs))
  return { phi, segs, r1: SP_BASE + segs * SP.seg - SP.gap }
})
const SP_REACH = SP_BASE + 13 * SP.seg

function spectrumShape(ctx, { bars = true, disc = true } = {}) {
  if (disc) {
    ctx.beginPath()
    ctx.arc(0, SP.cy, SP.r0, 0, TAU)
    ctx.fill()
  }
  if (bars) {
    ctx.lineWidth = SP.w
    ctx.lineCap = 'butt'
    for (const b of spBars) {
      const c = Math.cos(b.phi)
      const s = Math.sin(b.phi)
      ctx.beginPath()
      ctx.moveTo(c * (SP.r0 - 0.2), SP.cy + s * (SP.r0 - 0.2))
      ctx.lineTo(c * b.r1, SP.cy + s * b.r1)
      ctx.stroke()
    }
  }
}

/** The dark rings between LED segments. */
function ledGaps(ctx) {
  ctx.lineWidth = SP.gap
  for (let i = 0; i <= 13; i++) {
    ctx.beginPath()
    ctx.arc(0, SP.cy, SP_BASE + i * SP.seg - SP.gap / 2, 0, TAU)
    ctx.stroke()
  }
}

/** Each bar's top segment. */
function peakCaps(ctx) {
  ctx.lineWidth = SP.w + 0.04
  ctx.lineCap = 'butt'
  for (const b of spBars) {
    const c = Math.cos(b.phi)
    const s = Math.sin(b.phi)
    const r0 = b.r1 - SP.seg + SP.gap
    ctx.beginPath()
    ctx.moveTo(c * r0, SP.cy + s * r0)
    ctx.lineTo(c * (b.r1 + 0.05), SP.cy + s * (b.r1 + 0.05))
    ctx.stroke()
  }
}

const PULSES = [SP.r0 - 0.35, SP.r0 - 0.9, SP.r0 - 1.45]
function pulses(ctx) {
  ctx.lineWidth = 0.1
  for (const r of PULSES) {
    ctx.beginPath()
    ctx.arc(0, SP.cy, r, 0, TAU)
    ctx.stroke()
  }
}

const spectrum = {
  id: 'spectrum',
  kind: 'vfold',
  on: 'gutter',
  day: 4,
  at: SP.at,
  glue: SP.glue,
  angle: SP.angle,
  outline: tracedVfold({ x0: -9, y0: SP.cy - SP_REACH - 0.4, w: 18, h: SP_REACH + 4 }, SP.angle, (ctx) => spectrumShape(ctx)),
  front(g) {
    // orange LEDs and core
    g.ink(O, (ctx) => spectrumShape(ctx))
    // purple peak caps, printed clean
    g.knock(O, peakCaps)
    g.ink(P, peakCaps)
    // beat pulses round the core, a purple heart
    const heart = (ctx) => {
      pulses(ctx)
      ctx.beginPath()
      ctx.arc(0, SP.cy, SP.r0 - 1.95, 0, TAU)
      ctx.fill()
    }
    g.knock(O, heart)
    g.ink(P, heart)
    // the segment gaps, down to card
    g.knock(O, ledGaps)
    g.knock(P, ledGaps)
  },
  back(g) {
    // the reverse of the meter: solid purple bars on white, a pale core
    g.ink(P, (ctx) => {
      flipX(g, ctx)
      spectrumShape(ctx, { disc: false })
    })
    g.knock(P, (ctx) => {
      flipX(g, ctx)
      ctx.beginPath()
      ctx.arc(0, SP.cy, SP.r0 + 0.05, 0, TAU)
      ctx.fill()
      ledGaps(ctx)
    })
    g.ink(O, (ctx) => {
      flipX(g, ctx)
      ctx.fillStyle = g.tone(0.3)
      ctx.beginPath()
      ctx.arc(0, SP.cy, SP.r0, 0, TAU)
      ctx.fill()
    })
    const cx = g.box.x0 * 2 + g.box.w
    g.circle(P, cx, SP.cy - 0.25, 1.55)
    g.knock(O, (ctx) => {
      ctx.beginPath()
      ctx.arc(cx, SP.cy - 0.25, 1.55, 0, TAU)
      ctx.fill()
    })
    const caption = (ctx) => {
      typeset(ctx, g, '04', cx, SP.cy - 0.12, { kind: 'display', size: 0.95, align: 'center' })
      typeset(ctx, g, 'DAY 04 · AUDIO VISUALIZER', cx, SP.cy + 0.42, { kind: 'mono', size: 0.2, align: 'center', tracking: 0.1 })
    }
    g.knock(P, caption)
  },
}

// ======================================================= the blob (day 62)
// Resonance: a soft body that swells with the bass (three slow lobes),
// ripples with the mids (contour lines) and prickles with the highs (a few
// bumps on its crown). Purple, rim-lit orange along the top by the spectrum
// behind it. Its glue lines splay unevenly, so it slumps off the axis.
const BL = { at: 13.3, glue: [58, 76], angle: [102, 84], cy: -3.45, R: 4.0 }
function blobR(phi, k = 1) {
  const up = Math.max(0, -Math.sin(phi))
  const down = Math.max(0, Math.sin(phi))
  const lobes = 0.1 * Math.sin(3 * phi + 0.4) + 0.05 * Math.sin(5 * phi - 1.3) + 0.03 * Math.sin(2 * phi + 2.4)
  const highs = up ** 2 * 0.15 * Math.abs(Math.cos(4.5 * (phi + Math.PI / 2))) ** 8
  const seat = 0.11 * down ** 3 // a settled, wider seat to glue down
  return BL.R * k * (1 + lobes + highs * k + seat)
}
function blobPath(k = 1, dx = 0, dy = 0) {
  const pts = []
  for (let i = 0; i < 240; i++) {
    const phi = (i / 240) * TAU
    const r = blobR(phi, k)
    pts.push([dx + Math.cos(phi) * r, BL.cy + dy + Math.sin(phi) * r])
  }
  return pts
}
const BLOB_OUT = blobPath()
const BLOB_RIM = blobPath(1, 0, 0.45) // the blob dropped: what's left is its lit crown
const RIPPLES = [[0.82, 0.075], [0.66, 0.065], [0.5, 0.055], [0.34, 0.045]]

const blob = {
  id: 'blob',
  kind: 'vfold',
  on: 'gutter',
  day: 62,
  at: BL.at,
  glue: BL.glue,
  angle: BL.angle,
  outline: tracedVfold({ x0: -5.4, y0: -9.6, w: 10.8, h: 10.2 }, BL.angle, (ctx) => ctx.fill(loops(BLOB_OUT))),
  front(g) {
    g.fill(P, BLOB_OUT)
    // rim light: an orange crescent along the crown, printed clean
    const crescent = (ctx) => {
      ctx.clip(loops(BLOB_OUT))
      ctx.fill(loops(BLOB_OUT, BLOB_RIM), 'evenodd')
    }
    g.knock(P, crescent)
    g.ink(O, crescent)
    // ripples: contour lines knocked to card
    const ripples = (ctx) => {
      for (const [k, w] of RIPPLES) {
        ctx.lineWidth = w
        ctx.stroke(g.path(blobPath(k, -1.4 * (1 - k), -1.6 * (1 - k))))
      }
    }
    g.knock(P, ripples)
    g.knock(O, ripples)
    // a sheen up where the lamp is
    const sheen = (ctx) => {
      ctx.beginPath()
      ctx.ellipse(-1.85, -5.9, 0.75, 0.36, -0.6, 0, TAU)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(-2.85, -5.05, 0.17, 0.13, -0.6, 0, TAU)
      ctx.fill()
    }
    g.knock(P, sheen)
    g.knock(O, sheen)
    // its name on the belly, on a purple band so the ripples don't cross it
    const band = (ctx) => ctx.fillRect(-2.6, -3.66, 5.2, 0.7)
    g.ink(P, band)
    g.knock(O, band)
    const label = (ctx) => typeset(ctx, g, 'RESONANCE · 62', 0, -3.12, { kind: 'mono', size: 0.36, align: 'center', tracking: 0.12 })
    g.knock(P, label)
  },
  back(g) {
    g.ink(P, (ctx) => {
      flipX(g, ctx)
      ctx.fillStyle = g.tone(0.42)
      ctx.fill(loops(BLOB_OUT))
      ctx.strokeStyle = g.tone(0.7)
      ctx.lineWidth = 0.06
      ctx.stroke(loops(blobPath(0.8, 0.44, 0.6)))
      ctx.stroke(loops(blobPath(0.6, 0.8, 1.0)))
    })
  },
}

// ======================================================= the piano (day 30)
// A box platform is the key bed; an upright cabinet stands on its crease.
const PI_ = { span: [19, 22], a: 4.8, b: 4.8, h: 2.5 }
const UP = { at: 20, glue: [84, 84], angle: [90, 90], w: 4.8, hgt: 3.0 }
const KEYS_Y = UP.at + 0.55 // front of the cabinet glue → keys run from here to the front
const pianoL = 2 * PI_.h + PI_.a + PI_.b
function pianoOutline() {
  const [y0, y1] = PI_.span
  const { h } = PI_
  const L = pianoL
  const e = 0.55 // leg width
  const c = 0.95 // case band
  return [
    [0, y0], [L, y0], [L, y0 + e], [L - (h - c), y0 + e], [L - (h - c), y1 - e], [L, y1 - e], [L, y1],
    [0, y1], [0, y1 - e], [h - c, y1 - e], [h - c, y0 + e], [0, y0 + e],
  ]
}
const WHITE_KEYS = 21
function keyboard(g, x0, x1, y0, y1) {
  const kw = (x1 - x0) / WHITE_KEYS
  // key slip felt, then the separators and the sharps
  g.fill(O, rect(x0, y0 - 0.16, x1 - x0, 0.16))
  g.ink(K, (ctx) => {
    ctx.lineWidth = 0.035
    for (let i = 1; i < WHITE_KEYS; i++) {
      ctx.beginPath()
      ctx.moveTo(x0 + i * kw, y0)
      ctx.lineTo(x0 + i * kw, y1)
      ctx.stroke()
    }
    const sharps = [1, 1, 0, 1, 1, 1, 0]
    for (let i = 0; i < WHITE_KEYS - 1; i++) {
      if (!sharps[i % 7]) continue
      ctx.fillRect(x0 + (i + 1) * kw - kw * 0.3, y0, kw * 0.6, (y1 - y0) * 0.6)
    }
  })
}

const piano = {
  id: 'piano',
  kind: 'box',
  on: 'gutter',
  day: 30,
  span: PI_.span,
  a: PI_.a,
  b: PI_.b,
  h: PI_.h,
  outline: pianoOutline(),
  front(g) {
    const [y0, y1] = PI_.span
    const { h } = PI_
    // sides: lacquer black, an orange pinstripe along the case
    g.fill(K, rect(0, y0, h, y1 - y0))
    g.fill(K, rect(pianoL - h, y0, h, y1 - y0))
    g.knock(K, (ctx) => {
      ctx.fillRect(h - 0.32, y0 + 0.2, 0.05, y1 - y0 - 0.4)
      ctx.fillRect(pianoL - h + 0.27, y0 + 0.2, 0.05, y1 - y0 - 0.4)
    })
    g.fill(O, rect(h - 0.32, y0 + 0.2, 0.05, y1 - y0 - 0.4))
    g.fill(O, rect(pianoL - h + 0.27, y0 + 0.2, 0.05, y1 - y0 - 0.4))
    // key bed behind the keys, under the cabinet
    g.fill(K, rect(h, y0, PI_.a + PI_.b, KEYS_Y - y0 - 0.16))
    // cheek blocks either end of the keyboard
    g.fill(K, rect(h, KEYS_Y - 0.16, 0.22, y1 - KEYS_Y + 0.16))
    g.fill(K, rect(h + PI_.a + PI_.b - 0.22, KEYS_Y - 0.16, 0.22, y1 - KEYS_Y + 0.16))
    keyboard(g, h + 0.22, h + PI_.a + PI_.b - 0.22, KEYS_Y, y1)
  },
  back(g) {
    g.fill(K, BIG, 0.85)
  },
}

// the upright cabinet with the day-30 falling-note visualiser over the keys
const UP_OUT = [
  [-UP.w, 0], [UP.w, 0], [UP.w, -UP.hgt], [UP.w + 0.22, -UP.hgt], [UP.w + 0.22, -UP.hgt - 0.38],
  [-UP.w - 0.22, -UP.hgt - 0.38], [-UP.w - 0.22, -UP.hgt], [-UP.w, -UP.hgt],
]
const NOTES = Array.from({ length: 15 }, (_, i) => ({
  key: Math.floor(hash(i * 7 + 1) * WHITE_KEYS),
  y: -0.55 - hash(i * 3 + 2) * 2.0,
  len: 0.3 + hash(i * 5 + 9) * 0.8,
  ink: hash(i * 11) > 0.45 ? O : P,
}))

const upright = {
  id: 'upright',
  kind: 'vfold',
  on: 'piano',
  day: 30,
  at: UP.at,
  glue: UP.glue,
  angle: UP.angle,
  outline: UP_OUT,
  front(g) {
    g.fill(K, UP_OUT)
    // the lit panel: a falling-note roll
    const px0 = -UP.w + 0.45
    const px1 = UP.w - 0.45
    const panel = rect(px0, -UP.hgt + 0.55, px1 - px0, UP.hgt - 0.85)
    g.knock(K, (ctx) => ctx.fill(g.path(panel)))
    g.ramp(P, panel, 0, -UP.hgt + 0.55, 0, -0.3, 0.05, 0.3)
    const kw = (px1 - px0) / WHITE_KEYS
    for (const n of NOTES) {
      const x = px0 + n.key * kw + kw * 0.12
      const top = Math.max(-UP.hgt + 0.6, n.y - n.len)
      const bot = Math.min(-0.36, n.y)
      if (bot - top < 0.12) continue
      if (n.ink === O) g.knock(P, (ctx) => ctx.fill(g.path(roundRect(x, top, kw * 0.76, bot - top, 0.08, 3))))
      g.fill(n.ink, roundRect(x, top, kw * 0.76, bot - top, 0.08, 3))
    }
    // the hit line where notes land
    g.fill(O, rect(px0, -0.36, px1 - px0, 0.06))
    const tag = (ctx) => typeset(ctx, g, 'PIANO STUDIO · 30', 0, -UP.hgt + 0.38, { kind: 'mono', size: 0.24, align: 'center', tracking: 0.16 })
    g.knock(K, tag)
    g.ink(O, tag)
  },
  back(g) {
    // the cabinet's back panel: two posts and a rail over the soundboard
    g.fill(K, BIG, 0.7)
    for (const x of [-UP.w * 0.5, UP.w * 0.5]) {
      g.fill(K, rect(x - 0.3, -UP.hgt - 0.4, 0.6, UP.hgt + 0.4))
      g.knock(K, (ctx) => ctx.fillRect(x - 0.3, -UP.hgt, 0.05, UP.hgt))
    }
    g.fill(K, rect(-UP.w - 0.3, -UP.hgt - 0.4, UP.w * 2 + 0.6, 0.5))
  },
}

// ============================================= the record and its sleeve
// The record is a wheel (the reader spins it); the sleeve is glued over its
// lower edge with a die-cut window that shows which day is "now playing".
// It's a picture disc: each day owns a 72° slice of the ring between r 2.45
// and 4.1, printed with that day's motif, so what shows above the sleeve is
// art rather than upside-down numbers.
// At rest the disc sits turned REC.turn, which lands track 1 under the window;
// each 72° clockwise brings on the next.
const REC = { at: [13.4, 14.1], r: 4.3, turn: -24 }
const RING = { r0: 2.45, r1: 4.1 }
const WIN = { r0: 2.4, r1: 4.12, half: 33 } // annular window, centred straight below the spindle
const PLAYLIST = [4, 24, 30, 50, 62]
const sectorAngle = (k) => 90 - REC.turn - 72 * k

// --- the motifs, drawn as if their slice sat at the bottom of the disc
// (centred on 90°, spanning 54°…126°, which is left-to-right 126° → 54°)
const pol = (r, deg) => [Math.cos(deg * DEG) * r, Math.sin(deg * DEG) * r]
function radial(ctx, deg, r0, r1) {
  ctx.beginPath()
  ctx.moveTo(...pol(r0, deg))
  ctx.lineTo(...pol(r1, deg))
  ctx.stroke()
}
function band(ctx, deg0, deg1, r0, r1) {
  ctx.beginPath()
  ctx.arc(0, 0, r1, deg0 * DEG, deg1 * DEG)
  ctx.arc(0, 0, r0, deg1 * DEG, deg0 * DEG, true)
  ctx.closePath()
  ctx.fill()
}

// bolder than they need to be: they print at riso resolution on a spinning disc
const TICKS = Array.from({ length: 12 }, (_, i) => ({
  deg: 56 + (68 * (i + 0.5)) / 12,
  len: 0.55 + 1.05 * (0.3 + 0.7 * Math.abs(Math.sin(i * 1.3 + 0.4))) * (0.65 + 0.35 * hash(i + 3)),
}))
const WAVEFORM = Array.from({ length: 16 }, (_, i) => ({
  deg: 109 - i * 3.4,
  a: 0.14 + 0.46 * Math.abs(Math.sin(i * 0.9) * 0.7 + (hash(i + 60) - 0.5) * 0.6),
}))
const FALLING = [
  [O, 121, 2.58, 2.98], [P, 113, 2.88, 3.3], [O, 104, 2.62, 3.3], [P, 96, 2.55, 2.85],
  [P, 84, 2.95, 3.3], [O, 76, 2.55, 3.1], [P, 69, 2.6, 2.9], [O, 62, 2.8, 3.3],
]

const MOTIF = {
  // 04 — radial FFT ticks with purple peak caps
  4: {
    o(ctx) {
      ctx.lineWidth = 0.21
      ctx.lineCap = 'butt'
      for (const t of TICKS) radial(ctx, t.deg, 2.5, 2.5 + t.len)
    },
    p(ctx) {
      ctx.lineWidth = 0.21
      ctx.lineCap = 'butt'
      for (const t of TICKS) radial(ctx, t.deg, 2.5 + t.len + 0.08, 2.5 + t.len + 0.32)
    },
  },
  // 24 — the player: a play button, then a waveform scrubbed part-way
  24: {
    o(ctx) {
      ctx.beginPath()
      ctx.arc(...pol(3.3, 117.5), 0.48, 0, TAU)
      ctx.fill()
      ctx.lineWidth = 0.15
      ctx.lineCap = 'round'
      for (const w of WAVEFORM) if (w.deg >= 89) radial(ctx, w.deg, 3.3 - w.a, 3.3 + w.a)
    },
    p(ctx) {
      ctx.lineWidth = 0.15
      ctx.lineCap = 'round'
      for (const w of WAVEFORM) if (w.deg < 89) radial(ctx, w.deg, 3.3 - w.a, 3.3 + w.a)
    },
    k(ctx) {
      // the play triangle, knocked back to black
      const [cx, cy] = pol(3.3, 117.5)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(27.5 * DEG)
      ctx.beginPath()
      ctx.moveTo(-0.14, -0.22)
      ctx.lineTo(0.24, 0)
      ctx.lineTo(-0.14, 0.22)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    },
  },
  // 30 — an arc of keys with notes falling onto them
  30: {
    o(ctx) {
      const n = 11
      for (let i = 0; i < n; i++) {
        const d0 = 55 + (70 * i) / n
        band(ctx, d0 + 0.4, d0 + 70 / n - 0.4, 3.42, 4.1)
      }
      ctx.lineWidth = 0.2
      ctx.lineCap = 'round'
      for (const [ink, deg, r0, r1] of FALLING) if (ink === O) radial(ctx, deg, r0, r1)
    },
    p(ctx) {
      ctx.lineWidth = 0.2
      ctx.lineCap = 'round'
      for (const [ink, deg, r0, r1] of FALLING) if (ink === P) radial(ctx, deg, r0, r1)
    },
    k(ctx) {
      // the sharps, in the twos and threes of a real keyboard
      const n = 11
      const sharps = [1, 1, 0, 1, 1, 1, 0]
      for (let i = 0; i < n - 1; i++) {
        if (!sharps[(i + 5) % 7]) continue
        const d = 55 + (70 * (i + 1)) / n
        band(ctx, d - 1.9, d + 1.9, 3.42, 3.84)
      }
    },
  },
  // 50 — Wavelength: sine stripes, each one tighter than the last
  50: {
    o(ctx) {
      wavy(ctx, [0, 2, 4])
    },
    p(ctx) {
      wavy(ctx, [1, 3])
    },
  },
  // 62 — Resonance: a lumpy blob, rim-lit, with rings going out
  62: {
    o(ctx) {
      ctx.lineWidth = 0.12
      for (const r of [1.1, 1.38]) {
        ctx.beginPath()
        ctx.arc(0, 3.28, r, 0, TAU)
        ctx.stroke()
      }
      // its lit crown
      ctx.save()
      ctx.clip(loops(miniBlob(0)))
      ctx.fill(loops(miniBlob(0), miniBlob(0.18)), 'evenodd')
      ctx.restore()
    },
    p(ctx) {
      ctx.save()
      ctx.clip(loops(miniBlob(0)))
      ctx.fill(loops(miniBlob(0.18)))
      ctx.restore()
    },
  },
}

function wavy(ctx, which) {
  ctx.lineWidth = 0.22
  for (const i of which) {
    const r = 2.6 + i * 0.36
    const f = 12 + i * 4
    ctx.beginPath()
    for (let d = 50; d <= 130; d += 0.5) {
      const rr = r + 0.08 * Math.sin(d * DEG * f)
      const [x, y] = pol(rr, d)
      if (d === 50) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

/** The day-62 blob in miniature, centred in its slice, dropped dy cm. */
function miniBlob(dy) {
  return Array.from({ length: 96 }, (_, i) => {
    const phi = (i / 96) * TAU
    const up = Math.max(0, -Math.sin(phi))
    const r = 0.84 * (1 + 0.1 * Math.sin(3 * phi + 0.4) + 0.06 * Math.sin(5 * phi - 1.3) + up ** 2 * 0.14 * Math.abs(Math.cos(4.5 * (phi + Math.PI / 2))) ** 8)
    return [Math.cos(phi) * r, 3.28 + dy + Math.sin(phi) * r]
  })
}

/** Run fn in slice k's frame, clipped to its slice of the ring. */
function inSlice(ctx, k, fn) {
  ctx.save()
  ctx.rotate((sectorAngle(k) - 90) * DEG)
  ctx.beginPath()
  ctx.arc(0, 0, RING.r1, 54 * DEG, 126 * DEG)
  ctx.arc(0, 0, RING.r0, 126 * DEG, 54 * DEG, true)
  ctx.closePath()
  ctx.clip()
  fn(ctx)
  ctx.restore()
}

const record = {
  id: 'record',
  kind: 'wheel',
  on: 'page:R',
  day: 24,
  at: REC.at,
  radius: REC.r,
  turn: REC.turn,
  front(g) {
    const R = REC.r
    g.circle(K, 0, 0, R)
    // grooves either side of the picture ring, and a sheen on the inner ones
    g.knock(K, (ctx) => {
      ctx.lineWidth = 0.025
      for (let r = 1.75; r < R - 0.08; r += 0.17) {
        if (r > RING.r0 - 0.08 && r < RING.r1 + 0.04) continue
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, TAU)
        ctx.stroke()
      }
      ctx.fillStyle = g.tone(0.3)
      for (const a of [-2.25, 0.9]) {
        ctx.beginPath()
        ctx.arc(0, 0, RING.r0 - 0.06, a, a + 0.42)
        ctx.arc(0, 0, 1.6, a + 0.42, a, true)
        ctx.closePath()
        ctx.fill()
      }
    })
    // the picture ring: each motif knocks the black, then prints clean
    PLAYLIST.forEach((n, k) => {
      const m = MOTIF[n]
      const both = (ctx) => {
        m.o?.(ctx)
        m.p?.(ctx)
      }
      g.knock(K, (ctx) => inSlice(ctx, k, both))
      g.ink(O, (ctx) => inSlice(ctx, k, m.o))
      if (m.p) {
        g.knock(O, (ctx) => inSlice(ctx, k, m.p))
        g.ink(P, (ctx) => inSlice(ctx, k, m.p))
      }
      if (m.k) {
        g.knock(O, (ctx) => inSlice(ctx, k, m.k))
        g.knock(P, (ctx) => inSlice(ctx, k, m.k))
        g.ink(K, (ctx) => inSlice(ctx, k, m.k))
      }
    })
    // hairline track gaps between the slices
    const gaps = (ctx) => {
      ctx.lineWidth = 0.045
      PLAYLIST.forEach((_, k) => radial(ctx, sectorAngle(k) + 36, RING.r0 - 0.05, RING.r1 + 0.05))
    }
    g.knock(K, gaps)
    g.knock(O, gaps)
    g.knock(P, gaps)
    // track titles: an orange numeral and a card-white name, each on a black halo
    PLAYLIST.forEach((n, k) => {
      const a = sectorAngle(k)
      const d = dayById.get(n)
      const num = (halo) => (ctx) => arcText(ctx, g, pad2(n), 3.02, a, 'display', 0.7, { halo })
      const name = (halo) => (ctx) => arcText(ctx, g, d.short, 3.76, a, 'serif', 0.38, { weight: 600, halo, maxArc: 3.5 })
      const halo = (ctx) => {
        num(0.11)(ctx)
        name(0.09)(ctx)
      }
      g.knock(O, halo)
      g.knock(P, halo)
      g.ink(K, halo)
      g.knock(K, num(0))
      g.ink(O, num(0))
      g.knock(K, name(0))
    })
    // the label, set upright for the record at rest
    const upright = (fn) => (ctx) => {
      ctx.rotate(-REC.turn * DEG)
      fn(ctx)
    }
    g.knock(K, (ctx) => {
      ctx.beginPath()
      ctx.arc(0, 0, 1.55, 0, TAU)
      ctx.fill()
    })
    g.circle(O, 0, 0, 1.55)
    g.ink(P, upright((ctx) => {
      arcText(ctx, g, 'SIXTY-FIVE · SIDE A', 1.22, -90, 'mono', 0.17, { tracking: 0.1, top: true })
      arcText(ctx, g, '33⅓ RPM', 1.36, 90, 'mono', 0.15, { tracking: 0.1 })
      typeset(ctx, g, '24', 0, 0.06, { kind: 'display', size: 0.66, align: 'center' })
      typeset(ctx, g, 'Music Player', 0, 0.62, { kind: 'serif', size: 0.24, italic: true, align: 'center' })
    }))
    const hole = (ctx) => {
      ctx.beginPath()
      ctx.arc(0, 0, 0.13, 0, TAU)
      ctx.fill()
    }
    g.knock(O, hole)
    g.knock(P, hole)
  },
  back(g) {
    g.circle(K, 0, 0, REC.r, 0.8)
  },
}

// the day-24 player's tonearm, resting on the outer groove at two o'clock
const ARM = { pivot: [18.4, 9.35], stylus: [REC.at[0] + Math.cos(-32 * DEG) * 3.95, REC.at[1] + Math.sin(-32 * DEG) * 3.95] }
const armV = [ARM.stylus[0] - ARM.pivot[0], ARM.stylus[1] - ARM.pivot[1]]
const armL = Math.hypot(...armV)
const armU = [armV[0] / armL, armV[1] / armL]
const armAng = Math.atan2(armU[1], armU[0])
const HEAD = { back: 0.62, ang: armAng + 24 * DEG } // the headshell kinks in toward the spindle
const headAt = [armV[0] - Math.cos(HEAD.ang) * 0.18, armV[1] - Math.sin(HEAD.ang) * 0.18]
const elbow = [headAt[0] - Math.cos(HEAD.ang) * HEAD.back, headAt[1] - Math.sin(HEAD.ang) * HEAD.back]

function armShape(ctx, part = 'all') {
  if (part === 'all' || part === 'black') {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // the tube, from behind the pivot to the headshell
    ctx.lineWidth = 0.2
    ctx.beginPath()
    ctx.moveTo(-armU[0] * 0.9, -armU[1] * 0.9)
    ctx.lineTo(...elbow)
    ctx.lineTo(...headAt)
    ctx.stroke()
    // the pivot
    ctx.beginPath()
    ctx.arc(0, 0, 0.62, 0, TAU)
    ctx.fill()
    // the headshell, and its finger lift
    ctx.save()
    ctx.translate(...headAt)
    ctx.rotate(HEAD.ang)
    ctx.beginPath()
    ctx.roundRect(-0.36, -0.21, 0.66, 0.42, 0.08)
    ctx.fill()
    ctx.lineWidth = 0.09
    ctx.beginPath()
    ctx.moveTo(-0.15, 0.18)
    ctx.lineTo(-0.05, 0.5)
    ctx.stroke()
    ctx.restore()
  }
  if (part === 'all' || part === 'weight') {
    ctx.save()
    ctx.rotate(armAng)
    ctx.beginPath()
    ctx.roundRect(-1.62, -0.34, 0.82, 0.68, 0.14)
    ctx.fill()
    ctx.restore()
  }
}
const ARM_BOX = { x0: -3.2, y0: -2.2, w: 5.4, h: 6.2 }

const tonearm = {
  id: 'tonearm',
  kind: 'flat',
  on: 'page:R',
  day: 24,
  at: ARM.pivot,
  rot: 0,
  outline: () => trace(ARM_BOX, (ctx) => armShape(ctx, 'all'), { res: 40, tol: 0.015 }),
  front(g) {
    g.ink(K, (ctx) => armShape(ctx, 'black'))
    // the pivot's bearing, and a highlight down the tube
    g.knock(K, (ctx) => {
      ctx.lineWidth = 0.05
      ctx.beginPath()
      ctx.arc(0, 0, 0.36, 0, TAU)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, 0.1, 0, TAU)
      ctx.fill()
    })
    g.ink(O, (ctx) => armShape(ctx, 'weight'))
    g.knock(K, (ctx) => armShape(ctx, 'weight'))
    // grooves round the counterweight
    g.knock(O, (ctx) => {
      ctx.rotate(armAng)
      ctx.fillRect(-1.38, -0.4, 0.05, 0.8)
      ctx.fillRect(-1.22, -0.4, 0.05, 0.8)
    })
    // the cartridge's front edge
    g.ink(O, (ctx) => {
      ctx.translate(...headAt)
      ctx.rotate(HEAD.ang)
      ctx.fillRect(0.12, -0.21, 0.08, 0.42)
    })
  },
  back(g) {
    g.ink(K, (ctx) => {
      flipX(g, ctx)
      ctx.fillStyle = g.tone(0.6)
      armShape(ctx, 'all')
    })
  },
}

// sleeve card space: origin at its top-left corner, turned SL.rot° clockwise
const SL = { at: [9.05, 15.85], size: 8.7, rot: -2.5 }
function toSleeve([px, py]) {
  const t = -SL.rot * DEG
  const dx = px - SL.at[0]
  const dy = py - SL.at[1]
  return [dx * Math.cos(t) - dy * Math.sin(t), dx * Math.sin(t) + dy * Math.cos(t)]
}
function windowPage() {
  const pts = []
  const n = 16
  for (let i = 0; i <= n; i++) {
    const a = (90 - WIN.half + (2 * WIN.half * i) / n) * DEG
    pts.push([REC.at[0] + Math.cos(a) * WIN.r1, REC.at[1] + Math.sin(a) * WIN.r1])
  }
  for (let i = n; i >= 0; i--) {
    const a = (90 - WIN.half + (2 * WIN.half * i) / n) * DEG
    pts.push([REC.at[0] + Math.cos(a) * WIN.r0, REC.at[1] + Math.sin(a) * WIN.r0])
  }
  return pts
}
const SL_WINDOW = windowPage().map(toSleeve)
const SL_OUT = roundRect(0, 0, SL.size, SL.size, 0.12, 2)

function sines(ctx, s) {
  ctx.lineWidth = 0.34
  for (let i = 0; i < 5; i++) {
    const y = 3.95 + i * 0.6
    const period = 3.4 - i * 0.55
    ctx.beginPath()
    for (let x = -0.2; x <= s + 0.2; x += 0.05) {
      const yy = y + Math.sin((x / period) * TAU) * 0.22
      if (x <= -0.2) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  }
}

const sleeve = {
  id: 'sleeve',
  kind: 'flat',
  on: 'page:R',
  day: 50,
  at: SL.at,
  rot: SL.rot,
  outline: SL_OUT,
  holes: [SL_WINDOW],
  front(g) {
    const s = SL.size
    g.fill(P, SL_OUT)
    // the wavelength: stripes of sine, each one shorter in period
    g.knock(P, (ctx) => sines(ctx, s))
    g.ink(O, (ctx) => sines(ctx, s))
    // a cream frame round the window, NOW PLAYING arched beneath it
    g.knock(P, (ctx) => {
      ctx.lineWidth = 0.32
      ctx.stroke(g.path(SL_WINDOW))
    })
    const c = toSleeve(REC.at)
    g.knock(P, (ctx) => {
      ctx.translate(...c)
      arcText(ctx, g, 'NOW PLAYING', WIN.r1 + 0.58, 90 - SL.rot, 'mono', 0.3, { tracking: 0.2 })
    })
    // the shop's mark
    g.knock(P, (ctx) => {
      ctx.font = g.font('display', 150)
      ctx.translate(0.45, s - 0.45)
      ctx.scale(0.01, 0.01)
      ctx.fillText('50', 0, 0)
    })
    g.text(O, '50', 0.45, s - 0.45, { kind: 'display', size: 1.5 })
    g.knock(P, (ctx) => {
      typeset(ctx, g, 'WAVELENGTH', s - 0.45, s - 1.1, { kind: 'mono', size: 0.36, align: 'right', tracking: 0.16 })
      typeset(ctx, g, 'RECORDS · DAY 50', s - 0.45, s - 0.55, { kind: 'mono', size: 0.26, align: 'right', tracking: 0.16 })
    })
  },
  back(g) {
    g.fill(P, BIG, 0.2)
  },
}

// ================================================================== pages
const idx = dayIndex({ days: CH.days, side: 'L', x: M.outer, y: 18.3, width: 9.4, ink: K, accent: O })

// the floor: a pool of stage light under the pop-ups, sound rippling out
// from the blob, and the shadow under the piano. `sx` maps a distance from
// the spine to this page's x.
function floor(g, side) {
  const sx = (u) => (side === 'L' ? W - u : u)
  const cx = sx(0)
  g.glow(O, circle(cx, 14.6, 8.5, 96), cx, 14.6, 8.5, 0.55, 0)
  g.ink(P, (ctx) => {
    ctx.lineWidth = 0.07
    ;[4.2, 5.5, 6.8, 8.1].forEach((r, i) => {
      ctx.strokeStyle = g.tone(0.75 - i * 0.14)
      ctx.beginPath()
      ctx.arc(cx, BL.at + 0.3, r, 0, TAU)
      ctx.stroke()
    })
  })
  // contact shadow under the blob (it slumps a little toward page R), clean purple
  const shadow = (ctx) => {
    ctx.beginPath()
    ctx.ellipse(side === 'L' ? W + 0.5 : 0.5, BL.at + 0.7, 2.9, 0.9, 0, 0, TAU)
    ctx.fill()
  }
  g.knock(O, shadow)
  g.ink(P, (ctx) => {
    ctx.fillStyle = g.tone(0.45)
    shadow(ctx)
  })
  // under the piano: dark, with its pedals
  const [y0, y1] = PI_.span
  const under = rect(Math.min(sx(0), sx(PI_.a)), y0, PI_.a, y1 - y0)
  g.knock(O, (ctx) => ctx.fill(g.path(under)))
  g.knock(P, (ctx) => ctx.fill(g.path(under)))
  g.fill(K, under, 0.8)
  for (const u of [-0.75, 0, 0.75]) {
    const x = side === 'L' ? W + u : u
    const pedal = (ctx) => {
      ctx.beginPath()
      ctx.ellipse(x, y1 - 0.75, 0.18, 0.32, 0, 0, TAU)
      ctx.fill()
    }
    g.knock(K, pedal)
    g.ink(O, pedal)
  }
}

function pageL(g) {
  floor(g, 'L')
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', K)
  // the numeral, with an off-register purple shadow
  const x = M.outer
  g.text(P, 'V', x + 0.16, 7.36, { kind: 'display', size: 5.4 })
  g.knock(P, (ctx) => {
    ctx.font = g.font('display', 540)
    ctx.translate(x, 7.2)
    ctx.scale(0.01, 0.01)
    ctx.fillText('V', 0, 0)
  })
  g.text(O, 'V', x, 7.2, { kind: 'display', size: 5.4 })
  g.text(K, 'CHAPTER FIVE', x + 4.5, 3.6, { kind: 'mono', size: 0.28, tracking: 0.2 })
  g.text(P, 'Sound', x + 4.4, 6.9, { kind: 'display', size: 2.1 })
  g.text(P, 'five days that wanted to be heard', x + 0.05, 8.6, { kind: 'serif', size: 0.5, italic: true, weight: 500 })
  g.fill(P, rect(x, 9.1, 9.2, 0.07))
  g.para(
    K,
    'Five of the sixty-four days were built to be listened to. A spectrum that breathes in a ring, a player that spins its own vinyl, a piano that remembers what you played, a record shop whose covers slide between pages, and a blob that swells with the bass.',
    x,
    10.2,
    9.3,
    { size: 0.4, leading: 0.56 },
  )
  equaliser(g, x, 16.75, 8.3, 2.4)
  g.text(K, 'SIDE A', x, 17.6, { kind: 'mono', size: 0.28, tracking: 0.24 })
  g.fill(O, rect(x + 1.55, 17.5, 7.6, 0.06))
  idx.paint(g)
  folio(g, pl, 'L', K)
}

// bass-heavy, like most of what these five days played
const EQ_LEVELS = [0.55, 0.82, 0.97, 0.74, 0.5, 0.63, 0.88, 0.6, 0.4, 0.55, 0.72, 0.46, 0.32, 0.44, 0.27, 0.18]

// a strip of LED equaliser columns, lit from the bottom, a peak cap held above
function equaliser(g, x0, base, width, height) {
  const cols = 16
  const seg = 0.26
  const rows = Math.floor(height / seg)
  const cw = width / cols
  for (let i = 0; i < cols; i++) {
    const level = EQ_LEVELS[i % EQ_LEVELS.length]
    const lit = Math.max(2, Math.min(rows - 2, Math.round(level * rows)))
    for (let r = 0; r < lit; r++) {
      const y = base - (r + 1) * seg
      g.fill(r < lit * 0.62 ? O : P, rect(x0 + i * cw, y + 0.05, cw - 0.12, seg - 0.08))
    }
    const peak = Math.min(rows - 1, lit + (hash(i + 90) > 0.5 ? 1 : 0))
    g.fill(K, rect(x0 + i * cw, base - (peak + 1) * seg + 0.09, cw - 0.12, 0.06))
  }
}

// the day-24 player, printed: a waveform scrubber with its transport
const WAVE = { x0: 10.3, x1: 18.5, y: 4.5, n: 46, played: 0.38 }
function player(g) {
  const { x0, x1, y, n } = WAVE
  const step = (x1 - x0) / n
  g.text(K, 'SIDE A · 5 TRACKS', x0, 2.3, { kind: 'mono', size: 0.24, tracking: 0.16, tone: 0.85 })
  for (let i = 0; i < n; i++) {
    const t = i / n
    const amp = 0.18 + 0.95 * Math.abs(Math.sin(i * 0.55) * 0.6 + Math.sin(i * 1.7 + 1) * 0.3 + (hash(i + 40) - 0.5) * 0.5)
    const ink = t < WAVE.played ? O : P
    g.fill(ink, roundRect(x0 + i * step, y - amp, step * 0.62, amp * 2, step * 0.3, 2), t < WAVE.played ? 1 : 0.55)
  }
  const hx = x0 + (x1 - x0) * WAVE.played
  g.fill(K, rect(hx - 0.02, y - 1.35, 0.04, 2.7))
  g.circle(K, hx, y - 1.35, 0.12)
  g.text(K, '1:24', x0, y + 1.75, { kind: 'mono', size: 0.26 })
  g.text(K, '3:41', x1, y + 1.75, { kind: 'mono', size: 0.26, align: 'right' })
  // transport: back, play, forward
  const cx = (x0 + x1) / 2
  const ty = y + 2.95
  g.circle(K, cx, ty, 0.5)
  g.knock(K, (ctx) => ctx.fill(g.path([[cx - 0.15, ty - 0.24], [cx + 0.25, ty], [cx - 0.15, ty + 0.24]])))
  for (const dir of [-1, 1]) {
    const bx = cx + dir * 1.45
    g.fill(K, [[bx - dir * 0.2, ty - 0.2], [bx + dir * 0.12, ty], [bx - dir * 0.2, ty + 0.2]])
    g.fill(K, rect(bx + dir * 0.12 - 0.03, ty - 0.2, 0.06, 0.4))
  }
}

// the call to action, beside the rim where the hand goes, with a ↻ arrow
const CUE = { r: REC.r + 0.42, from: -166, to: -118 }
function cue(g) {
  const [rx, ry] = REC.at
  g.ink(K, (ctx) => {
    ctx.translate(rx, ry)
    ctx.lineWidth = 0.075
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 0, CUE.r, CUE.from * DEG, CUE.to * DEG)
    ctx.stroke()
    // the head, pointing clockwise along the rim
    const t = CUE.to * DEG
    const [px, py] = [Math.cos(t) * CUE.r, Math.sin(t) * CUE.r]
    const tx = -Math.sin(t)
    const ty = Math.cos(t)
    const nx = Math.cos(t)
    const ny = Math.sin(t)
    ctx.beginPath()
    ctx.moveTo(px + tx * 0.34, py + ty * 0.34)
    ctx.lineTo(px + nx * 0.2 - tx * 0.04, py + ny * 0.2 - ty * 0.04)
    ctx.lineTo(px - nx * 0.2 - tx * 0.04, py - ny * 0.2 - ty * 0.04)
    ctx.closePath()
    ctx.fill()
  })
  const opts = { kind: 'serif', size: 0.38, italic: true }
  const x = 10.55
  g.text(K, 'Give the record a spin:', x, 9.35, { ...opts, align: 'right' })
  g.text(K, 'the book plays along.', x, 9.88, { ...opts, align: 'right' })
}

function pageR(g) {
  floor(g, 'R')
  runningHead(g, 'days 04 · 24 · 30 · 50 · 62', 'R', K)
  player(g)
  cue(g)
  folio(g, pr, 'R', K)
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: pageL, R: pageR },
  pieces: [spectrum, blob, piano, upright, record, tonearm, sleeve],
  spots: [...idx.spots, { day: 24, on: 'page:R', rect: [WAVE.x0 - 0.2, 1.8, WAVE.x1 - WAVE.x0 + 0.4, 6.4] }],
}
