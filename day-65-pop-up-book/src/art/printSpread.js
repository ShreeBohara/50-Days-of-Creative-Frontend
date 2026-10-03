// Print every surface of a spread: both pages and the front and back of each
// pop-up card. Seeds come from ids, so a sheet prints identically every time.

import { H, W } from '../paper/dims.js'
import { hashString } from './rng.js'
import { printFace } from './riso.js'

/** Card-space bounds a piece's art must cover (its outline, plus a hair). */
export function cardBox(piece) {
  const b = piece.box
  const pad = 0.05
  return { x0: b.x0 - pad, y0: b.y0 - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
}

export const PAGE_BOX = { x0: 0, y0: 0, w: W, h: H }

/**
 * opts.res     px per cm for cards; opts.pageRes for pages
 * opts.only    optional set of 'page:L' | 'page:R' | pieceId to print
 */
export function printSpread(spread, opts = {}) {
  const res = opts.res ?? 40
  const pageRes = opts.pageRes ?? res
  const paper = spread.paper ?? 'cream'
  const card = spread.card ?? 'white'
  const want = (k) => !opts.only || opts.only.has(k)
  const out = { pages: {}, cards: new Map() }
  for (const side of ['L', 'R']) {
    if (!want(`page:${side}`)) continue
    out.pages[side] = printFace(spread.pages?.[side], PAGE_BOX, {
      res: pageRes,
      paper,
      seed: hashString(`${spread.id}:page:${side}`),
    })
  }
  for (const p of spread.pieces) {
    if (!want(p.id)) continue
    const box = cardBox(p)
    const stock = p.paper ?? card
    out.cards.set(p.id, {
      box,
      front: printFace(p.front, box, { res, paper: stock, seed: hashString(`${spread.id}:${p.id}:front`) }),
      back: printFace(p.back, box, { res, paper: stock, seed: hashString(`${spread.id}:${p.id}:back`) }),
    })
  }
  return out
}
