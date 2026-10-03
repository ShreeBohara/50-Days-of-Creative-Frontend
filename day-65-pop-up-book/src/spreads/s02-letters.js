// Chapter II — Letterforms. A night terminal for type.
//
// Across the gutter: a skyline of falling glyphs (Matrix Rain) leans back as
// the backdrop and decodes a hidden NO SPOON; in front of it a giant
// specimen "Aa" stands on a composing stick (Typeforge); a small amber CRT
// boots in the foreground between the two sorts (Retro Terminal, with an
// ASCII metaball on its glass for ASCII Everything); and a sine-wave ribbon
// of kinetic type runs along the front (Kinetic Type Lab).
// On the left page a split-flap departure board flips through all seven days
// when the reader pulls its red tab (Split-Flap Board), and a red train rides
// a slot along the route map below, one station per flip. On the right, a
// black card of loose particles lifts and swings open, and the particles
// stand up as the word "hello" on its hinge (Particle Text), above the
// timetable.

import { makeCanvas } from '../art/riso.js'
import { makeRng } from '../art/rng.js'
import { trace } from '../art/trace.js'
import { H, W } from '../paper/dims.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayById, folio, pad2, runningHead } from './furniture.js'

const CH = CHAPTERS[1]
const [pl, pr] = folios(2)
const K = 'black'
const R = 'red'
const S = 'sunflower'

// ------------------------------------------------------------------ helpers

const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
]
const BIG = rect(-30, -30, 60, 60)

/** One glyph inside an ink callback (canvas type misbehaves below ~1px). */
function glyph(ctx, g, ch, x, y, size, { kind = 'mono', align = 'center', mirror = false, weight = 400, italic = false } = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(mirror ? -0.01 : 0.01, 0.01)
  ctx.font = g.font(kind, size * 100, { weight, italic })
  ctx.textAlign = align
  ctx.fillText(ch, 0, 0)
  ctx.restore()
}

/** Lay out a line of type exactly as g.text does, inside an ink callback. */
function setText(ctx, g, str, x, y, { kind = 'serif', size = 0.5, weight = 400, italic = false, align = 'left', tracking = 0 } = {}) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(0.01, 0.01)
  ctx.font = g.font(kind, size * 100, { weight, italic })
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const track = tracking * size * 100
  const chars = [...str]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const w = track ? widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1) : ctx.measureText(str).width
  let start = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
  if (!track) ctx.fillText(str, start, 0)
  else
    chars.forEach((c, i) => {
      ctx.fillText(c, start, 0)
      start += widths[i] + track
    })
  ctx.restore()
}

/** Type printed clean on a black ground: knock the black out, then ink it. */
function textOnBlack(g, ink, str, x, y, opts = {}) {
  g.knock(K, (ctx) => setText(ctx, g, str, x, y, opts))
  g.ink(ink, (ctx) => {
    ctx.fillStyle = g.tone(opts.tone ?? 1)
    setText(ctx, g, str, x, y, opts)
  })
}

/**
 * Ink a shape built with free compositing (a difference, an intersection):
 * draw(ctx) runs on a private canvas over `box` at the print's resolution,
 * and its coverage is laid into the ink.
 */
function maskInk(g, ink, box, draw) {
  const c = makeCanvas(Math.ceil(box.w * g.res), Math.ceil(box.h * g.res))
  const m = c.getContext('2d')
  m.setTransform(g.res, 0, 0, g.res, -box.x0 * g.res, -box.y0 * g.res)
  m.fillStyle = '#000'
  m.strokeStyle = '#000'
  draw(m)
  g.ink(ink, (ctx) => ctx.drawImage(c, box.x0, box.y0, c.width / g.res, c.height / g.res))
}

/** n points strictly between a and b: extra cutter-path vertices on a straight edge. */
const between = (a, b, n) => Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * (i + 1)) / (n + 1), a[1] + ((b[1] - a[1]) * (i + 1)) / (n + 1)])

const GLYPHS = '0123456789ABCDEFHJKLMNPRSTUVXZ$#%&*+=<>?/|{}'

// ======================================================= backdrop: the rain
// A comb of glyph columns joined at the foot, so it reads as a skyline of
// falling code. 17 columns; the middle one carries the crease.

const RAIN = { n: 17, w: 1.04, gap: 0.12, base: -2.6 }
const RAIN_H = [4.5, 6.1, 5.3, 7.4, 6.5, 8.6, 7.6, 9.8, 10.6, 9.3, 10.2, 8.0, 9.0, 6.9, 7.7, 5.7, 4.8]
const RAIN_X0 = (-RAIN.n * RAIN.w) / 2
const MSG = 'NO SPOON'
const MSG_COL0 = 4
const MSG_Y = -5.1

function rainOutline() {
  const { n, w, gap, base } = RAIN
  const pts = [[RAIN_X0, 4]]
  for (let i = 0; i < n; i++) {
    const a = RAIN_X0 + i * w
    const b = a + w
    const l = i === 0 ? a : a + gap / 2
    const r = i === n - 1 ? b : b - gap / 2
    if (i > 0) pts.push([l, base])
    pts.push([l, -RAIN_H[i]], [r, -RAIN_H[i]])
    if (i < n - 1) pts.push([r, base])
  }
  pts.push([RAIN_X0 + n * w, 4])
  return pts
}
const RAIN_POLY = rainOutline()

/** The streams: per column, a bright head with a fading trail above it. */
function rainStreams() {
  const rng = makeRng(606)
  const out = []
  const pitch = 0.6
  for (let i = 0; i < RAIN.n; i++) {
    const cx = RAIN_X0 + (i + 0.5) * RAIN.w
    const top = -RAIN_H[i] + 0.55
    const rows = []
    for (let y = 2.2; y > top; y -= pitch) rows.push(y)
    // one or two streams per column
    const heads = [rng.int(Math.floor(rows.length * 0.25), rows.length - 1)]
    if (rows.length > 12 && rng.chance(0.6)) heads.push(rng.int(2, Math.floor(rows.length * 0.4)))
    rows.forEach((y, r) => {
      if (i >= MSG_COL0 && i < MSG_COL0 + MSG.length && Math.abs(y - MSG_Y) < 0.45) return
      let f = 0
      let head = false
      for (const h of heads) {
        const d = r - h // trail rows sit above (higher r) the head
        if (d === 0) head = true
        else if (d > 0 && d < 9) f = Math.max(f, 1 - d / 9)
      }
      const dim = 0.22 // the faint glyphs behind every stream
      out.push({ x: cx, y, ch: rng.pick(GLYPHS.split('')), mirror: rng.chance(0.4), head, f: head ? 1 : Math.max(f, dim) })
    })
  }
  return out
}
const STREAMS = rainStreams()

