// Shared page furniture for every spread: margins, folios, the printed index
// of days (which doubles as the tappable hotspots), and a few shape helpers.

import { DAYS } from '../data/days.js'
import { H, W } from '../paper/dims.js'

/** Page margins in cm. Keep text out of the gutter zone: pop-ups stand there. */
export const M = { outer: 1.5, head: 1.4, tail: 1.6, gutter: 1.4 }

export const dayById = new Map(DAYS.map((d) => [d.n, d]))
export const pad2 = (n) => String(n).padStart(2, '0')

/** Page number at the foot's outer corner. side: 'L' | 'R'. */
export function folio(g, n, side, ink = 'black') {
  const x = side === 'L' ? M.outer : W - M.outer
  g.text(ink, String(n), x, H - 0.75, { kind: 'mono', size: 0.3, align: side === 'L' ? 'left' : 'right', tone: 0.85 })
}

/** Small running head along the top outer edge. */
export function runningHead(g, text, side, ink = 'black') {
  const x = side === 'L' ? M.outer : W - M.outer
  g.text(ink, text.toUpperCase(), x, 0.95, { kind: 'mono', size: 0.24, align: side === 'L' ? 'left' : 'right', tracking: 0.18, tone: 0.8 })
}

/**
 * A printed list of days that is also tappable. Each entry: the day's number
 * in display type, its short name, and its tech in small mono.
 *
 *   const idx = dayIndex({ days: [3, 18], side: 'L', x: 1.5, y: 14, width: 8, accent: 'pink', ink: 'federal' })
 *   pages.L = (g) => { …; idx.paint(g) }
 *   spots: [...idx.spots]
 *
 * opts.cols splits the list into columns; opts.gap is the entry pitch (cm).
 */
export function dayIndex({ days, side, x, y, width, ink = 'black', accent = ink, cols = 1, gap = 1.22, size = 0.4 }) {
  const per = Math.ceil(days.length / cols)
  const colW = width / cols
  const entries = days.map((n, i) => {
    const c = Math.floor(i / per)
    const r = i % per
    return { n, x: x + c * colW, y: y + r * gap }
  })
  return {
    entries,
    paint(g) {
      for (const e of entries) {
        const d = dayById.get(e.n)
        if (!d) continue
        g.text(accent, pad2(e.n), e.x, e.y + size * 1.15, { kind: 'display', size: size * 1.55 })
        const tx = e.x + size * 2.25
        g.text(ink, d.short, tx, e.y + size * 0.62, { kind: 'serif', size, weight: 600, maxWidth: colW - size * 2.6 })
        g.text(ink, d.tech.slice(0, 3).join(' · '), tx, e.y + size * 1.45, { kind: 'mono', size: size * 0.52, tone: 0.75, maxWidth: colW - size * 2.6 })
      }
    },
    spots: entries.map((e) => ({ day: e.n, on: `page:${side}`, rect: [e.x - 0.15, e.y - 0.2, colW - 0.1, gap - 0.04] })),
  }
}

/** A starburst polygon. */
export function starburst(cx, cy, ro, ri, spikes, rot = 0) {
  const out = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? ri : ro
    const t = rot + (i / (spikes * 2)) * Math.PI * 2
    out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r])
  }
  return out
}

/** Points of a regular polygon / circle approximation. */
export function ngon(cx, cy, r, n, rot = 0) {
  return Array.from({ length: n }, (_, i) => {
    const t = rot + (i / n) * Math.PI * 2
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r]
  })
}

/** Scatter of small marks (stars, confetti) — deterministic with g.rng. */
export function scatter(g, count, x0, y0, x1, y1, fn) {
  for (let i = 0; i < count; i++) fn(g.rng.range(x0, x1), g.rng.range(y0, y1), i)
}
