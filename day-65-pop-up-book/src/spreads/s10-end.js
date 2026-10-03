// The last spread. On the left, the colophon: how the book was made, counted
// from the book itself, with the press's colour bar of every ink it used. On
// the right, Day 66: a blank card that stands up off the page for the reader
// to draw on (the drawing stays in their browser), and a ribbon to close the
// book the way the opening one opened it.

import { H, W } from '../paper/dims.js'
import { INKS } from '../art/riso.js'
import { SERIES } from '../data/days.js'
import { CHAPTERS } from './chapters.js'
import { BOOK } from './registry.js'
import { M, folio, runningHead } from './furniture.js'

const INK = { main: 'federal', hot: 'pink', sun: 'yellow', key: 'black' }

// leaning back 3°, so its foot follows the glue lines down to each corner
const LEAN = 93
const FOOT = -7.4 / Math.tan((LEAN * Math.PI) / 180)
const CARD = [
  [-7.4, FOOT],
  [-7.4, -10.6],
  [7.4, -10.6],
  [7.4, FOOT],
  [0, 0],
]

const RIBBON = [
  [-6.2, -2.1],
  [-5.4, -1.05],
  [-6.2, 0],
  [6.2, 0],
  [5.4, -1.05],
  [6.2, -2.1],
]

function fmtDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]
  return `${d} ${month} ${y}`
}

/** Counted from the book itself at print time. */
function census() {
  const spreads = BOOK.spreads
  let pieces = 0
  let mechanisms = 0
  for (const s of spreads) {
    for (const p of s.pieces ?? []) {
      pieces++
      if (p.kind === 'flap' || p.kind === 'wheel' || p.kind === 'slider') mechanisms++
    }
  }
  const inks = new Set(CHAPTERS.flatMap((c) => c.inks))
  for (const k of Object.values(INK)) inks.add(k)
  return { pieces, mechanisms, inks: [...inks] }
}

function colophon(g) {
  runningHead(g, 'Colophon', 'L', INK.main)
  const x = M.outer
  g.text(INK.main, 'Colophon', x, 4.1, { kind: 'display', size: 1.45 })
  const c = census()
  g.para(
    INK.key,
    `Set in Caprasimo, Newsreader and Fragment Mono. Printed by a small riso press written in JavaScript, in ${c.inks.length} inks on cream stock, and cut by a computer that has never held a knife. Every one of its ${c.pieces} pieces was checked to fold flat when the book shuts and to open without tearing.`,
    x,
    5.6,
    10.6,
    { size: 0.4, leading: 0.56 },
  )
  // the numbers, as a little table
  const rows = [
    ['days', String(SERIES.days)],
    ['commits', String(SERIES.commits)],
    ['chapters', String(CHAPTERS.length)],
    ['pop-up pieces', String(c.pieces)],
    ['things to pull, spin or lift', String(c.mechanisms)],
    ['first day shipped', fmtDate(SERIES.firstShipped)],
    ['last day shipped', fmtDate(SERIES.lastShipped)],
  ]
  let y = 11.2
  for (const [k, v] of rows) {
    g.text(INK.key, k, x, y, { kind: 'mono', size: 0.27, tone: 0.75 })
    g.text(INK.main, v, x + 10.6, y, { kind: 'serif', size: 0.4, weight: 600, align: 'right' })
    g.ink(INK.key, (ctx) => {
      ctx.fillStyle = g.tone(0.35)
      ctx.fillRect(x, y + 0.2, 10.6, 0.018)
    })
    y += 0.72
  }
  g.text(INK.hot, 'Thank you for reading.', x, y + 1.0, { kind: 'serif', size: 0.52, italic: true })
  g.text(INK.key, '— S.B., day 65', x, y + 1.65, { kind: 'mono', size: 0.28, tone: 0.8 })
  // the press's colour bar: a swatch of every ink in the book, as printers
  // leave in the trim
  const inks = c.inks
  const sw = Math.min(1.05, (W - M.outer * 2) / inks.length - 0.08)
  inks.forEach((ink, i) => {
    const sx = x + i * (sw + 0.08)
    g.fill(ink, [[sx, H - 2.55], [sx + sw, H - 2.55], [sx + sw, H - 1.75], [sx, H - 1.75]])
    g.text(INK.key, ink, sx + sw / 2, H - 1.45, { kind: 'mono', size: 0.16, align: 'center', tone: 0.7, maxWidth: sw })
  })
  // registration mark
  g.ink(INK.key, (ctx) => {
    ctx.lineWidth = 0.025
    ctx.beginPath()
    ctx.arc(W - 1.4, H - 2.15, 0.32, 0, Math.PI * 2)
    ctx.moveTo(W - 1.9, H - 2.15)
    ctx.lineTo(W - 0.9, H - 2.15)
    ctx.moveTo(W - 1.4, H - 2.65)
    ctx.lineTo(W - 1.4, H - 1.65)
    ctx.stroke()
  })
  folio(g, 20, 'L', INK.main)
  void INKS
}

