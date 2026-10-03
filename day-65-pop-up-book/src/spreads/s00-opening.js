// Spread 0 — the opening. Contents on the left, the title page on the right,
// and across the gutter a die-cut "65" standing in front of a sunburst, with
// a banner at its feet. This file is also the worked example the other
// spreads follow: every piece is a plain object, every surface a painter.

import { trace } from '../art/trace.js'
import { W } from '../paper/dims.js'
import { CHAPTERS, chapterSpread, folios } from './chapters.js'
import { M, starburst } from './furniture.js'

const INK = { main: 'federal', hot: 'pink', sun: 'yellow' }

// --- the "65": Caprasimo numerals standing on a shared base strip, cut with a
// sticker margin all round. Traced once fonts are ready (compile time).
const NUM_BOX = { x0: -9.2, y0: -14.2, w: 18.4, h: 14.4 }
function drawNumerals(ctx, stroke) {
  ctx.font = '12.6px "Caprasimo"'
  ctx.textBaseline = 'alphabetic'
  ctx.lineJoin = 'round'
  ctx.textAlign = 'right'
  if (stroke) {
    ctx.lineWidth = stroke
    ctx.strokeText('6', 0.15, -1.1)
  }
  ctx.fillText('6', 0.15, -1.1)
  ctx.textAlign = 'left'
  if (stroke) ctx.strokeText('5', -0.15, -1.1)
  ctx.fillText('5', -0.15, -1.1)
}

const sixtyFive = {
  id: 'sixtyfive',
  kind: 'vfold',
  on: 'gutter',
  at: 13.2,
  glue: [46, 46],
  angle: [90, 90],
  // a base strip joins the numerals across the crease: a card is one piece
  outline: () =>
    trace(NUM_BOX, (ctx) => {
      drawNumerals(ctx, 0.9)
      ctx.beginPath()
      ctx.roundRect(-7.4, -2.6, 14.8, 2.6, 0.5)
      ctx.fill()
    }),
  front(g) {
    // halftone sun glow behind the numerals, then the numerals overprinted
    g.glow(INK.sun, [[-10, -15], [10, -15], [10, 1], [-10, 1]], 0, -6, 9, 0.85, 0.15)
    // blue offset shadow, knocked out under the pink so the pink prints clean
    g.ink(INK.main, (ctx) => {
      ctx.translate(0.32, 0.28)
      drawNumerals(ctx, 0)
    })
    g.knock(INK.main, (ctx) => drawNumerals(ctx, 0))
    g.knock(INK.sun, (ctx) => drawNumerals(ctx, 0))
    g.ink(INK.hot, (ctx) => drawNumerals(ctx, 0))
    g.ink(INK.main, (ctx) => {
      ctx.fillRect(-7.4, -2.6, 14.8, 2.6)
    })
    // the numerals stand on the strip, printed clean over it
    g.knock(INK.main, (ctx) => drawNumerals(ctx, 0))
    g.text(INK.sun, 'DAYS 01 — 64  +  ONE', 0, -0.85, { kind: 'mono', size: 0.5, align: 'center', tracking: 0.12 })
  },
  back(g) {
    g.fill(INK.main, [[-10, -15], [10, -15], [10, 1], [-10, 1]], 0.22)
    g.text(INK.main, 'fold here, gently', 0, -1.4, { kind: 'serif', size: 0.4, italic: true, align: 'center', tone: 0.6 })
  },
}

const burst = {
  id: 'burst',
  kind: 'vfold',
  on: 'gutter',
  at: 10.6,
  glue: [68, 68],
  angle: [104, 104],
  outline: starburst(0, 0, 10.2, 8.3, 28, -Math.PI / 2),
  front(g) {
    // alternating rays in two inks, a pink core
    g.ink(INK.sun, (ctx) => {
      for (let i = 0; i < 28; i++) {
        const t0 = -Math.PI / 2 + (i / 28) * Math.PI * 2
        const t1 = t0 + Math.PI / 28
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, 12, t0, t1)
        ctx.closePath()
        ctx.fill()
      }
    })
    g.glow(INK.hot, starburst(0, 0, 10.2, 8.3, 28, -Math.PI / 2), 0, 0, 10.2, 0.95, 0.05)
    g.ink(INK.main, (ctx) => {
      for (let r = 9.2; r > 0; r -= 0.9) {
        ctx.beginPath()
        ctx.arc(0, 0, r, Math.PI, Math.PI * 2)
        ctx.lineWidth = 0.05
        ctx.stroke()
      }
    })
  },
  back(g) {
    g.fill(INK.sun, starburst(0, 0, 10.2, 8.3, 28, -Math.PI / 2), 0.35)
  },
}

const RIBBON = [
  [-7.4, -2.3],
  [-6.5, -1.15],
  [-7.4, 0],
  [7.4, 0],
  [6.5, -1.15],
  [7.4, -2.3],
]

