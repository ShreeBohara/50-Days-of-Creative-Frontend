// A small risograph print shop. Every printed surface in the book (pages and
// pop-up cards, front and back) is painted as separate INK LAYERS of coverage,
// then "printed": tints become halftone dots on a per-ink screen angle, solids
// pick up drum mottle and speckle, each ink lands a little off register, and
// the inks overprint by multiplying onto the paper — so pink over yellow is
// orange and blue over yellow is green, exactly like the real machine.
//
// The same code runs in the browser (OffscreenCanvas / <canvas>) and in node
// (@napi-rs/canvas) for scripts/preview-spread.mjs.

import { fbm, hash2, makeRng } from './rng.js'

/** Riso drum colours (published sRGB approximations of the real inks). */
export const INKS = {
  black: '#2a2826',
  blue: '#0078bf',
  federal: '#3d5588',
  aqua: '#5ec8e5',
  teal: '#00838a',
  green: '#00a95c',
  mint: '#82d8d5',
  yellow: '#ffe800',
  sunflower: '#ffb511',
  orange: '#ff6c2f',
  red: '#f15060',
  pink: '#ff48b0',
  purple: '#765ba7',
  gold: '#b49a68',
}

/** Card and paper stocks. */
export const PAPERS = {
  cream: '#f4eee1',
  white: '#fbf8f1',
  kraft: '#cdb08a',
  grey: '#d9d6cf',
}

const FONTS = {
  display: '"Caprasimo"',
  serif: '"Newsreader Variable", "Newsreader"',
  mono: '"Fragment Mono"',
}

// ---------------------------------------------------------------- canvases

let factory = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}
/** Node swaps in @napi-rs/canvas's createCanvas. */
export function setCanvasFactory(fn) {
  factory = fn
}
export const makeCanvas = (w, h) => factory(Math.max(1, w | 0), Math.max(1, h | 0))

// --------------------------------------------------------- grain textures

const TILE = 256
let tiles = null
/** Mottle (drum texture, ~1–2 mm blots) and speckle (single dropped dots). */
function grainTiles() {
  if (tiles) return tiles
  const mottle = new Float32Array(TILE * TILE)
  const speck = new Float32Array(TILE * TILE)
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      // tileable: sample noise on a torus-ish wrap by blending edges
      const u = x / TILE
      const v = y / TILE
      const m =
        fbm(u * 8, v * 8, 11, 4) * (1 - u) * (1 - v) +
        fbm((u - 1) * 8, v * 8, 11, 4) * u * (1 - v) +
        fbm(u * 8, (v - 1) * 8, 11, 4) * (1 - u) * v +
        fbm((u - 1) * 8, (v - 1) * 8, 11, 4) * u * v
      mottle[y * TILE + x] = m
      speck[y * TILE + x] = hash2(x, y, 97)
    }
  }
  tiles = { mottle, speck }
  return tiles
}

const hexRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ----------------------------------------------------------------- painting

/**
 * The drawing kit a painter receives. Coordinates are card centimetres
 * (the card's own canvas convention, y down); every draw lands in one ink's
 * coverage layer. Opaque = solid ink; partial alpha (g.tone) = a tint that
 * prints as halftone dots.
 */