const rain = {
  id: 'rain',
  kind: 'vfold',
  on: 'gutter',
  day: 6,
  at: 10.6,
  glue: [62, 62],
  angle: [102, 102],
  outline: RAIN_POLY,
  front(g) {
    g.fill(K, BIG)
    // glyphs: knocked out of the black, sunflower in proportion to the trail
    g.knock(K, (ctx) => {
      for (const s of STREAMS) {
        ctx.fillStyle = g.tone(s.head ? 1 : Math.min(1, 0.3 + 1.1 * s.f))
        glyph(ctx, g, s.ch, s.x, s.y + 0.06, 0.58, { mirror: s.mirror })
      }
    })
    g.ink(S, (ctx) => {
      for (const s of STREAMS) {
        if (s.head) continue
        ctx.fillStyle = g.tone(Math.min(1, 0.2 + 1.0 * s.f))
        glyph(ctx, g, s.ch, s.x, s.y + 0.06, 0.58, { mirror: s.mirror })
      }
    })
    // heads: paper-white glyphs, the brightest thing in each stream
    const heads = (ctx) => {
      for (const s of STREAMS) if (s.head) glyph(ctx, g, s.ch, s.x, s.y + 0.06, 0.58, { mirror: s.mirror })
    }
    g.knock(K, heads)
    g.knock(S, heads)
    // the decoded message: red cells, paper letters
    const cells = []
    for (let k = 0; k < MSG.length; k++) {
      if (MSG[k] === ' ') continue
      const cx = RAIN_X0 + (MSG_COL0 + k + 0.5) * RAIN.w
      cells.push({ cx, ch: MSG[k] })
    }
    g.knock(K, (ctx) => {
      for (const c of cells) ctx.fillRect(c.cx - 0.44, MSG_Y - 0.5, 0.88, 0.7)
    })
    g.ink(R, (ctx) => {
      for (const c of cells) ctx.fillRect(c.cx - 0.44, MSG_Y - 0.5, 0.88, 0.7)
    })
    g.knock(R, (ctx) => {
      for (const c of cells) glyph(ctx, g, c.ch, c.cx, MSG_Y + 0.02, 0.62, { kind: 'mono' })
    })
    // a sunflower tide line along the foot
    g.ramp(S, BIG, 0, 2.2, 0, -1.2, 0.7, 0)
  },
  back(g) {
    g.fill(K, BIG, 0.78)
    g.ink(S, (ctx) => {
      ctx.fillStyle = g.tone(0.5)
      for (const s of STREAMS) if (s.f > 0.5) glyph(ctx, g, s.ch, -s.x, s.y, 0.4)
    })
  },
}

// ===================================================== middle: the specimen
// A giant "Aa" standing on a composing stick, with the specimen guides
// (cap height, x-height, baseline) running through it.

const AA_BOX = { x0: -10.4, y0: -9.2, w: 19.0, h: 9.9 }
const AA_SIZE = 8.2
const STICK = 1.15
const BASELINE = -STICK
// the two sorts stand apart, so the terminal can sit between them and both
// letters still read whole from the reader's seat
const A_RIGHT = -2.5
const a_LEFT = 2.6
const STICK_X = [-9.5, 7.7]
// Caprasimo's own x-height and cap height (measured from the rendered x and
// H), for the guides: the a's bowl overshoots the x-line, as it should
const X_LINE = BASELINE + 0.05 - AA_SIZE * 0.5
const CAP_LINE = BASELINE + 0.05 - AA_SIZE * 0.674
function drawAa(ctx, dx = 0, dy = 0, stroke = 0, strokeOnly = false) {
  // set at 100× and scaled down: a font of a few px is hinted off its
  // baseline by skia, and the sorts must stand exactly on the stick
  const Z = 100
  ctx.save()
  ctx.translate(dx, dy + BASELINE + 0.05)
  ctx.scale(1 / Z, 1 / Z)
  ctx.font = `${AA_SIZE * Z}px "Caprasimo"`
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke * Z
  ctx.textAlign = 'right'
  if (stroke) ctx.strokeText('A', A_RIGHT * Z, 0)
  if (!strokeOnly) ctx.fillText('A', A_RIGHT * Z, 0)
  ctx.textAlign = 'left'
  if (stroke) ctx.strokeText('a', a_LEFT * Z, 0)
  if (!strokeOnly) ctx.fillText('a', a_LEFT * Z, 0)
  ctx.restore()
}
const SHADOW = [0.32, 0.24]
const stickPoly = () => rect(STICK_X[0], -STICK, STICK_X[1] - STICK_X[0], STICK + 0.6)
// The flat preview sorts cards by their vertex centroids. Extra cutter-path
// vertices along the stick's top edge, low and by the crease, keep the big
// specimen sorted behind the terminal that stands in front of it.
const AA_STICK_PTS = 60
let aaCache = null
function aaOutline() {
  if (aaCache) return aaCache
  const t = trace(AA_BOX, (ctx) => {
    drawAa(ctx, 0, 0, 0.7)
    drawAa(ctx, SHADOW[0], SHADOW[1], 0.7)
    ctx.beginPath()
    ctx.roundRect(STICK_X[0], -STICK - 0.05, STICK_X[1] - STICK_X[0], STICK + 0.6, 0.25)
    ctx.fill()
  })
  const top = -STICK - 0.05
  const onTop = (p) => Math.abs(p[1] - top) < 0.04
  const outline = t.outline.flatMap((a, i) => {
    const b = t.outline[(i + 1) % t.outline.length]
    // the straight run of the stick's top edge between the sorts, across the crease
    return onTop(a) && onTop(b) && Math.min(a[0], b[0]) < -0.5 && Math.max(a[0], b[0]) > 0.5 ? [a, ...between(a, b, AA_STICK_PTS)] : [a]
  })
  aaCache = { ...t, outline }
  return aaCache
}

/** 'cap' and 'x' set in black on the letters, under each guide's outer end. */
function specimenLabels(g) {
  const lab = { kind: 'mono', size: 0.28, tracking: 0.04 }
  g.text(K, 'cap', A_RIGHT - AA_SIZE * 0.585, CAP_LINE + 0.4, lab)
  g.text(K, 'x', A_RIGHT - AA_SIZE * 0.585, X_LINE + 0.4, lab)
}

