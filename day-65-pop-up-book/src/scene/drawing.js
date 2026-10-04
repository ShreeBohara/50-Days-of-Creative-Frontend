// Day 66: the reader's pencil on the blank card. Strokes live in card
// centimetres, are drawn in graphite (a noisy pattern, thinner when fast) onto
// a canvas that is the card's front texture, and are kept in localStorage so
// the drawing is still there next time the book is opened.

import * as THREE from 'three'
import { makeRng } from '../art/rng.js'

const KEY = 'sixty-five.day66.v1'
const RES = 48 // px per cm

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function save(strokes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(strokes))
  } catch {
    /* private mode or full: the drawing just won't persist */
  }
}

function graphite() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const img = g.createImageData(64, 64)
  const rng = makeRng(66)
  for (let i = 0; i < 64 * 64; i++) {
    const v = 40 + rng() * 30
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v + 6
    img.data[i * 4 + 3] = 150 + rng() * 105
  }
  g.putImageData(img, 0, 0)
  return c
}

/** box: the card's art box {x0, y0, w, h} in cm. */
export function createDrawing(box) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(box.w * RES)
  canvas.height = Math.ceil(box.h * RES)
  const ctx = canvas.getContext('2d')
  const pattern = ctx.createPattern(graphite(), 'repeat')
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = false
  tex.anisotropy = 8
  let strokes = load()
  let live = null

  const px = (x, y) => [(x - box.x0) * RES, (y - box.y0) * RES]

  function base() {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#fbf8f1'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    // crop marks: the only print on a page that is yours
    ctx.strokeStyle = 'rgba(42,40,38,0.4)'
    ctx.lineWidth = 0.02 * RES
    const m = 0.4 * RES
    const L = 0.5 * RES
    const W = canvas.width
    const H = canvas.height
    for (const [cx, cy, sx, sy] of [
      [m, m, 1, 1],
      [W - m, m, -1, 1],
      [m, H - m, 1, -1],
      [W - m, H - m, -1, -1],
    ]) {
      ctx.beginPath()
      ctx.moveTo(cx, cy + sy * L)
      ctx.lineTo(cx, cy)
      ctx.lineTo(cx + sx * L, cy)
      ctx.stroke()
    }
  }

  function segment(a, b) {
    const [x0, y0] = px(a[0], a[1])
    const [x1, y1] = px(b[0], b[1])
    ctx.strokeStyle = pattern
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(1.2, b[2] * RES)
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function redraw() {
    base()
    for (const s of strokes) for (let i = 1; i < s.length; i++) segment(s[i - 1], s[i])
    tex.needsUpdate = true
  }
  redraw()

  return {
    texture: tex,
    get count() {
      return strokes.length
    },
    begin(x, y) {
      live = [[+x.toFixed(3), +y.toFixed(3), 0.06]]
      strokes.push(live)
      segment(live[0], live[0])
      tex.needsUpdate = true
    },
    /** Add a point; returns the pencil speed (0…1) for the scratch sound. */
    to(x, y, dt) {
      if (!live) return 0
      const last = live[live.length - 1]
      const d = Math.hypot(x - last[0], y - last[1])
      if (d < 0.03) return 0
      const speed = Math.min(1, d / Math.max(dt, 1e-3) / 40)
      // faster strokes press lighter
      const w = 0.075 - speed * 0.035
      const p = [+x.toFixed(3), +y.toFixed(3), +w.toFixed(3)]
      segment(last, p)
      live.push(p)
      tex.needsUpdate = true
      return speed
    },
    end() {
      if (!live) return
      live = null
      if (strokes.length > 400) strokes = strokes.slice(-400)
      save(strokes)
    },
    /**
     * The reader's page as a keepsake: their drawing on cream card, framed
     * with the book's crop marks and a printed caption. Resolves a PNG Blob.
     */
    toBlob() {
      const pad = 90
      const foot = 170
      const out = document.createElement('canvas')
      out.width = canvas.width + pad * 2
      out.height = canvas.height + pad + foot
      const g = out.getContext('2d')
      g.fillStyle = '#f4eee1'
      g.fillRect(0, 0, out.width, out.height)
      g.shadowColor = 'rgba(40,30,20,0.25)'
      g.shadowBlur = 24
      g.shadowOffsetY = 8
      g.drawImage(canvas, pad, pad)
      g.shadowColor = 'transparent'
      const top = out.height - foot
      const width = out.width - pad * 2
      g.fillStyle = '#3d5588'
      g.font = '54px "Caprasimo", Georgia, serif'
      g.fillText('Day 66', pad, top + 70, width)
      g.font = 'italic 26px "Newsreader Variable", Georgia, serif'
      g.fillStyle = '#2a2826'
      const when = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
      g.fillText(`drawn in Sixty-Five, a pop-up book · ${when}`, pad, top + 108, width)
      g.font = '17px "Fragment Mono", monospace'
      g.fillStyle = '#ff48b0'
      g.fillText('shreebohara.github.io/50-Days-of-Creative-Frontend/day-65-pop-up-book', pad, top + 140, width)
      return new Promise((resolve) => out.toBlob(resolve, 'image/png'))
    },
    undo() {
      strokes.pop()
      save(strokes)
      redraw()
    },
    clear() {
      strokes = []
      save(strokes)
      redraw()
    },
  }
}
