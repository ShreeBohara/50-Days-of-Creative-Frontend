// Print jobs, shared by the printing worker and the main-thread fallback.
// Each returns canvases; the caller turns them into textures.

import { H, W } from '../paper/dims.js'
import { hashString } from './rng.js'
import { makeCanvas, PAPERS, printFace } from './riso.js'
import { PAGE_BOX } from './printSpread.js'
import { layoutAtlas } from './atlas.js'

/** Both pages of a spread at `res` px/cm. */
export function printPages(spread, res) {
  const paper = spread.paper ?? 'cream'
  const out = {}
  for (const side of ['L', 'R']) {
    out[side] = printFace(spread.pages?.[side], PAGE_BOX, { res, paper, seed: hashString(`${spread.id}:page:${side}`) })
  }
  return out
}

/** Every card face of a spread on one square sheet `px` pixels wide. */
export function printAtlas(spread, px, layout = layoutAtlas(spread)) {
  const res = px / layout.size
  const sheet = makeCanvas(px, px)
  const ctx = sheet.getContext('2d')
  ctx.fillStyle = PAPERS[spread.card ?? 'white'] ?? PAPERS.white
  ctx.fillRect(0, 0, px, px)
  for (const p of spread.pieces) {
    for (const face of ['front', 'back']) {
      const r = layout.rects.get(`${p.id}:${face}`)
      const img = printFace(p[face], r.box, {
        res,
        paper: p.paper ?? spread.card ?? 'white',
        seed: hashString(`${spread.id}:${p.id}:${face}`),
      })
      ctx.drawImage(img, Math.round(r.x * res) - 1, Math.round(r.y * res) - 1)
    }
  }
  return sheet
}

/** The outside of the covers: { front, back, spine } at res px/cm. */
export function printCover(cover, res) {
  const box = { x0: 0, y0: 0, w: W + cover.overhang, h: H + cover.overhang * 2 }
  return {
    front: printFace(cover.front, box, { res, paper: cover.cloth, seed: 6501, misregister: 0.02 }),
    back: printFace(cover.back, box, { res, paper: cover.cloth, seed: 6502, misregister: 0.02 }),
  }
}