const specimen = {
  id: 'specimen',
  kind: 'vfold',
  on: 'gutter',
  day: 41,
  at: 13.3,
  glue: [50, 50],
  angle: [90, 90],
  outline: () => aaOutline(),
  front(g) {
    // the sort: the whole die-cut card is solid sunflower, a crisp border
    // round each letter; then the black offset shadow, then the red face
    g.fill(S, BIG)
    g.ink(K, (ctx) => drawAa(ctx, SHADOW[0], SHADOW[1]))
    g.knock(K, (ctx) => drawAa(ctx))
    g.knock(S, (ctx) => drawAa(ctx))
    // (a trap: the sunflower reaches 0.04 cm under the red, so the plates'
    // wander prints a hair of orange at the edge, never a paper gap)
    g.ink(S, (ctx) => drawAa(ctx, 0, 0, 0.08, true))
    g.ink(R, (ctx) => drawAa(ctx))
    // the specimen guides: orange (red and sunflower together) across the
    // sort's border, sunflower printed clean where they cross the letters
    // (ink callbacks are called as fn(ctx, kit): the width is bound here)
    const rules = (w) => (ctx) => {
      ctx.lineWidth = w
      ctx.lineCap = 'butt'
      for (const y of [X_LINE, CAP_LINE]) {
        ctx.beginPath()
        ctx.moveTo(-11, y)
        ctx.lineTo(11, y)
        ctx.stroke()
      }
    }
    g.ink(S, rules(0.08))
    g.knock(R, rules(0.05)) // (narrower: trapped, no paper fringe)
    maskInk(g, R, AA_BOX, (ctx) => {
      rules(0.08)(ctx)
      ctx.globalCompositeOperation = 'destination-out'
      drawAa(ctx)
    })
    specimenLabels(g)
    // the composing stick: a black bar with a ruler and a weight axis
    g.knock(S, (ctx) => ctx.fill(g.path(stickPoly())))
    g.fill(K, stickPoly())
    g.knock(K, (ctx) => {
      ctx.lineWidth = 0.035
      for (let x = STICK_X[0] + 0.3, k = 0; x <= STICK_X[1] - 0.2; x += 0.4, k++) {
        ctx.beginPath()
        ctx.moveTo(x, -STICK)
        ctx.lineTo(x, -STICK + (k % 5 === 0 ? 0.32 : 0.16))
        ctx.stroke()
      }
    })
    textOnBlack(g, S, 'TYPEFORGE · 41', STICK_X[0] + 0.35, -0.24, { kind: 'mono', size: 0.3, tracking: 0.12 })
    const axis = (ctx) => {
      ctx.fillRect(3.75, -0.37, 2.45, 0.07)
      ctx.beginPath()
      ctx.arc(5.75, -0.335, 0.15, 0, Math.PI * 2)
      ctx.fill()
    }
    g.knock(K, axis)
    g.ink(S, axis)
    textOnBlack(g, S, 'wght', 2.9, -0.24, { kind: 'mono', size: 0.28 })
    textOnBlack(g, S, '800', STICK_X[1] - 0.3, -0.24, { kind: 'mono', size: 0.28, align: 'right' })
  },
  back(g) {
    g.fill(R, BIG, 0.5)
    g.ink(K, (ctx) => {
      ctx.scale(-1, 1)
      ctx.globalAlpha = 0.3
      drawAa(ctx)
    })
    g.ink(K, (ctx) => {
      ctx.scale(-1, 1)
      ctx.fill(g.path(stickPoly()))
    })
    textOnBlack(g, S, 'a specimen, standing', 0, -0.32, { kind: 'serif', size: 0.4, italic: true, align: 'center' })
  },
}

// ========================================================= foreground: CRT
// Drawn at 0.78 of its first size, so the glass faces the reader from between
// the two sorts instead of hiding them.

const CK = 0.78
const CRT_BOX = { x0: -4.3 * CK, y0: -7.2 * CK, w: 8.6 * CK, h: 7.7 * CK }
const BODY = { x: -3.75 * CK, y: -6.85 * CK, w: 7.5 * CK, h: 5.3 * CK, r: 0.9 * CK }
const STEM = { x: -1.2 * CK, y: -1.75 * CK, w: 2.4 * CK, h: 1.0 * CK }
const FOOT = { x: -2.9 * CK, y: -0.9 * CK, w: 5.8 * CK, h: 1.4 * CK, r: 0.3 * CK }
const SCREEN = { x: -3.05 * CK, y: -6.25 * CK, w: 6.1 * CK, h: 3.95 * CK, r: 0.6 * CK }
const CHIN = BODY.y + BODY.h // the case's lower edge
function crtShape(ctx) {
  ctx.beginPath()
  ctx.roundRect(BODY.x, BODY.y, BODY.w, BODY.h, BODY.r)
  ctx.fill()
  ctx.fillRect(STEM.x, STEM.y, STEM.w, STEM.h)
  ctx.beginPath()
  ctx.roundRect(FOOT.x, FOOT.y, FOOT.w, FOOT.h, FOOT.r)
  ctx.fill()
}
let crtCache = null
const crtOutline = () => (crtCache ??= trace(CRT_BOX, crtShape))

// the boot log: three lines of big phosphor type down the left of the glass
const BOOT = ['TERM/14', '> ascii', '> hello_']
const BOOT_X = SCREEN.x + 0.3
const BOOT_Y = SCREEN.y + 0.66
const BOOT_PITCH = 0.74
const BOOT_SIZE = 0.42
// an ASCII metaball (day 47) on a coarse grid down the right of the glass
const RAMP = ' .:-=+*#%@'
const ASCII_SIZE = 0.36
function asciiCells() {
  const out = []
  const cols = 8
  const rows = 6
  const x0 = 0.32
  const y0 = SCREEN.y + 0.42
  const px = 0.255
  const py = 0.335
  const blobs = [
    [0.95, -3.95, 0.62],
    [1.62, -3.25, 0.5],
  ]
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * px
      const y = y0 + r * py
      let f = 0
      for (const [bx, by, br] of blobs) f += br / Math.max(0.05, Math.hypot(x - bx, (y - by) * 0.9))
      const v = Math.max(0, Math.min(RAMP.length - 1, Math.floor((f - 0.62) * 5.2)))
      if (v > 0) out.push({ ch: RAMP[v], x, y })
    }
  }
  return out
}
const ASCII = asciiCells()