const banner = {
  id: 'banner',
  kind: 'vfold',
  on: 'gutter',
  at: 17.4,
  glue: [54, 54],
  angle: [90, 90],
  // a ribbon with forked tails, standing on its straight lower edge
  outline: RIBBON,
  front(g) {
    g.fill(INK.main, RIBBON)
    g.text(INK.sun, 'A POP-UP BOOK IN NINE CHAPTERS', 0, -0.95, { kind: 'mono', size: 0.44, align: 'center', tracking: 0.08 })
  },
  back(g) {
    g.fill(INK.hot, RIBBON, 0.5)
  },
}

// --- contents (left page) ------------------------------------------------
const TOC_Y = 9.6
const TOC_GAP = 1.36
const tocSpots = CHAPTERS.map((c, i) => ({
  goto: chapterSpread(i),
  on: 'page:L',
  rect: [M.outer - 0.1, TOC_Y + i * TOC_GAP - 0.95, 9.8, TOC_GAP - 0.06],
}))

function contents(g) {
  g.text(INK.main, 'Contents', M.outer, 4.2, { kind: 'display', size: 1.5 })
  g.text(INK.hot, 'what the sixty-five days became', M.outer, 5.2, { kind: 'serif', size: 0.46, italic: true })
  // a pink rule with a yellow shadow, slightly off register on purpose
  g.fill(INK.sun, [[M.outer + 0.08, 6.18], [M.outer + 9.08, 6.18], [M.outer + 9.08, 6.32], [M.outer + 0.08, 6.32]])
  g.fill(INK.hot, [[M.outer, 6.05], [M.outer + 9, 6.05], [M.outer + 9, 6.17], [M.outer, 6.17]])
  CHAPTERS.forEach((c, i) => {
    const y = TOC_Y + i * TOC_GAP
    const [pl] = folios(chapterSpread(i))
    g.text(INK.hot, c.numeral, M.outer + 0.9, y, { kind: 'display', size: 0.62, align: 'right' })
    g.text(INK.main, c.title, M.outer + 1.4, y, { kind: 'serif', size: 0.56, weight: 560 })
    const w = g.measure(c.title, { kind: 'serif', size: 0.56, weight: 560 })
    // dot leaders to the page number
    g.ink(INK.main, (ctx) => {
      ctx.fillStyle = g.tone(0.7)
      for (let x = M.outer + 1.6 + w; x < M.outer + 8.6; x += 0.28) {
        ctx.beginPath()
        ctx.arc(x, y - 0.08, 0.035, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    g.text(INK.main, String(pl), M.outer + 9.4, y, { kind: 'mono', size: 0.4, align: 'right' })
    g.text(INK.main, `${c.days.length} days`, M.outer + 1.4, y + 0.42, { kind: 'mono', size: 0.24, tone: 0.65 })
  })
  g.para(
    INK.main,
    'Turn a page by its corner, or with the arrow keys. Tap a day in a chapter’s index, or a piece that shows it, to open that day. Some pages hide a tab, a wheel or a flap.',
    M.outer,
    22.9,
    9.4,
    { size: 0.36, italic: true, tone: 0.85 },
  )
}

function titlePage(g) {
  // confetti in the margins
  for (let i = 0; i < 46; i++) {
    const x = g.rng.range(1, W - 1)
    const y = g.rng.range(1, 18.5)
    if (x < 10 && y > 8) continue // keep the pop-up's footprint calm
    const ink = g.rng.pick([INK.hot, INK.sun, INK.main])
    const a = g.rng.range(0, Math.PI)
    g.ink(ink, (ctx) => {
      ctx.translate(x, y)
      ctx.rotate(a)
      ctx.fillRect(-0.22, -0.07, 0.44, 0.14)
    })
  }
  const x = W - M.outer
  const title = { kind: 'display', size: 2.5, align: 'right' }
  g.text(INK.sun, 'Sixty-Five', x + 0.09, 21.39, title)
  g.knock(INK.sun, (ctx) => {
    ctx.font = g.font('display', 250)
    ctx.textAlign = 'right'
    ctx.translate(x, 21.3)
    ctx.scale(0.01, 0.01)
    ctx.fillText('Sixty-Five', 0, 0)
  })
  g.text(INK.main, 'Sixty-Five', x, 21.3, title)
  g.text(INK.hot, 'a pop-up book of sixty-five days of creative frontend', x, 22.3, { kind: 'serif', size: 0.48, italic: true, align: 'right' })
  g.text(INK.main, 'SHREE BOHARA', x, 23.55, { kind: 'mono', size: 0.36, align: 'right', tracking: 0.2 })
  g.text(INK.main, 'printed in riso on card · day 65 · october 2026', x, 24.1, { kind: 'mono', size: 0.24, align: 'right', tone: 0.7 })
}

export default {
  id: 'opening',
  title: 'Sixty-Five',
  inks: [INK.main, INK.hot, INK.sun],
  paper: 'cream',
  card: 'white',
  pages: { L: contents, R: titlePage },
  pieces: [burst, sixtyFive, banner],
  spots: [...tocSpots],
}
