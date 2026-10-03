// The die-cut sheet for a spread: every card printed flat at true size, with
// its cut line, folds (valley dashed, mountain dash-dot), glue tabs, and where
// to glue it — so the pop-ups can be printed at 100 % and built from real card.
// The geometry is the same the 3D book folds, so the paper version works.

import { makeCanvas, printFace } from './riso.js'
import { hashString } from './rng.js'
import { cardBox } from './printSpread.js'

const TAB = 0.8 // glue tab width, cm

/** Trapezoid glue tab on the far side of a glue line (away from the card). */
function tab(poly, p0, p1) {
  const dx = p1[0] - p0[0]
  const dy = p1[1] - p0[1]
  const l = Math.hypot(dx, dy) || 1
  let nx = -dy / l
  let ny = dx / l
  // point the tab away from the card: test which side the card's centre is on
  let cx = 0
  let cy = 0
  for (const [x, y] of poly) {
    cx += x
    cy += y
  }
  cx /= poly.length
  cy /= poly.length
  if ((cx - p0[0]) * nx + (cy - p0[1]) * ny > 0) {
    nx = -nx
    ny = -ny
  }
  const inset = Math.min(0.4, l * 0.15)
  const ux = dx / l
  const uy = dy / l
  return [
    p0,
    p1,
    [p1[0] - ux * inset + nx * TAB, p1[1] - uy * inset + ny * TAB],
    [p0[0] + ux * inset + nx * TAB, p0[1] + uy * inset + ny * TAB],
  ]
}

function where(p) {
  if (p.kind === 'vfold') return `glue across ${p.on === 'gutter' ? 'the gutter' : p.on} at ${p.at} cm; glue lines at ${p.glue[0]}° / ${p.glue[1]}° from it`
  if (p.kind === 'box' || p.kind === 'tent') return `glue across ${p.on === 'gutter' ? 'the gutter' : p.on}, ${p.span[0]}–${p.span[1]} cm along it, ${p.a} cm left / ${p.b} cm right of it`
  if (p.kind === 'flap') return `hinge on ${p.on} at (${p.at[0]}, ${p.at[1]}) cm`
  return `on ${p.on}${p.at ? ` at (${p.at[0]}, ${p.at[1]}) cm` : ''}`
}

/**
 * Render the sheet at `res` px/cm (100 ≈ 254 dpi). Returns a canvas.
 * Spread must be compiled.
 */