const crt = {
  id: 'crt',
  kind: 'vfold',
  on: 'gutter',
  day: 14,
  at: 16.7,
  glue: [64, 64],
  angle: [90, 90],
  outline: () => crtOutline(),
  front(g) {
    const scr = new Path2D()
    scr.roundRect(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, SCREEN.r)
    const foot = rect(FOOT.x, FOOT.y, FOOT.w, FOOT.h)
    // a solid sunflower case with a black keyline round the cut
    g.fill(S, BIG)
    g.stroke(K, crtOutline().outline, 0.16, 1, true)
    // the glass: solid black, the phosphor knocked out of it in sunflower
    g.knock(S, (ctx) => ctx.fill(scr))
    g.fill(K, scr)
    const phosphor = (ctx) => {
      BOOT.forEach((s, i) => setText(ctx, g, s, BOOT_X, BOOT_Y + i * BOOT_PITCH, { kind: 'mono', size: BOOT_SIZE }))
      for (const a of ASCII) glyph(ctx, g, a.ch, a.x, a.y + ASCII_SIZE * 0.32, ASCII_SIZE)
      setText(ctx, g, 'ASCII · 47', SCREEN.x + SCREEN.w - 0.24, SCREEN.y + SCREEN.h - 0.28, { kind: 'mono', size: 0.28, align: 'right' })
    }
    g.knock(K, phosphor)
    g.ink(S, phosphor)
    // scanlines: thin paper lines knocked out of the phosphor
    g.knock(S, (ctx) => {
      ctx.save()
      ctx.clip(scr)
      for (let y = SCREEN.y + 0.05; y < SCREEN.y + SCREEN.h; y += 0.13) ctx.fillRect(SCREEN.x, y, SCREEN.w, 0.035)
      ctx.restore()
    })
    // the chin: vents and a red power light
    g.ink(K, (ctx) => {
      for (let i = 0; i < 5; i++) ctx.fillRect(SCREEN.x + 0.1 + i * 0.25, CHIN - 0.43, 0.12, 0.26)
    })
    const led = (ctx) => {
      ctx.beginPath()
      ctx.arc(SCREEN.x + SCREEN.w - 0.1, CHIN - 0.3, 0.11, 0, Math.PI * 2)
      ctx.fill()
    }
    g.knock(S, led)
    g.ink(R, led)
    // the foot: solid red, the name in black
    g.knock(S, (ctx) => ctx.fill(g.path(foot)))
    g.fill(R, foot)
    g.text(K, 'RETRO TERMINAL · 14', 0, -0.2, { kind: 'mono', size: 0.28, align: 'center', tracking: 0.06 })
  },
  back(g) {
    g.fill(S, BIG)
    g.stroke(K, crtOutline().outline, 0.16, 1, true)
    g.ink(K, (ctx) => {
      for (let i = 0; i < 9; i++) ctx.fillRect(-1.95 + i * 0.47, -4.5, 0.17, 1.9)
    })
    g.knock(S, (ctx) => ctx.fill(g.path(rect(FOOT.x, FOOT.y, FOOT.w, FOOT.h))))
    g.fill(R, rect(FOOT.x, FOOT.y, FOOT.w, FOOT.h))
  },
}

// ===================================================== front: the sine wave

const WAVE_TEXT = 'KINETIC TYPE LAB'
const waveTop = (x) => -(1.95 + 0.6 * Math.sin((x / 4.6) * Math.PI * 2 + 0.6))
function waveOutline() {
  const pts = [[-7.3, 0.4]]
  for (let x = -7.3; x <= 7.31; x += 0.25) pts.push([x, waveTop(x)])
  pts.push([7.3, 0.4])
  return pts
}
const WAVE_POLY = waveOutline()

