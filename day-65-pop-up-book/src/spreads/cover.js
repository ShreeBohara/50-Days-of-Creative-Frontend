// The outside of the boards. The front is a calendar of the series: sixty-four
// numbered tiles, each printed in its chapter's ink, under the title — the
// book's contents at a glance, before it is opened.

import { CHAPTERS } from './chapters.js'
import { W } from '../paper/dims.js'

const OVERHANG = 0.3
const chapterOf = new Map(CHAPTERS.flatMap((c) => c.days.map((n) => [n, c])))

function front(g) {
  const w = W + OVERHANG
  const cols = 8
  const tile = 1.95
  const gap = 0.22
  const gridW = cols * tile + (cols - 1) * gap
  const x0 = (w - gridW) / 2 + 0.25
  const y0 = 8.4
  for (let n = 1; n <= 64; n++) {
    const c = chapterOf.get(n)
    const i = n - 1
    const x = x0 + (i % cols) * (tile + gap)
    const y = y0 + Math.floor(i / cols) * (tile + gap)
    const [a, b] = c.inks
    const label = String(n).padStart(2, '0')
    // solid tile in the chapter's first ink, its number knocked out to paper,
    // a thin second-ink tick in the corner
    g.ink(a, (ctx) => {
      ctx.beginPath()
      ctx.roundRect(x, y, tile, tile, 0.18)
      ctx.fill()
    })
    g.knock(a, (ctx) => {
      ctx.font = g.font('display', 92)
      ctx.textAlign = 'center'
      ctx.translate(x + tile / 2, y + tile * 0.7)
      ctx.scale(0.01, 0.01)
      ctx.fillText(label, 0, 0)
    })
    g.ink(b, (ctx) => {
      ctx.fillRect(x + tile - 0.5, y + 0.22, 0.32, 0.08)
    })
  }
  // the title, pink with a federal shadow knocked clean
  const tx = 1.6
  const title = { kind: 'display', size: 3.1 }
  g.text('federal', 'Sixty-Five', tx + 0.12, 4.92, title)
  g.knock('federal', (ctx) => {
    ctx.font = g.font('display', 310)
    ctx.translate(tx, 4.8)
    ctx.scale(0.01, 0.01)
    ctx.fillText('Sixty-Five', 0, 0)
  })
  g.text('pink', 'Sixty-Five', tx, 4.8, title)
  g.text('federal', 'a pop-up book of sixty-five days', tx + 0.05, 6.15, { kind: 'serif', size: 0.62, italic: true })
  g.text('federal', 'SHREE BOHARA', w - 1.4, 26.1, { kind: 'mono', size: 0.36, align: 'right', tracking: 0.22 })
  g.text('pink', 'DAY 65', 1.6, 26.1, { kind: 'mono', size: 0.36, tracking: 0.22 })
  // a yellow sticker over the corner of the calendar: the sixty-fifth tile is
  // this book. It is its own paper, so nothing under it prints through.
  const star = (ctx) => {
    ctx.translate(w - 2.55, 8.75)
    ctx.rotate(0.18)
    ctx.beginPath()
    for (let i = 0; i < 40; i++) {
      const r = i % 2 ? 1.55 : 1.85
      const t = (i / 40) * Math.PI * 2
      ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r)
    }
    ctx.closePath()
    ctx.fill()
  }
  for (const ink of new Set(CHAPTERS.flatMap((c) => c.inks))) g.knock(ink, star)
  g.ink('yellow', star)
  g.text('federal', '65', w - 2.55, 9.2, { kind: 'display', size: 1.25, align: 'center' })
  g.text('federal', 'POP-UP', w - 2.55, 7.85, { kind: 'mono', size: 0.26, align: 'center', tracking: 0.15 })
}

function back(g) {
  const w = W + OVERHANG
  g.para(
    'federal',
    'Sixty-four small websites, one a day, from a particle headline to a mended tea bowl. Here they stand up off the page: nine chapters of paper, printed in riso and cut to fold.',
    1.8,
    4,
    w - 3.6,
    { size: 0.55, italic: true, leading: 0.78 },
  )
  // a make-believe barcode
  g.ink('federal', (ctx) => {
    let x = w - 6.4
    for (let i = 0; i < 46; i++) {
      const bw = g.rng.pick([0.04, 0.06, 0.09])
      ctx.fillRect(x, 22.4, bw, 2.2)
      x += bw + g.rng.pick([0.04, 0.06])
    }
  })
  g.text('federal', '9 780065 065065', w - 4.9, 25.15, { kind: 'mono', size: 0.28, align: 'center' })
}

export const COVER = { overhang: OVERHANG, cloth: 'cream', front, back }