export function renderTemplate(spread, res = 100, title = spread.title) {
  // (res may be lowered below to fit the browser's canvas limits)
  const margin = 1.5
  const gap = 1.4
  const sheetW = 27.7 // A4 landscape printable width, cm
  // shelf-pack the cards (front only; backs are printed by turning the sheet)
  const items = spread.pieces.map((p) => {
    const b = cardBox(p)
    return { p, b, w: b.w + TAB * 2 + gap, h: b.h + TAB * 2 + gap + 0.9 }
  })
  let x = margin
  let y = margin + 2.2
  let row = 0
  for (const it of items) {
    if (x + it.w > sheetW + margin && x > margin) {
      x = margin
      y += row
      row = 0
    }
    it.x = x + TAB
    it.y = y + TAB
    x += it.w
    row = Math.max(row, it.h)
  }
  const H = y + row + margin + 1.6
  const W = sheetW + margin * 2
  // stay under the strictest browser canvas limit (iOS: 16.7 MP)
  res = Math.min(res, Math.sqrt(14e6 / (W * H)))
  const canvas = makeCanvas(Math.ceil(W * res), Math.ceil(H * res))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.scale(res, res)
  ctx.fillStyle = '#2a2826'
  ctx.font = '0.7px "Caprasimo"'
  ctx.fillText(`Sixty-Five · ${title}`, margin, margin + 0.6)
  ctx.font = '0.32px "Fragment Mono"'
  ctx.fillText('print at 100 % on card · cut the solid lines · valley-fold the dashed · mountain-fold the dash-dot · glue the tabs', margin, margin + 1.25)
  for (const it of items) {
    const { p, b } = it
    const ox = it.x - b.x0
    const oy = it.y - b.y0
    ctx.save()
    ctx.translate(ox, oy)
    // glue tabs first, under the card
    ctx.fillStyle = '#e7f1e3'
    ctx.strokeStyle = '#2a2826'
    ctx.lineWidth = 0.02
    for (const g of p.lines.glue) {
      const t = tab(p.outline, g.p0, g.p1)
      ctx.beginPath()
      t.forEach(([tx, ty], i) => (i ? ctx.lineTo(tx, ty) : ctx.moveTo(tx, ty)))
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.save()
      ctx.clip()
      ctx.strokeStyle = 'rgba(46,125,50,0.5)'
      for (let k = -20; k < 20; k += 0.25) {
        ctx.beginPath()
        ctx.moveTo(g.p0[0] + k, g.p0[1] - 10)
        ctx.lineTo(g.p0[0] + k + 10, g.p0[1])
        ctx.stroke()
      }
      ctx.restore()
    }
    // the printed front, clipped to the cut
    const face = printFace(p.front, b, { res: Math.min(res, 60), paper: 'white', seed: hashString(`${spread.id}:${p.id}:front`) })
    // the card is its panels (a foot drawn below a glue line is clipped off
    // in the book too); cut along their edges except where two panels meet
    // at a fold
    const path = new Path2D()
    for (const pn of p.panels) {
      for (const loop of [pn.poly, ...pn.holes]) {
        loop.forEach(([lx, ly], i) => (i ? path.lineTo(lx, ly) : path.moveTo(lx, ly)))
        path.closePath()
      }
    }
    ctx.save()
    ctx.clip(path, 'evenodd')
    const fr = Math.min(res, 60)
    ctx.drawImage(face, b.x0 - 1 / fr, b.y0 - 1 / fr, face.width / fr, face.height / fr)
    ctx.restore()
    ctx.lineWidth = 0.035
    ctx.strokeStyle = '#111'
    const onFold = (a, c) =>
      p.lines.folds.some((l) => {
        const dx = l.p1[0] - l.p0[0]
        const dy = l.p1[1] - l.p0[1]
        const L = Math.hypot(dx, dy) || 1
        const off = (q) => Math.abs((q[0] - l.p0[0]) * dy - (q[1] - l.p0[1]) * dx) / L
        return off(a) < 0.01 && off(c) < 0.01
      })
    ctx.beginPath()
    for (const pn of p.panels) {
      for (const loop of [pn.poly, ...pn.holes]) {
        for (let i = 0; i < loop.length; i++) {
          const a = loop[i]
          const c = loop[(i + 1) % loop.length]
          if (onFold(a, c)) continue
          ctx.moveTo(a[0], a[1])
          ctx.lineTo(c[0], c[1])
        }
      }
    }
    ctx.stroke()
    for (const l of p.lines.folds) {
      ctx.setLineDash(l.type === 'mountain' ? [0.3, 0.12, 0.05, 0.12] : [0.22, 0.12])
      ctx.strokeStyle = l.type === 'mountain' ? '#c2185b' : '#1565c0'
      ctx.lineWidth = 0.04
      ctx.beginPath()
      ctx.moveTo(l.p0[0], l.p0[1])
      ctx.lineTo(l.p1[0], l.p1[1])
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()
    ctx.fillStyle = '#2a2826'
    ctx.font = '0.3px "Fragment Mono"'
    ctx.fillText(`${p.id} · ${p.kind} — ${where(p)}`, it.x - TAB, it.y + b.h + TAB + 0.55)
  }
  ctx.font = '0.26px "Fragment Mono"'
  ctx.fillStyle = 'rgba(42,40,38,0.7)'
  ctx.fillText('the book page is 20 × 26 cm per side; distances are from the spine (gutter) and the head of the page', margin, H - margin)
  return canvas
}