const wave = {
  id: 'wave',
  kind: 'vfold',
  on: 'gutter',
  day: 46,
  at: 19.7,
  glue: [64, 64],
  angle: [90, 90],
  outline: WAVE_POLY,
  front(g) {
    g.fill(R, BIG)
    g.ink(S, (ctx) => {
      ctx.lineWidth = 0.09
      ctx.beginPath()
      for (let x = -7.3; x <= 7.3; x += 0.1) {
        const y = waveTop(x) + 0.32
        if (x === -7.3) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
    // letters ride the wave, swelling where it crests
    const n = WAVE_TEXT.length
    const items = []
    for (let i = 0; i < n; i++) {
      const x = -6.5 + (13 * (i + 0.5)) / n
      const top = waveTop(x)
      const slope = (waveTop(x + 0.05) - waveTop(x - 0.05)) / 0.1
      const size = 0.55 + 0.28 * ((-top - 1.35) / 1.2)
      items.push({ ch: WAVE_TEXT[i], x, y: top * 0.42 - 0.12, rot: Math.atan(slope) * 0.8, size })
    }
    const paint = (ctx) => {
      for (const it of items) {
        ctx.save()
        ctx.translate(it.x, it.y)
        ctx.rotate(it.rot)
        glyph(ctx, g, it.ch, 0, 0, it.size, { kind: 'display' })
        ctx.restore()
      }
    }
    g.knock(R, paint)
    g.ink(K, paint)
    g.ink(S, (ctx) => {
      ctx.translate(0.06, 0.04)
      paint(ctx)
    })
  },
  back(g) {
    g.fill(S, BIG, 0.6)
    g.text(K, 'KINETIC TYPE LAB · 46', 0, -0.5, { kind: 'mono', size: 0.3, align: 'center', tracking: 0.1 })
  },
}

// ============================================ left page: the split-flap board
// A pull-tab strip (the drums) slides under a die-cut board. Each pull of
// one row-pitch drops the next destination into the live row's windows.

const BX = 1.2
const BY = 13.25
const BW = 10.4
const BH = 11.55
const PX = 0.53 // cell pitch
const CW = 0.47 // cell width
const CELL_H = 0.66
const RP = 0.84 // row pitch on the strip
const WY = 5.95 // live row (board coords)
const cellX = (j) => 0.335 + j * PX + (j >= 2 ? 0.25 : 0)
const STRIP_DX = 0.15
const STRIP_AT = [BX + STRIP_DX, BY + WY - 6 * RP - CELL_H / 2 - 0.2]
const ROW0 = BY + WY - STRIP_AT[1] // strip-local centre of row 0
const SW = BW - 2 * STRIP_DX
const WIDE = ROW0 + CELL_H / 2 + 0.12
const TAIL = H - STRIP_AT[1] // the page edge, in strip coords
const NECK = [SW / 2 - 1.25, SW / 2 + 1.25]
const HANDLE = [SW / 2 - 2.1, SW / 2 + 2.1]

const DEST = CH.days.map((n) => {
  const d = dayById.get(n)
  return { n, name: d.short.toUpperCase() }
})

// The route map in the board's lower half: seven stations, one per day, and a
// slot cut along the line for the train to ride.
// (RL − WY is an odd number of half row-pitches, so at every station the slot
// sits over the dark gap between two rows of drums)
const RL = 8.05 // the line (board coords)
const ST0 = 0.85 // first station
const STEP = 1.2 // station pitch: the train runs one STEP per row of drums
const stationX = (k) => ST0 + k * STEP
const SLOT = { x: stationX(0) - 0.05, y: RL - 0.045, w: 6 * STEP + 0.1, h: 0.09 }
const LY = 10.35 // the "later" row

// The flat preview sorts by each card's vertex centroid (the 3D book has a
// depth buffer). Extra vertices on straight edges keep the strip's centroid
// above the board's, and the board's above the train's (seen from the reader
// and from either side), so the preview stacks them strip → board → train as
// the real book does. The board's ride low on its outer edge, by the route.
const STRIP_TOP_PTS = 70
const BOARD_EDGE_PTS = 30
const BOARD_EDGE_Y = [9.2, 7.0]

function stripOutline() {
  const c = 0.35
  const y0 = TAIL - 0.25
  const y1 = TAIL + 1.45
  return [
    [0, 0],
    ...between([0, 0], [SW, 0], STRIP_TOP_PTS),
    [SW, 0],
    [SW, WIDE],
    [NECK[1], WIDE],
    [NECK[1], y0],
    [HANDLE[1], y0],
    [HANDLE[1], y1 - c],
    [HANDLE[1] - c, y1],
    [HANDLE[0] + c, y1],
    [HANDLE[0], y1 - c],
    [HANDLE[0], y0],
    [NECK[0], y0],
    [NECK[0], WIDE],
    [0, WIDE],
  ]
}

/** Draw a row of flap characters (cell centres from cellX) in one callback. */
function flapChars(ctx, g, str, xs, y, size, kind = 'mono') {
  for (let j = 0; j < str.length; j++) {
    if (str[j] === ' ') continue
    glyph(ctx, g, str[j], xs(j) + CW / 2, y + size * 0.36, size, { kind })
  }
}

const drums = {
  id: 'drums',
  kind: 'slider',
  on: 'page:L',
  at: STRIP_AT,
  travel: [0, 6 * RP],
  outline: stripOutline(),
  front(g) {
    g.fill(K, rect(0, 0, SW, WIDE + 0.2))
    const xs = (j) => cellX(j) - STRIP_DX
    DEST.forEach((d, k) => {
      const y = ROW0 - k * RP
      const num = pad2(d.n)
      const name = d.name.padEnd(16).slice(0, 16)
      // day number: paper digits on red cells
      g.knock(K, (ctx) => {
        for (let j = 0; j < 2; j++) ctx.fillRect(xs(j), y - CELL_H / 2, CW, CELL_H)
      })
      g.ink(R, (ctx) => {
        for (let j = 0; j < 2; j++) ctx.fillRect(xs(j), y - CELL_H / 2, CW, CELL_H)
      })
      g.knock(R, (ctx) => flapChars(ctx, g, num, xs, y, 0.5))
      // destination: sunflower on black
      g.knock(K, (ctx) => flapChars(ctx, g, name, (j) => xs(j + 2), y, 0.5))
      g.ink(S, (ctx) => flapChars(ctx, g, name, (j) => xs(j + 2), y, 0.5))
      // the split across every drum
      g.ink(K, (ctx) => {
        for (let j = 0; j < 18; j++) ctx.fillRect(xs(j), y - 0.012, CW, 0.03)
      })
    })
    // the tab: the strip runs on as a black neck (it is all that shows
    // through the board's slot) to a red handle with PULL printed clean
    g.fill(K, rect(NECK[0], WIDE, NECK[1] - NECK[0], TAIL - 0.25 - WIDE))
    g.fill(R, rect(HANDLE[0], TAIL - 0.25, HANDLE[1] - HANDLE[0], 2))
    const arrow = (ctx) => {
      const x = SW / 2
      const y = TAIL - 0.75
      ctx.beginPath()
      ctx.moveTo(x - 0.3, y - 0.18)
      ctx.lineTo(x + 0.3, y - 0.18)
      ctx.lineTo(x, y + 0.2)
      ctx.closePath()
      ctx.fill()
    }
    g.knock(K, arrow)
    g.ink(S, arrow)
    const pull = (ctx) => setText(ctx, g, 'PULL', SW / 2, TAIL + 0.95, { kind: 'display', size: 0.62, align: 'center' })
    g.knock(R, pull)
    g.ink(K, pull)
  },
}

const WIN = { h: 0.58 }
const boardHoles = () => [...Array.from({ length: 18 }, (_, j) => rect(cellX(j) + 0.025, WY - WIN.h / 2, CW - 0.05, WIN.h)), rect(SLOT.x, SLOT.y, SLOT.w, SLOT.h)]

const TITLE_FLAPS = 'LETTERFORMS'
const TP = 0.86
const tx = (j) => (BW - TITLE_FLAPS.length * TP + (TP - 0.78)) / 2 + j * TP

/** Paper gaps between drums: a 0.03 cm line centred in the gutter round each cell. */
function drumGaps(ctx, cells, gap) {
  ctx.lineWidth = 0.03
  for (const [x, y, w, h] of cells) ctx.strokeRect(x - gap / 2, y - gap / 2, w + gap, h + gap)
}

const board = {
  id: 'board',
  kind: 'flat',
  on: 'page:L',
  day: 55,
  at: [BX, BY],
  rot: 0,
  outline: [
    [0.25, 0],
    [BW - 0.25, 0],
    [BW, 0.25],
    [BW, BH - 0.25],
    [BW - 0.25, BH],
    [0.25, BH],
    [0, BH - 0.25],
    [0, BOARD_EDGE_Y[0]],
    ...between([0, BOARD_EDGE_Y[0]], [0, BOARD_EDGE_Y[1]], BOARD_EDGE_PTS - 2), // see STRIP_TOP_PTS
    [0, BOARD_EDGE_Y[1]],
    [0, 0.25],
  ],
  holes: boardHoles,
  front(g) {
    const ty = 1.75
    const row = (y) => Array.from({ length: 18 }, (_, j) => [cellX(j), y - CELL_H / 2, CW, CELL_H])
    // the housing: solid black; every drum defined by a hairline paper gap
    g.fill(K, BIG)
    g.knock(K, (ctx) => {
      ctx.fillRect(0, 1.33, BW, 0.03)
      drumGaps(ctx, row(WY), 0.06)
      drumGaps(ctx, row(LY), 0.06)
      drumGaps(
        ctx,
        Array.from({ length: TITLE_FLAPS.length }, (_, j) => [tx(j), ty - 0.06, 0.78, 1.32]),
        0.08,
      )
    })
    // the header
    textOnBlack(g, S, 'DEPARTURES', 0.4, 0.92, { kind: 'mono', size: 0.46, tracking: 0.22 })
    textOnBlack(g, R, 'II', BW - 1.35, 0.98, { kind: 'display', size: 0.62, align: 'right' })
    const clock = (ctx) => {
      ctx.lineWidth = 0.06
      ctx.beginPath()
      ctx.arc(BW - 0.75, 0.68, 0.36, 0, Math.PI * 2)
      ctx.moveTo(BW - 0.75, 0.68)
      ctx.lineTo(BW - 0.75, 0.42)
      ctx.moveTo(BW - 0.75, 0.68)
      ctx.lineTo(BW - 0.57, 0.78)
      ctx.stroke()
    }
    g.knock(K, clock)
    g.ink(S, clock)
    // the title on big drums, split across the middle
    const title = (ctx) => flapChars(ctx, g, TITLE_FLAPS, (j) => tx(j) + (0.78 - CW) / 2, ty + 0.6, 0.86, 'display')
    g.knock(K, title)
    g.ink(S, title)
    g.ink(K, (ctx) => {
      for (let j = 0; j < TITLE_FLAPS.length; j++) ctx.fillRect(tx(j), ty + 0.585, 0.78, 0.035)
    })
    textOnBlack(g, S, 'seven departures, march to july', BW / 2, 4.0, { kind: 'serif', size: 0.38, italic: true, align: 'center' })
    // column heads, the live row's red brackets
    const head = { kind: 'mono', size: 0.26, tracking: 0.1 }
    textOnBlack(g, S, 'DAY', cellX(0), WY - 0.62, head)
    textOnBlack(g, S, 'DESTINATION', cellX(2), WY - 0.62, head)
    textOnBlack(g, R, 'NOW BOARDING', BW - 0.34, WY - 0.62, { ...head, align: 'right' })
    const brackets = (ctx) => {
      ctx.fillRect(0.1, WY - 0.42, 0.08, 0.84)
      ctx.fillRect(BW - 0.18, WY - 0.42, 0.08, 0.84)
    }
    g.knock(K, brackets)
    g.ink(R, brackets)
    // the route: a sunflower line, seven stations, the slot along it
    textOnBlack(g, S, 'ROUTE II', 0.4, 7.2, head)
    textOnBlack(g, R, 'ONE STOP EACH PULL', BW - 0.34, 7.2, { ...head, align: 'right' })
    const line = (ctx) => {
      ctx.fillRect(stationX(0), RL - 0.09, 6 * STEP, 0.18)
      // on past the last stop, dashed: there is one more departure
      for (let x = stationX(6) + 0.25; x < BW - 0.7; x += 0.36) ctx.fillRect(x, RL - 0.06, 0.2, 0.12)
      ctx.beginPath()
      ctx.moveTo(BW - 0.62, RL - 0.24)
      ctx.lineTo(BW - 0.3, RL)
      ctx.lineTo(BW - 0.62, RL + 0.24)
      ctx.closePath()
      ctx.fill()
      for (let k = 0; k < 7; k++) {
        ctx.beginPath()
        ctx.arc(stationX(k), RL, 0.24, 0, Math.PI * 2)
        ctx.fill()
      }
      CH.days.forEach((n, k) => setText(ctx, g, pad2(n), stationX(k), RL + 0.78, { kind: 'mono', size: 0.32, align: 'center' }))
    }
    g.knock(K, line)
    g.ink(S, line)
    // each station a black eye on the line
    const eyes = (ctx) => {
      for (let k = 0; k < 7; k++) {
        ctx.beginPath()
        ctx.arc(stationX(k), RL, 0.11, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    g.knock(S, eyes)
    g.ink(K, eyes)
    // later: the last stop of all
    textOnBlack(g, S, 'LATER', cellX(0), LY - 0.6, head)
    const last = (ctx) => {
      flapChars(ctx, g, '65', cellX, LY, 0.5)
      flapChars(ctx, g, 'POP-UP BOOK', (j) => cellX(j + 2), LY, 0.5)
    }
    g.knock(K, last)
    g.ink(S, last)
    g.ink(K, (ctx) => {
      for (let j = 0; j < 18; j++) ctx.fillRect(cellX(j), LY - 0.012, CW, 0.025)
    })
    textOnBlack(g, S, 'TERMINAL / 55', 0.4, BH - 0.3, { kind: 'mono', size: 0.26, tracking: 0.14 })
    textOnBlack(g, R, 'pull the tab to flip the board', BW - 0.4, BH - 0.3, { kind: 'serif', size: 0.3, italic: true, align: 'right' })
  },
}

// The train: a red card riding the slot, driven by the drums. One row of
// drums is one station, so each flip moves it on a stop.
const TRAIN = [
  [-0.52, -0.27],
  [0.26, -0.27],
  [0.55, -0.02],
  [0.55, 0.27],
  [-0.52, 0.27],
]
const train = {
  id: 'train',
  kind: 'flat',
  on: 'board.card',
  at: [stationX(0), RL],
  rot: 0,
  outline: TRAIN,
  drive: { by: 'drums', move: [6 * STEP, 0] },
  front(g) {
    g.fill(R, BIG)
    // windows in black, a sunflower headlamp printed clean, a paper skirt line
    g.ink(K, (ctx) => {
      ctx.fillRect(-0.4, -0.17, 0.2, 0.17)
      ctx.fillRect(-0.12, -0.17, 0.2, 0.17)
      ctx.beginPath()
      ctx.moveTo(0.16, -0.17)
      ctx.lineTo(0.27, -0.17)
      ctx.lineTo(0.42, -0.03)
      ctx.lineTo(0.16, -0.03)
      ctx.closePath()
      ctx.fill()
    })
    const lamp = (ctx) => {
      ctx.beginPath()
      ctx.arc(0.44, 0.13, 0.055, 0, Math.PI * 2)
      ctx.fill()
    }
    g.knock(R, lamp)
    g.ink(S, lamp)
    g.knock(R, (ctx) => ctx.fillRect(-0.52, 0.09, 0.86, 0.035))
  },
}

// ====================================================================== pages

const PARA =
  'Seven days of teaching letters to move. Words burst into particles and found their way home; code fell like rain until it spelled a secret; a terminal booted with a phosphor hum; headlines swelled toward the cursor and rode a sine wave; the webcam came back as ASCII; and a station board clacked through its destinations, one drum at a time.'

function leftPage(g) {
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', K)
  const x = M.outer
  // a giant sunflower numeral with the title overprinted across it
  g.text(S, CH.numeral, x - 0.15, 6.15, { kind: 'display', size: 7 })
  g.text(R, CH.numeral, x - 0.15 + 0.12, 6.15 + 0.1, { kind: 'display', size: 7, tone: 0.28 })
  // (title, rules and paragraph all stop well short of the rain's footprint,
  // which sweeps over x ≈ 11 as the book opens)
  g.text(K, CH.title, x + 0.05, 4.75, { kind: 'display', size: 1.42 })
  g.text(R, 'what the letters did when nobody was reading', x, 7.0, { kind: 'serif', size: 0.42, italic: true, weight: 500 })
  g.fill(S, rect(x + 0.08, 7.48, 8.6, 0.13))
  g.fill(K, rect(x, 7.38, 8.6, 0.09))
  g.para(K, PARA, x, 8.4, 8.6, { size: 0.4, leading: 0.56 })
  // the terminal's light spills across the gutter
  g.glow(S, rect(10, 10, 10, 14), W, 17.2, 7.5, 0.45, 0)
  // under the board's slot: dark, so the slot reads as a cut at every stop
  g.fill(K, rect(BX + SLOT.x - 0.2, BY + RL - 0.3, SLOT.w + 0.4, 0.6))
  folio(g, pl, 'L', K)
}

// ======================================= right page: the particle flap
// A black card of loose particles, hinged down its right edge. Lift it and
// swing it open, and the word they were always going to be stands up on the
// hinge (a V-fold glued across the flap's fold).

const FW = 7.6 // along the hinge
const FH = 5.4 // the body, toward the gutter
const TAB = [FW / 2 - 0.85, FW / 2 + 0.85, 0.55]
const HX = 19.9 - FH - TAB[2] // hinge, page R: opened right out, the tab stays on the page
const HY = 1.85
// draw page-aligned (u right, v down, from the hinge's top) on the flap's faces
const frontToPage = (ctx) => ctx.transform(0, -1, 1, 0, 0, 0)
const backToPage = (ctx) => ctx.transform(0, 1, -1, 0, FW, 0)

const HELLO = { size: 3.0, base: -0.55, step: 0.24, dot: 0.11 }
// the crease runs up the first l (its centre sits 0.121 em right of the word's)
const HELLO_X = -0.121 * HELLO.size
const HELLO_W = 2.54 * HELLO.size // Caprasimo "hello", measured
const HELLO_BASE = { x: HELLO_X - HELLO_W / 2 - 0.15, w: HELLO_W + 0.3 }
let helloDotCache = null
function helloDots() {
  if (helloDotCache) return helloDotCache
  const box = { x0: HELLO_BASE.x - 0.3, y0: HELLO.base - HELLO.size * 0.8, w: HELLO_BASE.w + 0.6, h: HELLO.size * 0.8 + 0.2 }
  const res = 24
  const c = makeCanvas(Math.ceil(box.w * res), Math.ceil(box.h * res))
  const ctx = c.getContext('2d')
  ctx.setTransform(res, 0, 0, res, -box.x0 * res, -box.y0 * res)
  ctx.font = `${HELLO.size}px "Caprasimo"`
  ctx.textAlign = 'center'
  ctx.fillStyle = '#000'
  ctx.fillText('hello', HELLO_X, HELLO.base)
  const data = ctx.getImageData(0, 0, c.width, c.height).data
  const dots = []
  const step = HELLO.step
  // the grid is centred on the crease, so a column of particles runs up it
  for (let y = HELLO.base - step / 2; y > box.y0; y -= step) {
    for (let x = Math.ceil(box.x0 / step) * step; x < box.x0 + box.w; x += step) {
      const px = Math.floor((x - box.x0) * res)
      const py = Math.floor((y - box.y0) * res)
      if (data[(py * c.width + px) * 4 + 3] > 140) dots.push([x, y])
    }
  }
  helloDotCache = dots
  return dots
}
let helloCache = null
function helloOutline() {
  if (helloCache) return helloCache
  const dots = helloDots()
  helloCache = trace({ x0: HELLO_BASE.x - 0.6, y0: HELLO.base - HELLO.size * 0.9, w: HELLO_BASE.w + 1.2, h: HELLO.size * 0.9 + 1.4 }, (ctx) => {
    // the cut follows the particles, joined (each touches its neighbours)
    for (const [x, y] of dots) {
      ctx.beginPath()
      ctx.arc(x, y, 0.175, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.roundRect(HELLO_BASE.x, HELLO.base - 0.22, HELLO_BASE.w, 1.2, 0.12)
    ctx.fill()
  })
  return helloCache
}

const hello = {
  id: 'hello',
  kind: 'vfold',
  on: 'cloud',
  day: 1,
  at: 2.35,
  glue: [58, 58],
  angle: [90, 90],
  outline: () => helloOutline(),
  front(g) {
    const dots = helloDots()
    const rng = makeRng(11)
    const hot = dots.map(() => rng.chance(0.16))
    const draw = (pick) => (ctx) => {
      dots.forEach(([x, y], i) => {
        if (!pick(i)) return
        ctx.beginPath()
        ctx.arc(x, y, HELLO.dot, 0, Math.PI * 2)
        ctx.fill()
      })
    }
    g.ink(R, draw((i) => !hot[i]))
    g.ink(S, draw((i) => hot[i]))
    g.fill(K, rect(HELLO_BASE.x, HELLO.base, HELLO_BASE.w, 1))
    textOnBlack(g, S, 'PARTICLE TEXT · 01', HELLO_X, -0.17, { kind: 'mono', size: 0.28, align: 'center', tracking: 0.12 })
  },
  back(g) {
    g.fill(S, BIG)
    g.fill(K, rect(-HELLO_BASE.x - HELLO_BASE.w, HELLO.base, HELLO_BASE.w, 1))
  },
}

/** Loose particles drifting in a lazy swirl (page-aligned, around a centre). */
function cloudDots(seed, n, cx, cy, rx, ry) {
  const rng = makeRng(seed)
  return Array.from({ length: n }, () => {
    const a = rng.range(0, Math.PI * 2)
    const r = Math.sqrt(rng.range(0.02, 1))
    return {
      x: cx + Math.cos(a) * r * rx,
      y: cy + Math.sin(a) * r * ry,
      a: a + Math.PI / 2,
      r: rng.range(0.03, 0.09),
      ink: rng.chance(0.62) ? R : S,
    }
  })
}
const FLAP_HINGE_PTS = 90
const LOOSE = cloudDots(31, 170, -FH / 2, FW / 2 - 0.4, FH / 2 - 0.35, FW / 2 - 0.6)
const GATHER = cloudDots(32, 120, FH / 2 + 0.2, FW / 2, FH / 2 - 0.5, FW / 2 - 0.5)

const cloud = {
  id: 'cloud',
  kind: 'flap',
  on: 'page:R',
  at: [HX, HY],
  rot: 90,
  // (extra cutter-path vertices along the hinge: the flat preview sorts by
  // vertex centroid, and this one keeps the flap over the folded word while
  // it's shut and under the standing word once it's open past upright)
  outline: [
    [0, 0],
    [0.3, 0],
    ...between([0.3, 0], [FW, 0], FLAP_HINGE_PTS),
    [FW, 0],
    [FW, FH - 0.3],
    [FW - 0.3, FH],
    [TAB[1], FH],
    [TAB[1] - 0.2, FH + TAB[2]],
    [TAB[0] + 0.2, FH + TAB[2]],
    [TAB[0], FH],
    [0.3, FH],
    [0, FH - 0.3],
  ],
  front(g) {
    g.fill(K, BIG)
    g.fill(R, rect(TAB[0] - 0.1, FH, TAB[1] - TAB[0] + 0.2, 2))
    g.knock(K, (ctx) => ctx.fillRect(TAB[0] - 0.1, FH, TAB[1] - TAB[0] + 0.2, 2))
    const dot = (ink) => (ctx) => {
      frontToPage(ctx)
      for (const d of LOOSE) {
        if (ink && d.ink !== ink) continue
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    g.knock(K, dot(null))
    g.ink(R, dot(R))
    g.ink(S, dot(S))
    const words = (ctx) => {
      frontToPage(ctx)
      setText(ctx, g, 'scattered.', -FH + 0.35, 0.8, { kind: 'serif', size: 0.46, italic: true })
      setText(ctx, g, 'lift me to gather them', -FH + 0.35, FW - 0.35, { kind: 'mono', size: 0.28, tracking: 0.06 })
    }
    g.knock(K, words)
    g.ink(S, words)
    // LIFT in black, printed clean out of the red tab
    const lift = (ctx) => setText(ctx, g, 'LIFT', (TAB[0] + TAB[1]) / 2, FH + 0.42, { kind: 'mono', size: 0.3, align: 'center', tracking: 0.2 })
    g.knock(R, lift)
    g.ink(K, lift)
  },
  back(g) {
    // open, face-down beside the word: particles streaming home to it
    g.fill(S, BIG, 0.22)
    g.ink(R, (ctx) => {
      backToPage(ctx)
      for (const d of GATHER) {
        const len = 0.2 + (d.x / FH) * 0.9
        ctx.lineWidth = d.r * 1.4
        ctx.globalAlpha = 0.55
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x + len, d.y + (d.y - FW / 2) * 0.08)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    g.ink(K, (ctx) => {
      backToPage(ctx)
      setText(ctx, g, 'gathered.', FH - 0.35, 0.8, { kind: 'serif', size: 0.46, italic: true, align: 'right' })
      setText(ctx, g, 'and found their word', FH - 0.35, FW - 0.35, { kind: 'mono', size: 0.28, align: 'right' })
    })
  },
}

const IDX = { x: 9.4, y: 13.3, w: W - M.outer - 9.4, gap: 1.3 }

function rightPage(g) {
  const xr = W - M.outer
  runningHead(g, 'departures · arrivals', 'R', K)
  // under the flap: where the particles were
  g.ink(R, (ctx) => {
    ctx.fillStyle = g.tone(0.22)
    for (const d of LOOSE) {
      ctx.beginPath()
      ctx.arc(HX + d.x, HY + d.y, d.r * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  g.text(K, 'they were a word all along', HX - FH + 0.3, HY + FW - 0.35, { kind: 'serif', size: 0.34, italic: true })
  g.text(K, '01 · PARTICLE TEXT', HX - FH, HY + FW + 0.85, { kind: 'mono', size: 0.26, tracking: 0.14 })
  // a warm pool of light where the terminal stands
  g.glow(S, rect(0, 10, 9, 14), 0, 17.2, 7.5, 0.45, 0)
  // the timetable
  g.text(K, 'Timetable', IDX.x, IDX.y - 1.05, { kind: 'display', size: 0.82 })
  g.text(R, 'tap a line to board', xr, IDX.y - 1.08, { kind: 'serif', size: 0.34, italic: true, align: 'right' })
  g.fill(K, rect(IDX.x, IDX.y - 0.7, IDX.w, 0.06))
  CH.days.forEach((n, i) => {
    const d = dayById.get(n)
    const y = IDX.y + i * IDX.gap
    g.text(R, pad2(n), IDX.x, y + 0.42, { kind: 'display', size: 0.66 })
    g.text(K, d.short, IDX.x + 1.15, y + 0.2, { kind: 'serif', size: 0.42, weight: 600, maxWidth: 5.2 })
    g.text(K, d.tech.slice(0, 3).join(' · '), IDX.x + 1.15, y + 0.64, { kind: 'mono', size: 0.26, maxWidth: 5.2 })
    const [, m, day] = d.shipped.split('-')
    const mon = ['', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(m)]
    g.text(K, `${Number(day)} ${mon}`, xr, y + 0.2, { kind: 'mono', size: 0.28, align: 'right' })
    g.text(R, `${d.commits} commits`, xr, y + 0.64, { kind: 'mono', size: 0.26, align: 'right' })
    g.fill(K, rect(IDX.x, y + 0.88, IDX.w, 0.025), 0.45)
  })
  g.para(
    K,
    'Pull the tab on the left and the board flips through every one of them.',
    IDX.x,
    IDX.y + 7 * IDX.gap + 0.35,
    IDX.w,
    { size: 0.32, italic: true },
  )
  folio(g, pr, 'R', K)
}

const indexSpots = CH.days.map((n, i) => ({
  day: n,
  on: 'page:R',
  rect: [IDX.x - 0.15, IDX.y + i * IDX.gap - 0.42, IDX.w + 0.3, IDX.gap - 0.06],
}))

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: leftPage, R: rightPage },
  // the slider before the board, so the board's windows sit on top of it;
  // the train after the board, riding its slot
  pieces: [rain, specimen, crt, wave, cloud, hello, drums, board, train],
  spots: [
    ...indexSpots,
    // the particle flap's caption, printed on the bare page below it
    { day: 1, on: 'page:R', rect: [HX - FH - 0.15, HY + FW + 0.45, 4.2, 0.6] },
  ],
}