function makeKit(box, res, seed) {
  const W = Math.ceil(box.w * res) + 2
  const H = Math.ceil(box.h * res) + 2
  const layers = new Map()
  const kit = {
    box,
    res,
    w: box.w,
    h: box.h,
    rng: makeRng(seed),
    /** Draw into one ink's layer. fn(ctx, kit). */
    ink(name, fn) {
      if (!INKS[name]) throw new Error(`unknown ink ${name}`)
      let c = layers.get(name)
      if (!c) {
        c = makeCanvas(W, H)
        layers.set(name, c)
      }
      const ctx = c.getContext('2d')
      ctx.save()
      ctx.setTransform(res, 0, 0, res, (1 - box.x0 * res), (1 - box.y0 * res))
      ctx.fillStyle = '#000'
      ctx.strokeStyle = '#000'
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      fn(ctx, kit)
      ctx.restore()
      return kit
    },
    /** A tint as a fill/stroke style: 0 = no ink, 1 = solid. */
    tone(v) {
      return `rgba(0,0,0,${Math.max(0, Math.min(1, v)).toFixed(3)})`
    },
    /** CSS font string. kind: display | serif | mono; size in cm. */
    font(kind, size, { weight = 400, italic = false } = {}) {
      // whole hundreds only: skia (node previews) mis-measures 560 by 10×
      const w = Math.max(100, Math.min(900, Math.round(weight / 100) * 100))
      return `${italic ? 'italic ' : ''}${w} ${size}px ${FONTS[kind] ?? kind}`
    },
    /**
     * Knock out: erase coverage from one ink's layer (fn draws the shape to
     * remove). Use it so a colour prints clean instead of overprinting —
     * e.g. blue type over a yellow shadow without turning olive.
     */
    knock(name, fn) {
      return kit.ink(name, (ctx) => {
        ctx.globalCompositeOperation = 'destination-out'
        fn(ctx, kit)
      })
    },
    /** Fill a polygon ([[x,y],…]) or Path2D in an ink. */
    fill(name, shape, tone = 1) {
      return kit.ink(name, (ctx) => {
        ctx.fillStyle = kit.tone(tone)
        if (Array.isArray(shape)) ctx.fill(polyPath(shape))
        else ctx.fill(shape)
      })
    },
    /** Stroke a polyline/polygon or Path2D. */
    stroke(name, shape, width = 0.05, tone = 1, closed = false) {
      return kit.ink(name, (ctx) => {
        ctx.strokeStyle = kit.tone(tone)
        ctx.lineWidth = width
        ctx.stroke(Array.isArray(shape) ? polyPath(shape, closed) : shape)
      })
    },
    circle(name, cx, cy, r, tone = 1) {
      return kit.ink(name, (ctx) => {
        ctx.fillStyle = kit.tone(tone)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      })
    },
    /**
     * Set a line of type. Sizes are in cm (1 cm ≈ 28pt). opts: kind, weight,
     * italic, align (left|center|right), baseline, tracking (em), tone,
     * maxWidth (shrinks to fit).
     */
    text(name, str, x, y, opts = {}) {
      const { kind = 'serif', size = 0.5, weight = 400, italic = false, align = 'left', baseline = 'alphabetic', tracking = 0, tone = 1, maxWidth } = opts
      return kit.ink(name, (ctx) => {
        ctx.fillStyle = kit.tone(tone)
        // canvas font sizes below ~1px misbehave; set type at 100× and scale
        const S = 100
        ctx.translate(x, y)
        ctx.scale(1 / S, 1 / S)
        ctx.font = kit.font(kind, size * S, { weight, italic })
        ctx.textBaseline = baseline
        const track = tracking * size * S
        const w = measure(ctx, str, track)
        // too long: squeeze horizontally (the coordinates below stay unsqueezed)
        if (maxWidth && w > maxWidth * S) ctx.scale((maxWidth * S) / w, 1)
        let start = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
        if (!track) {
          ctx.textAlign = 'left'
          ctx.fillText(str, start, 0)
        } else {
          for (const ch of str) {
            ctx.fillText(ch, start, 0)
            start += ctx.measureText(ch).width + track
          }
        }
      })
    },
    /** Width of a line of type in cm. */
    measure(str, opts = {}) {
      const { kind = 'serif', size = 0.5, weight = 400, italic = false, tracking = 0 } = opts
      const c = scratch()
      c.font = kit.font(kind, size * 100, { weight, italic })
      return measure(c, str, tracking * size * 100) / 100
    },
    /**
     * Set a paragraph ragged-right inside `width`; returns the height used.
     * opts as text(), plus leading (line height in cm).
     */
    para(name, str, x, y, width, opts = {}) {
      const size = opts.size ?? 0.42
      const leading = opts.leading ?? size * 1.32
      const lines = wrap(str, width, (s) => kit.measure(s, opts))
      lines.forEach((ln, i) => kit.text(name, ln, x, y + i * leading, opts))
      return lines.length * leading
    },
    /** Linear tint ramp t0 → t1 across (x0,y0)→(x1,y1), clipped to `shape`. */
    ramp(name, shape, x0, y0, x1, y1, t0 = 0, t1 = 1) {
      return kit.ink(name, (ctx) => {
        const gr = ctx.createLinearGradient(x0, y0, x1, y1)
        gr.addColorStop(0, kit.tone(t0))
        gr.addColorStop(1, kit.tone(t1))
        ctx.fillStyle = gr
        if (Array.isArray(shape)) ctx.fill(polyPath(shape))
        else ctx.fill(shape)
      })
    },
    /** Radial tint ramp from the centre (t0) to radius r (t1), clipped to `shape`. */
    glow(name, shape, cx, cy, r, t0 = 1, t1 = 0) {
      return kit.ink(name, (ctx) => {
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        gr.addColorStop(0, kit.tone(t0))
        gr.addColorStop(1, kit.tone(t1))
        ctx.fillStyle = gr
        if (Array.isArray(shape)) ctx.fill(polyPath(shape))
        else ctx.fill(shape)
      })
    },
    path: polyPath,
  }
  return { kit, layers, W, H }
}

let scratchCtx = null
function scratch() {
  if (!scratchCtx) scratchCtx = makeCanvas(8, 8).getContext('2d')
  return scratchCtx
}

function measure(ctx, str, track) {
  if (!track) return ctx.measureText(str).width
  let w = 0
  for (const ch of str) w += ctx.measureText(ch).width + track
  return w - track
}

/** Greedy word wrap. */
export function wrap(str, width, measureFn) {
  const out = []
  for (const para of String(str).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    let line = ''
    for (const w of words) {
      const next = line ? `${line} ${w}` : w
      if (line && measureFn(next) > width) {
        out.push(line)
        line = w
      } else line = next
    }
    out.push(line)
  }
  return out
}

