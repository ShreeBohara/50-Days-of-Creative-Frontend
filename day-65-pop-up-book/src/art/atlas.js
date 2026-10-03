// Card atlas layout. Every card face of a spread (front and back of each
// piece) is packed into one square sheet measured in CENTIMETRES, so the same
// layout — and the same uvs baked into the card geometry — serve a 256 px
// thumbnail sheet and a 2048 px full print alike.

import { cardBox } from './printSpread.js'

const PAD = 0.12 // cm of bleed between faces

/**
 * layoutAtlas(spread) → { size, rects } where size is the sheet's side in cm
 * and rects maps `${pieceId}:front|back` → { x, y, box } (top-left in cm).
 * Shelf packing, tallest first: deterministic for a given spread.
 */
export function layoutAtlas(spread) {
  const items = []
  for (const p of spread.pieces) {
    const box = cardBox(p)
    for (const face of ['front', 'back']) items.push({ key: `${p.id}:${face}`, box, w: box.w + PAD * 2, h: box.h + PAD * 2 })
  }
  if (!items.length) return { size: 1, rects: new Map() }
  items.sort((a, b) => b.h - a.h || b.w - a.w || (a.key < b.key ? -1 : 1))
  const area = items.reduce((s, it) => s + it.w * it.h, 0)
  const widest = Math.max(...items.map((it) => it.w))
  // grow the sheet until the shelves fit inside a square
  let side = Math.max(widest, Math.sqrt(area) * 1.05)
  for (let tries = 0; tries < 60; tries++) {
    const rects = new Map()
    let x = 0
    let y = 0
    let shelf = 0
    for (const it of items) {
      if (x + it.w > side) {
        x = 0
        y += shelf
        shelf = 0
      }
      rects.set(it.key, { x: x + PAD, y: y + PAD, box: it.box })
      x += it.w
      shelf = Math.max(shelf, it.h)
    }
    if (y + shelf <= side) return { size: side, rects }
    side *= 1.04
  }
  throw new Error(`${spread.id}: atlas layout failed`)
}

/** uv (canvas-down v) of card point (x, y) on a face rect of a sheet `size` cm. */
export function atlasUV(rect, size, x, y, back) {
  const b = rect.box
  // backs are painted as seen flipped over left-to-right
  const cx = back ? b.x0 + b.w - (x - b.x0) : x
  return [(rect.x + (cx - b.x0)) / size, (rect.y + (y - b.y0)) / size]
}