function daySixtySix(g) {
  runningHead(g, 'Day 66', 'R', INK.main)
  const x = W - M.outer
  // a big, quiet 66 under everything, in a pale tint
  g.text(INK.sun, '66', W - 0.8, 9.4, { kind: 'display', size: 8.6, align: 'right', tone: 0.55 })
  g.text(INK.main, 'Day 66', x, 21.3, { kind: 'display', size: 1.6, align: 'right' })
  g.para(INK.key, 'The next page is blank on purpose.', 8.2, 22.3, 10.3, { size: 0.42, italic: true })
  g.para(INK.key, 'Pick up the pencil and draw on the card: what comes after sixty-five? It stays here, in this book, in this browser.', 8.2, 22.95, 10.3, { size: 0.36, leading: 0.5, tone: 0.9 })
  folio(g, 21, 'R', INK.main)
}

export default {
  id: 'end',
  title: 'Day 66',
  inks: Object.values(INK),
  paper: 'cream',
  card: 'white',
  pages: { L: colophon, R: daySixtySix },
  pieces: [
    {
      id: 'blank',
      kind: 'vfold',
      on: 'gutter',
      at: 13.6,
      glue: [44, 44],
      angle: [LEAN, LEAN],
      outline: CARD,
      // the reader draws on its front
      draw: true,
      front(g) {
        // crop marks in the corners, nothing else
        g.ink(INK.key, (ctx) => {
          ctx.lineWidth = 0.02
          ctx.strokeStyle = g.tone(0.45)
          for (const [cx, cy, sx, sy] of [
            [-7.0, -10.2, 1, 1],
            [7.0, -10.2, -1, 1],
            [-7.0, -0.4, 1, -1],
            [7.0, -0.4, -1, -1],
          ]) {
            ctx.beginPath()
            ctx.moveTo(cx, cy + sy * 0.5)
            ctx.lineTo(cx, cy)
            ctx.lineTo(cx + sx * 0.5, cy)
            ctx.stroke()
          }
        })
      },
      back(g) {
        g.fill(INK.hot, CARD, 0.3)
        g.text(INK.main, 'DAY 66 · YOURS', 0, -5, { kind: 'mono', size: 0.5, align: 'center', tracking: 0.2 })
      },
    },
    {
      id: 'ribbon',
      kind: 'vfold',
      on: 'gutter',
      at: 18.4,
      glue: [56, 56],
      angle: [90, 90],
      outline: RIBBON,
      front(g) {
        g.fill(INK.hot, RIBBON)
        g.text(INK.sun, 'TO BE CONTINUED', 0, -0.82, { kind: 'mono', size: 0.46, align: 'center', tracking: 0.14 })
      },
      back(g) {
        g.fill(INK.main, RIBBON, 0.6)
      },
    },
  ],
  spots: [],
}