/** Path2D through points; closed unless told otherwise. */
export function polyPath(pts, closed = true) {
  const P = typeof Path2D !== 'undefined' ? new Path2D() : null
  if (!P) throw new Error('Path2D unavailable')
  pts.forEach(([x, y], i) => (i ? P.lineTo(x, y) : P.moveTo(x, y)))
  if (closed) P.closePath()
  return P
}

// ------------------------------------------------------------------ printing

/** Per-ink screen angle (deg), like a real riso's drum-to-drum offsets. */
const SCREEN = { yellow: 0, sunflower: 0, pink: 75, red: 75, orange: 15, blue: 15, federal: 15, aqua: 45, teal: 45, green: 45, mint: 45, purple: 75, black: 45, gold: 30 }

/**
 * Print a face: run the painter into ink layers, then composite them onto
 * paper. Returns a canvas `res` pixels per cm covering `box` (+1 px bleed).
 *
 *   painter(kit)       draws with kit.ink(...)
 *   box                {x0, y0, w, h} card-space bounds in cm
 *   opts.paper         a PAPERS key or hex
 *   opts.seed          sheet seed: registration, grain placement
 *   opts.misregister   cm of wander per ink (default 0.035)
 *   opts.lpcm          halftone lines per cm (default 7.5 ≈ 19 lpi… coarse on purpose)
 */
export function printFace(painter, box, opts = {}) {
  const res = opts.res ?? 40
  const seed = opts.seed ?? 1
  const { kit, layers, W, H } = makeKit(box, res, seed)
  if (painter) painter(kit)
  const out = makeCanvas(W, H)
  const ctx = out.getContext('2d')
  const paper = hexRgb(PAPERS[opts.paper] ?? opts.paper ?? PAPERS.white)
  const img = ctx.createImageData(W, H)
  const d = img.data
  const { mottle, speck } = grainTiles()
  const rng = makeRng(seed * 31 + 7)
  // paper: base tone with fibre noise
  const ox = rng.int(0, TILE - 1)
  const oy = rng.int(0, TILE - 1)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const m = mottle[((y + oy) & 255) * TILE + ((x + ox) & 255)]
      const f = speck[((y * 3 + oy) & 255) * TILE + ((x * 5 + ox) & 255)]
      const k = 1 - 0.035 * (m - 0.5) - (f > 0.985 ? 0.06 : 0)
      d[i] = paper[0] * k
      d[i + 1] = paper[1] * k
      d[i + 2] = paper[2] * k
      d[i + 3] = 255
    }
  }
  const period = res / (opts.lpcm ?? 7.5)
  const wander = (opts.misregister ?? 0.035) * res
  for (const [name, layer] of layers) {
    const ink = hexRgb(INKS[name])
    const src = layer.getContext('2d').getImageData(0, 0, W, H).data
    const r = makeRng(`${seed}:${name}`)
    const dx = Math.round(r.range(-1, 1) * wander)
    const dy = Math.round(r.range(-1, 1) * wander)
    const ang = ((SCREEN[name] ?? 45) * Math.PI) / 180
    const ca = Math.cos(ang) / period
    const sa = Math.sin(ang) / period
    const tox = r.int(0, TILE - 1)
    const toy = r.int(0, TILE - 1)
    const opacity = name === 'yellow' || name === 'pink' ? 0.95 : 0.9
    // what the ink does to each channel at full coverage (multiply)
    const mul = [ink[0] / 255, ink[1] / 255, ink[2] / 255]
    for (let y = 0; y < H; y++) {
      const sy = y - dy
      if (sy < 0 || sy >= H) continue
      for (let x = 0; x < W; x++) {
        const sx = x - dx
        if (sx < 0 || sx >= W) continue
        let c = src[(sy * W + sx) * 4 + 3] / 255
        if (c < 0.01) continue
        if (c < 0.97) {
          // halftone: round dots on this ink's screen, antialiased over ~1px
          const u = x * ca + y * sa
          const v = -x * sa + y * ca
          const s = 0.5 + 0.25 * (Math.cos(u * 6.2832) + Math.cos(v * 6.2832))
          const e = (c - s) * period * 0.7 + 0.5
          c = e <= 0 ? 0 : e >= 1 ? 1 : e
          if (c === 0) continue
        }
        // drum mottle and the odd starved dot
        const m = mottle[((y + toy) & 255) * TILE + ((x + tox) & 255)]
        const sp = speck[((y + tox) & 255) * TILE + ((x + toy) & 255)]
        c *= 1 - 0.22 * Math.max(0, m - 0.42) - (sp > 0.975 ? 0.55 : 0)
        c *= opacity
        const i = (y * W + x) * 4
        d[i] *= 1 - c * (1 - mul[0])
        d[i + 1] *= 1 - c * (1 - mul[1])
        d[i + 2] *= 1 - c * (1 - mul[2])
      }
    }
  }
  ctx.putImageData(img, 0, 0)
  return out
}
