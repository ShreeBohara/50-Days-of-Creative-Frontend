// Chapter VI — Machines & Games. An arcade at the edge of a city.
//
// Across the gutter, back to front: a skyline of isometric towers that is also
// a sorting race (days 16 and 17; bubble sort on the left wing, still a mess,
// quicksort on the right, nearly done) under a pixel sun (day 32); the VOLTAGE
// cabinet (day 60), its screen running a Route Lab maze (day 38); and at its
// feet the HEAVY letters, tumbling as if Matter.js had just let go (day 51).
// The floor is a maze solved toward the cabinet: its route runs off the board
// and ends in a coin at the coin door.
//
// Left page: the top card of a Celestial Arcana deck (day 12) is a flap that
// turns like a little page, and the deck fans up out of its hinge. Right page:
// the periodic table (day 10) and a scoreboard whose INSERT COIN pull-tab pays
// out the high score spelled in element tiles: H I S Co Re.

import { trace } from '../art/trace.js'
import { roundRect } from '../paper/polygon.js'
import { CHAPTERS, folios } from './chapters.js'
import { M, dayIndex, folio, runningHead } from './furniture.js'

const CH = CHAPTERS[5]
const [pl, pr] = folios(6)
const R = 'red'
const B = 'blue'
const Y = 'yellow'
const DEG = Math.PI / 180
const BIG = [[-30, -30], [30, -30], [30, 30], [-30, 30]]

// ------------------------------------------------------------------ helpers

/** Seeded generator (mulberry32) so both pages share one maze. */
function rand(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const once = (fn) => {
  let v
  return () => (v ??= fn())
}

const box4 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

function poly(ctx, pts) {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

/**
 * The upright frame of one wing of a V-fold that leans back (angle β > 90).
 * A symmetric V that leans back keeps its crease in the gutter's plane of
 * symmetry, so from the reader the only lines that stand plumb are the ones
 * parallel to the crease. The frame is therefore a shear, not a rotation:
 * x runs along the glue line (outward is −x on the left wing, one unit per
 * cm along it), y runs parallel to the crease, y = 0 is the glue line and −y
 * is "up". Returned as a ctx.transform matrix into card coordinates.
 */
function wingM(side, beta) {
  const s = Math.sin(beta * DEG)
  const c = Math.cos(beta * DEG)
  return side === 'L' ? [s, c, 0, 1, 0, 0] : [s, -c, 0, 1, 0, 0]
}

/** Run fn in one wing's upright frame, clipped to that half of the card. */
function inWing(ctx, side, beta, fn) {
  ctx.save()
  ctx.beginPath()
  if (side === 'L') ctx.rect(-40, -40, 40, 80)
  else ctx.rect(0, -40, 40, 80)
  ctx.clip()
  ctx.transform(...wingM(side, beta))
  fn(ctx)
  ctx.restore()
}

/**
 * Trace a V-fold card from a drawing, clipped to the paper above its glue
 * lines and snapped so its lower edges run exactly along them (that's where
 * it is glued). Returns { outline, holes }.
 */
function vtrace(id, box, angle, draw) {
  const [ba, bb] = angle.map((d) => d * DEG)
  const dA = [-Math.sin(ba), -Math.cos(ba)]
  const dB = [Math.sin(bb), -Math.cos(bb)]
  const inward = (d) => {
    const k = -d[1]
    const n = [-k * d[0], -1 - k * d[1]]
    const l = Math.hypot(n[0], n[1]) || 1
    return [n[0] / l, n[1] / l]
  }
  const nA = inward(dA)
  const nB = inward(dB)
  const t = trace(
    box,
    (ctx) => {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(dA[0] * 60, dA[1] * 60)
      ctx.lineTo(0, 0)
      ctx.lineTo(dB[0] * 60, dB[1] * 60)
      ctx.lineTo(60, -120)
      ctx.lineTo(-60, -120)
      ctx.closePath()
      ctx.clip()
      draw(ctx)
      ctx.restore()
    },
    { res: 26, tol: 0.015 },
  )
  if (t.islands.length) console.warn(`${id}: ${t.islands.length} loose island(s) cut away`)
  const snap = ([x, y]) => {
    const d = x < 0 ? dA : dB
    const n = x < 0 ? nA : nB
    const along = x * d[0] + y * d[1]
    if (along > 0 && x * n[0] + y * n[1] < 0.05) return [d[0] * along, d[1] * along]
    return [x, y]
  }
  const clean = (loop) => {
    const out = []
    for (const p of loop.map(snap)) {
      const q = out[out.length - 1]
      if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.01) out.push(p)
    }
    return out
  }
  return { outline: clean(t.outline), holes: t.holes }
}

/** One line of type on any ctx (for painters that draw in a turned frame). */
function typeset(g, ctx, str, x, y, o = {}) {
  const { kind = 'serif', size = 0.5, weight = 400, italic = false, align = 'left', tracking = 0, tone = 1 } = o
  const S = 100
  ctx.save()
  ctx.fillStyle = g.tone(tone)
  ctx.translate(x, y)
  ctx.scale(1 / S, 1 / S)
  ctx.font = g.font(kind, size * S, { weight, italic })
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  const track = tracking * size * S
  let w = -track
  for (const ch of str) w += ctx.measureText(ch).width + track
  let x0 = align === 'center' ? -w / 2 : align === 'right' ? -w : 0
  for (const ch of str) {
    ctx.fillText(ch, x0, 0)
    x0 += ctx.measureText(ch).width + track
  }
  ctx.restore()
}

/**
 * A painter kit that draws through the affine m = [a, b, c, d, e, f], clipped
 * first (in card space) to `clip` = [x, y, w, h] if given.
 */
function turned(g, m, clip) {
  const wrap = (fn) => (ctx, kit) => {
    if (clip) {
      ctx.beginPath()
      ctx.rect(...clip)
      ctx.clip()
    }
    ctx.transform(...m)
    fn(ctx, kit)
  }
  const shape = (s, closed = true) => (Array.isArray(s) ? g.path(s, closed) : s)
  const k = {
    rng: g.rng,
    tone: g.tone,
    ink: (name, fn) => g.ink(name, wrap(fn)),
    knock: (name, fn) => g.knock(name, wrap(fn)),
    fill: (name, s, tone = 1) =>
      k.ink(name, (ctx) => {
        ctx.fillStyle = g.tone(tone)
        ctx.fill(shape(s))
      }),
    stroke: (name, s, width = 0.05, tone = 1, closed = false) =>
      k.ink(name, (ctx) => {
        ctx.strokeStyle = g.tone(tone)
        ctx.lineWidth = width
        ctx.stroke(shape(s, closed))
      }),
    circle: (name, cx, cy, r, tone = 1) =>
      k.ink(name, (ctx) => {
        ctx.fillStyle = g.tone(tone)
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      }),
    text: (name, str, x, y, o) => k.ink(name, (ctx) => typeset(g, ctx, str, x, y, o)),
    knockText: (name, str, x, y, o) => k.knock(name, (ctx) => typeset(g, ctx, str, x, y, o)),
  }
  return k
}

/** Pixel art: rows of a string, any non-'.' filled. Calls fn(x, y, ch). */
function pixels(rows, x0, y0, px, fn) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') fn(x0 + i * px, y0 + j * px, row[i])
  })
}

function pixelDisc(ctx, cx, cy, r, px) {
  for (let y = cy - r; y < cy + r; y += px) {
    for (let x = cx - r; x < cx + r; x += px) {
      if (Math.hypot(x + px / 2 - cx, y + px / 2 - cy) <= r) ctx.rect(x, y, px + 0.01, px + 0.01)
    }
  }
}

function starPath(ctx, cx, cy, r, n = 5) {
  ctx.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const t = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr)
  }
  ctx.closePath()
}

// --------------------------------------------------------------------- maze
// A recursive-backtracker maze with a few loops knocked through, solved by
// breadth-first search: the flood it explores and the path it finds are
// printed the way Route Lab drew them.

function makeMaze(cols, rows, seed, start, goal, loops = 0) {
  const rnd = rand(seed)
  const right = Array.from({ length: rows }, () => Array(cols).fill(true))
  const down = Array.from({ length: rows }, () => Array(cols).fill(true))
  const seen = new Set(['0,0'])
  const stack = [[0, 0]]
  while (stack.length) {
    const [c, r] = stack[stack.length - 1]
    const nb = [
      [c + 1, r],
      [c - 1, r],
      [c, r + 1],
      [c, r - 1],
    ].filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !seen.has(`${x},${y}`))
    if (!nb.length) {
      stack.pop()
      continue
    }
    const [x, y] = nb[Math.floor(rnd() * nb.length)]
    if (x !== c) right[r][Math.min(x, c)] = false
    else down[Math.min(y, r)][c] = false
    seen.add(`${x},${y}`)
    stack.push([x, y])
  }
  for (let i = 0; i < loops; i++) {
    const c = Math.floor(rnd() * (cols - 1))
    const r = Math.floor(rnd() * (rows - 1))
    if (rnd() < 0.5) right[r][c] = false
    else down[r][c] = false
  }
  const open = (c, r, x, y) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false
    if (x !== c) return !right[r][Math.min(x, c)]
    return !down[Math.min(y, r)][c]
  }
  const key = (c, r) => r * cols + c
  const prev = new Map([[key(...start), null]])
  const order = []
  const queue = [start]
  while (queue.length) {
    const [c, r] = queue.shift()
    order.push([c, r])
    if (c === goal[0] && r === goal[1]) break
    for (const [x, y] of [
      [c, r - 1],
      [c + 1, r],
      [c - 1, r],
      [c, r + 1],
    ]) {
      if (open(c, r, x, y) && !prev.has(key(x, y))) {
        prev.set(key(x, y), [c, r])
        queue.push([x, y])
      }
    }
  }
  const path = []
  for (let p = goal; p; p = prev.get(key(...p))) path.unshift(p)
  return { cols, rows, right, down, order, path, start, goal }
}

function mazeWalls(ctx, mz, ox, oy, s, border = true) {
  ctx.beginPath()
  for (let r = 0; r < mz.rows; r++) {
    for (let c = 0; c < mz.cols; c++) {
      const x = ox + c * s
      const y = oy + r * s
      if (c < mz.cols - 1 && mz.right[r][c]) {
        ctx.moveTo(x + s, y)
        ctx.lineTo(x + s, y + s)
      }
      if (r < mz.rows - 1 && mz.down[r][c]) {
        ctx.moveTo(x, y + s)
        ctx.lineTo(x + s, y + s)
      }
    }
  }
  if (!border) return
  // the border, open at the start (bottom) and the goal (top)
  const [sc] = mz.start
  const [gc] = mz.goal
  ctx.moveTo(ox, oy)
  ctx.lineTo(ox + gc * s, oy)
  ctx.moveTo(ox + (gc + 1) * s, oy)
  ctx.lineTo(ox + mz.cols * s, oy)
  ctx.lineTo(ox + mz.cols * s, oy + mz.rows * s)
  ctx.lineTo(ox + (sc + 1) * s, oy + mz.rows * s)
  ctx.moveTo(ox + sc * s, oy + mz.rows * s)
  ctx.lineTo(ox, oy + mz.rows * s)
  ctx.lineTo(ox, oy)
}

/** The solved route, cell centre to cell centre. `tails` runs it out of the
 *  start opening and up from the goal to page y = `tails` (a number). */
function mazePath(ctx, mz, ox, oy, s, tails = false) {
  ctx.beginPath()
  mz.path.forEach(([c, r], i) => {
    const x = ox + (c + 0.5) * s
    const y = oy + (r + 0.5) * s
    if (i) ctx.lineTo(x, y)
    else {
      ctx.moveTo(x, y + (tails ? s * 0.8 : 0))
      ctx.lineTo(x, y)
    }
  })
  if (tails) ctx.lineTo(ox + (mz.goal[0] + 0.5) * s, tails)
}

// the floor in front of the cabinet: 16 × 11 cells straddling the gutter. The
// route leaves the goal (the left page, 0.4 cm off the gutter) and runs on up
// to where the cabinet's left glue line crosses it: into the coin door.
const FLOOR = { cols: 16, rows: 11, s: 0.8, y: 15.7 }
const floorMaze = makeMaze(FLOOR.cols, FLOOR.rows, 6102, [8, 10], [7, 0], 9)
const FOOT_Y = 12.9 + 0.4 / Math.tan(60 * DEG) // the cabinet's left glue line at the goal's x
const COIN_Y = FOOT_Y + 0.36 // the coin sits right at its foot
// the cabinet's screen
const screenMaze = makeMaze(9, 4, 3801, [0, 3], [8, 0], 3)

// a little pixel runner (day 32's editor drew sprites like this)
const RUNNER = [
  '..rrr..',
  '.rrrrr.',
  'rbrrbrr',
  'rrrrrrr',
  '.ryyyr.',
  'r.r.r.r',
]

function mazeFloor(g, side) {
  const half = (FLOOR.cols / 2) * FLOOR.s
  const ox = side === 'L' ? 20 - half : -half
  const s = FLOOR.s
  g.ink(Y, (ctx) => {
    ctx.fillStyle = g.tone(0.34)
    for (const [c, r] of floorMaze.order) ctx.fillRect(ox + c * s + 0.05, FLOOR.y + r * s + 0.05, s - 0.1, s - 0.1)
  })
  g.ink(B, (ctx) => {
    ctx.strokeStyle = g.tone(0.62)
    ctx.lineWidth = 0.07
    ctx.lineCap = 'square'
    mazeWalls(ctx, floorMaze, ox, FLOOR.y, s)
    ctx.stroke()
  })
  g.ink(R, (ctx) => {
    ctx.lineWidth = 0.15
    ctx.lineJoin = 'round'
    mazePath(ctx, floorMaze, ox, FLOOR.y, s, FOOT_Y)
    ctx.stroke()
  })
  // the route ends in a coin at the cabinet's foot
  const gx = ox + (floorMaze.goal[0] + 0.5) * s
  g.knock(B, (ctx) => (ctx.beginPath(), ctx.arc(gx, COIN_Y, 0.4, 0, Math.PI * 2), ctx.fill()))
  g.circle(R, gx, COIN_Y, 0.32)
  g.knock(R, (ctx) => (ctx.beginPath(), ctx.arc(gx, COIN_Y, 0.15, 0, Math.PI * 2), ctx.fill()))
  g.circle(Y, gx, COIN_Y, 0.15)
  // the runner, a few cells into its walk
  const [rc, rr] = floorMaze.path[4]
  const px = 0.1
  const rx = ox + (rc + 0.5) * s - 3.5 * px
  const ry = FLOOR.y + (rr + 0.5) * s - 3 * px
  g.knock(R, (ctx) => ctx.fillRect(rx - 0.06, ry - 0.06, 7 * px + 0.12, 6 * px + 0.12))
  g.knock(Y, (ctx) => ctx.fillRect(rx - 0.06, ry - 0.06, 7 * px + 0.12, 6 * px + 0.12))
  for (const [ch, ink] of [
    ['r', R],
    ['b', B],
    ['y', Y],
  ]) {
    g.ink(ink, (ctx) => pixels(RUNNER, rx, ry, px, (x, y, k) => k === ch && ctx.fillRect(x, y, px + 0.005, px + 0.005)))
  }
  // START HERE, beside the opening in the board's foot
  const sx = ox + (floorMaze.start[0] + 0.5) * s
  const ey = FLOOR.y + FLOOR.rows * s
  g.text(R, 'START HERE', sx + 0.42, ey + 0.36, { kind: 'mono', size: 0.26, tracking: 0.2 })
}

// ------------------------------------------- backdrop: the sorting skyline
// Towers drawn in isometric (a lit face, a shaded face, a yellow roof), their
// heights the values being sorted. Each wing is drawn in its own upright frame
// so the towers stand straight once the card leans back.

const SKY = { at: 10.0, glue: [64, 64], angle: [104, 104] }
const SKY_B = SKY.angle[0]
const PITCH = 1.1
const TW = 0.98
const ISO = (TW / 2) * Math.tan(30 * DEG)
const BUBBLE = [2.6, 5.2, 3.1, 6.0, 3.8, 8.2, 4.6, 7.0] // crease → outer
const QUICK = [2.4, 2.9, 3.5, 4.1, 4.9, 5.8, 8.4, 7.2]
const HOT = { L: [5, 6], R: [6, 7] } // bubble's comparison, quick's last swap
const LANE = BUBBLE.length * PITCH + 0.15
const SKY_BAND = 0.72
const SUN = { cx: 5.6, cy: -7.3, r: 2.4, px: 0.4 }

function towers(fn) {
  BUBBLE.forEach((h, i) => fn('L', -(i + 0.5) * PITCH, h, i))
  QUICK.forEach((h, i) => fn('R', (i + 0.5) * PITCH, h, i))
}
const towerSil = (xc, h) => [[xc - TW / 2, 1], [xc - TW / 2, -h - ISO], [xc, -h - 2 * ISO], [xc + TW / 2, -h - ISO], [xc + TW / 2, 1]]
const faceL = (xc, h) => [[xc - TW / 2, -h - ISO], [xc, -h], [xc, 1], [xc - TW / 2, 1]]
const faceR = (xc, h) => [[xc, -h], [xc + TW / 2, -h - ISO], [xc + TW / 2, 1], [xc, 1]]
const roof = (xc, h) => [[xc - TW / 2, -h - ISO], [xc, -h - 2 * ISO], [xc + TW / 2, -h - ISO], [xc, -h]]

const skyOutline = once(() =>
  vtrace('skyline', { x0: -12.6, y0: -12.6, w: 25.2, h: 15.4 }, SKY.angle, (ctx) => {
    for (const side of ['L', 'R']) {
      inWing(ctx, side, SKY_B, (c) => {
        c.beginPath()
        towers((sd, xc, h) => sd === side && poly(c, towerSil(xc, h)))
        c.rect(side === 'L' ? -LANE : 0, -SKY_BAND, LANE, SKY_BAND + 1)
        if (side === 'R') pixelDisc(c, SUN.cx, SUN.cy, SUN.r, SUN.px)
        c.fill()
      })
    }
    ctx.fillRect(-0.9, -2.3, 1.8, 3) // fills the wedge between the wings at the crease
  }),
)

const skyline = {
  id: 'skyline',
  kind: 'vfold',
  on: 'gutter',
  day: 16,
  ...SKY,
  outline: skyOutline,
  front(g) {
    g.fill(B, box4(-1, -3, 1, 1), 0.5)
    for (const side of ['L', 'R']) {
      const k = turned(g, wingM(side, SKY_B), side === 'L' ? [-40, -40, 40, 80] : [0, -40, 40, 80])
      if (side === 'R') {
        // the pixel sun, with a red halftone glow toward its foot
        k.ink(Y, (ctx) => {
          ctx.beginPath()
          pixelDisc(ctx, SUN.cx, SUN.cy, SUN.r, SUN.px)
          ctx.fill()
        })
        k.ink(R, (ctx) => {
          const gr = ctx.createRadialGradient(SUN.cx, SUN.cy + 1.4, 0, SUN.cx, SUN.cy + 1.4, SUN.r * 1.6)
          gr.addColorStop(0, g.tone(0.75))
          gr.addColorStop(1, g.tone(0))
          ctx.fillStyle = gr
          ctx.beginPath()
          pixelDisc(ctx, SUN.cx, SUN.cy, SUN.r, SUN.px)
          ctx.fill()
        })
      }
      const ink = side === 'L' ? R : B
      towers((sd, xc, h, i) => {
        if (sd !== side) return
        const hot = HOT[side].includes(i)
        for (const n of [R, B, Y]) k.knock(n, (ctx) => (ctx.beginPath(), poly(ctx, towerSil(xc, h)), ctx.fill()))
        if (hot) {
          k.fill(Y, faceL(xc, h))
          k.fill(Y, faceR(xc, h))
          k.fill(R, faceR(xc, h), 0.55)
          k.fill(R, roof(xc, h))
        } else {
          // the crowd recedes into the dusk: light tints, so the two towers
          // being compared (and the cabinet in front) carry the full inks
          k.fill(ink, faceL(xc, h), 0.25)
          k.fill(ink, faceR(xc, h), 0.6)
          k.fill(Y, roof(xc, h), 0.6)
          // lit floors: little iso windows knocked out of the faces
          const win = []
          for (let y = -h + 0.55; y < -1.05; y += 0.5) {
            for (const dir of [-1, 1]) {
              if (!g.rng.chance(0.68)) continue
              const p = (u, dy = 0) => [xc + dir * u * (TW / 2), y - u * ISO + dy]
              win.push([p(0.22), p(0.78), p(0.78, 0.2), p(0.22, 0.2)])
            }
          }
          const paint = (ctx) => {
            ctx.beginPath()
            for (const w of win) poly(ctx, w)
            ctx.fill()
          }
          k.knock(ink, paint)
          k.ink(Y, paint)
        }
        k.stroke(B, [[xc, -h], [xc, 1]], 0.035, 0.7)
      })
      // the lane: a blue band with the race's scoreline
      const band = box4(side === 'L' ? -LANE - 0.2 : 0, -SKY_BAND, side === 'L' ? 0 : LANE + 0.2, 1)
      for (const n of [R, Y]) k.knock(n, (ctx) => ctx.fill(g.path(band)))
      k.fill(B, band)
      // (kept to the outer ~4 cm of each lane: the cabinet hides the inner ends)
      const label = side === 'L' ? 'BUBBLE · 1,204 SWAPS' : '1 SWAP TO GO · QUICK'
      const lo = { kind: 'mono', size: 0.25, align: side === 'L' ? 'left' : 'right', tracking: 0.12 }
      k.knock(B, (ctx) => typeset(g, ctx, label, side === 'L' ? -LANE + 0.35 : LANE - 0.35, -0.2, lo))
      k.text(Y, label, side === 'L' ? -LANE + 0.35 : LANE - 0.35, -0.2, lo)
    }
  },
  back(g) {
    g.fill(B, BIG, 0.3)
    g.fill(Y, BIG, 0.18)
  },
}

// ------------------------------------------------------ middle: the cabinet

const CAB = { at: 12.9, glue: [60, 60], angle: [90, 90] }
const SCREEN = { x0: -3.25, x1: 3.25, y0: -10.55, y1: -7.75 }
const MARQ = { y0: -12.4, y1: -10.75, w: 9.1 }
// the VOLTAGE bolt, plugged into the top of the marquee: a 6 × 8 pixel
// zigzag in big pixels. It stands wholly on the right wing, so the crease
// never bends it.
const BOLT = [
  '...###',
  '..###.',
  '.###..',
  '######',
  '...##.',
  '..##..',
  '.##...',
  '.#....',
]
const BOLT_PX = 0.38
const BOLT_SH = 0.16 // the hard shadow's offset
const BOLT_AT = [0.12, MARQ.y0 - 7 * BOLT_PX]
const LEDGE = [[-4.75, -5.05], [4.75, -5.05], [4.35, -6.6], [-4.35, -6.6]]

function cabinetShape(ctx) {
  ctx.beginPath()
  ctx.rect(-3.95, -5.25, 7.9, 6.2) // lower body and kick plate
  poly(ctx, LEDGE) // the control ledge juts out
  ctx.rect(-3.95, -10.95, 7.9, 4.5) // screen hood
  ctx.roundRect(-MARQ.w / 2, MARQ.y0, MARQ.w, MARQ.y1 - MARQ.y0, 0.28) // marquee
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-2.65, -7.15, 0.42, 0, Math.PI * 2) // joystick ball
  ctx.rect(-2.74, -7.0, 0.18, 0.6)
  boltPixels(ctx, 0)
  boltPixels(ctx, BOLT_SH)
  ctx.fill()
}

function boltPixels(ctx, d) {
  pixels(BOLT, BOLT_AT[0] + d, BOLT_AT[1] + d, BOLT_PX, (x, y) => ctx.rect(x, y, BOLT_PX + 0.01, BOLT_PX + 0.01))
}

const cabOutline = once(() => vtrace('cabinet', { x0: -5, y0: -15.6, w: 10, h: 17 }, CAB.angle, cabinetShape))

/** A brutalist rim: solid blue, with the yellow and red knocked out beneath it. */
function rim(g, shape, width) {
  const st = (ctx) => {
    ctx.lineWidth = width
    ctx.lineJoin = 'miter'
    ctx.stroke(g.path(shape, true))
  }
  g.knock(Y, st)
  g.knock(R, st)
  g.ink(B, st)
}

function ring(g, ink, cx, cy, r, w) {
  g.ink(ink, (ctx) => {
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  })
}

const cabinet = {
  id: 'cabinet',
  kind: 'vfold',
  on: 'gutter',
  day: 60,
  ...CAB,
  outline: cabOutline,
  front(g) {
    g.fill(Y, BIG)
    // marquee: red, VOLTAGE knocked out to the yellow beneath
    const marquee = roundRect(-MARQ.w / 2, MARQ.y0, MARQ.w, MARQ.y1 - MARQ.y0, 0.28)
    g.fill(R, marquee)
    g.knock(R, (ctx) => typeset(g, ctx, 'VOLTAGE', 0, MARQ.y1 - 0.38, { kind: 'display', size: 1.08, align: 'center', tracking: 0.05 }))
    // screen: deep blue; the maze in yellow; the flood a green halftone; the path red
    const scr = box4(SCREEN.x0, SCREEN.y0, SCREEN.x1, SCREEN.y1)
    g.knock(Y, (ctx) => ctx.fill(g.path(scr)))
    g.fill(B, scr)
    const cs = 0.62
    const mx = -(screenMaze.cols * cs) / 2
    const my = SCREEN.y0 + 0.45
    g.ink(Y, (ctx) => {
      ctx.fillStyle = g.tone(0.35)
      for (const [c, r] of screenMaze.order) ctx.fillRect(mx + c * cs + 0.05, my + r * cs + 0.05, cs - 0.1, cs - 0.1)
    })
    const walls = (ctx) => {
      ctx.lineWidth = 0.09
      ctx.lineCap = 'square'
      mazeWalls(ctx, screenMaze, mx, my, cs)
      ctx.stroke()
    }
    g.knock(B, walls)
    g.ink(Y, walls)
    const route = (ctx) => {
      ctx.lineWidth = 0.13
      ctx.lineJoin = 'round'
      mazePath(ctx, screenMaze, mx, my, cs, false)
      ctx.stroke()
    }
    g.knock(B, route)
    g.knock(Y, route)
    g.ink(R, route)
    // the runner, at the end of its run
    const [ec, er] = screenMaze.path[screenMaze.path.length - 1]
    const px = 0.075
    const rx = mx + (ec + 0.5) * cs - 3.5 * px
    const ry = my + (er + 0.5) * cs - 3 * px
    for (const n of [B, Y, R]) g.knock(n, (ctx) => ctx.fillRect(rx, ry, 7 * px, 6 * px))
    g.ink(R, (ctx) => pixels(RUNNER, rx, ry, px, (x, y, k) => k !== 'b' && ctx.fillRect(x, y, px + 0.004, px + 0.004)))
    g.ink(Y, (ctx) => pixels(RUNNER, rx, ry, px, (x, y, k) => k === 'y' && ctx.fillRect(x, y, px + 0.004, px + 0.004)))
    g.knock(B, (ctx) => {
      typeset(g, ctx, '1UP  065', SCREEN.x0 + 0.18, SCREEN.y0 + 0.33, { kind: 'mono', size: 0.22 })
      typeset(g, ctx, 'HI  065', SCREEN.x1 - 0.18, SCREEN.y0 + 0.33, { kind: 'mono', size: 0.22, align: 'right' })
    })
    // control ledge: red, three buttons and the stick
    g.fill(R, LEDGE)
    // brutalist outlines, printed solid blue
    rim(g, scr, 0.13)
    rim(g, cabOutline().outline, 0.34)
    rim(g, marquee, 0.14)
    rim(g, LEDGE, 0.13)
    // the pixel bolt: red, with a hard blue shadow; no yellow under either
    const bolt = (d) => (ctx) => (ctx.beginPath(), boltPixels(ctx, d), ctx.fill())
    g.knock(Y, bolt(0))
    g.knock(Y, bolt(BOLT_SH))
    g.knock(R, bolt(BOLT_SH))
    g.ink(B, bolt(BOLT_SH))
    g.knock(B, bolt(0))
    g.ink(R, bolt(0))
    for (const [bx, ink] of [
      [0.2, Y],
      [1.25, Y],
      [2.3, B],
    ]) {
      g.knock(R, (ctx) => (ctx.beginPath(), ctx.arc(bx, -5.85, 0.34, 0, Math.PI * 2), ctx.fill()))
      g.circle(ink, bx, -5.85, 0.34)
      ring(g, B, bx, -5.85, 0.34, 0.08)
    }
    g.fill(B, box4(-2.74, -7.0, -2.56, -5.75))
    g.knock(Y, (ctx) => (ctx.beginPath(), ctx.arc(-2.65, -7.15, 0.42, 0, Math.PI * 2), ctx.fill()))
    g.circle(R, -2.65, -7.15, 0.42)
    ring(g, B, -2.65, -7.15, 0.42, 0.08)
    // lower body: speaker grilles and the coin door
    for (const sx of [-3.15, 2.15]) {
      g.ink(B, (ctx) => {
        for (let yy = -4.55; yy < -1.5; yy += 0.28) {
          for (let xx = sx; xx < sx + 1.0; xx += 0.28) {
            ctx.beginPath()
            ctx.arc(xx + 0.14, yy, 0.07, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      })
    }
    // the coin door: where the floor maze's route ends
    const door = box4(-1.55, -4.7, 1.55, -1.2)
    g.fill(B, door, 0.22)
    rim(g, door, 0.1)
    const goal = { kind: 'display', size: 0.6, align: 'center', tracking: 0.04 }
    g.knock(B, (ctx) => typeset(g, ctx, 'GOAL', 0, -3.62, goal))
    g.text(R, 'GOAL', 0, -3.62, goal)
    for (const sx of [-0.72, 0.72]) {
      const slot = box4(sx - 0.42, -3.3, sx + 0.42, -1.6)
      g.knock(B, (ctx) => ctx.fill(g.path(slot)))
      g.fill(R, slot)
      g.knock(R, (ctx) => ctx.fillRect(sx - 0.06, -3.05, 0.12, 0.75))
    }
    // kick plate
    const kick = box4(-3.95, -0.75, 3.95, 1)
    g.knock(Y, (ctx) => ctx.fill(g.path(kick)))
    g.knock(R, (ctx) => ctx.fill(g.path(kick)))
    g.fill(B, kick)
    plate(g, B, Y, 'DAY 60 · BRUTALIST ARCADE', 0, -0.2, { kind: 'mono', size: 0.3, align: 'center', tracking: 0.1 })
  },
  back(g) {
    g.fill(Y, BIG, 0.5)
    g.fill(B, BIG, 0.14)
    g.text(B, 'DO NOT TILT', 0, -8.4, { kind: 'mono', size: 0.42, align: 'center', tracking: 0.2 })
    g.ink(B, (ctx) => {
      for (let i = 0; i < 6; i++) ctx.fillRect(-2.5, -6.4 + i * 0.36, 5, 0.14)
    })
  },
}

// -------------------------------------------------- foreground: HEAVY
// The letters stand on a blue ground strip in each wing's upright frame;
// the card leans back so the word faces the reader. A pill stands on end at
// the crease, another lies across the H and E, and the Y has tipped over onto
// the third, as if Matter.js had just let go.

const HEAVY = { at: 17.8, glue: [68, 68], angle: [106, 106] }
const HB = HEAVY.angle[0]
const LETTERS = [
  // ch, x, baseline, rotation (deg), ink, wing, red overprint (turns yellow orange)
  ['H', -4.95, -0.5, -6, R, 'L', 0],
  ['E', -2.5, -0.5, 6, Y, 'L', 0.35],
  ['A', 1.3, -0.5, -4, R, 'R', 0],
  ['V', 3.5, -0.56, 7, Y, 'R', 0.35],
  ['Y', 5.45, -1.3, 20, R, 'R', 0],
]
const PILLS = [
  // cx, cy, length, rotation (deg), wing
  [-3.75, -2.62, 2.0, -9, 'L'],
  [5.05, -0.84, 1.45, -4, 'R'],
]
const CREASE_PILL = { y0: -2.75, y1: -0.3, w: 0.66 }
const LETTER_SIZE = 3.0
const GROUND = 0.52
const GROUND_LEN = 6.8

function heavyShape(ctx, off = 0) {
  for (const [ch, x, y, rot, , side] of LETTERS) {
    ctx.save()
    ctx.transform(...wingM(side, HB))
    ctx.translate(x + off, y + off)
    ctx.rotate(rot * DEG)
    ctx.font = `${LETTER_SIZE}px "Caprasimo"`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  }
  for (const [cx, cy, l, rot, side] of PILLS) {
    ctx.save()
    ctx.transform(...wingM(side, HB))
    ctx.translate(cx + off, cy + off)
    ctx.rotate(rot * DEG)
    ctx.beginPath()
    ctx.roundRect(-l / 2, -0.32, l, 0.64, 0.32)
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath()
  ctx.roundRect(-CREASE_PILL.w / 2 + off, CREASE_PILL.y0 + off, CREASE_PILL.w, CREASE_PILL.y1 - CREASE_PILL.y0, CREASE_PILL.w / 2)
  ctx.fill()
}

const heavyOutline = once(() =>
  vtrace('heavy', { x0: -8, y0: -6.4, w: 16, h: 8.6 }, HEAVY.angle, (ctx) => {
    heavyShape(ctx, 0.15)
    heavyShape(ctx, 0)
    ctx.fillRect(-0.5, -0.75, 1, 1.2) // the wedge between the wings at the crease
    for (const side of ['L', 'R']) {
      inWing(ctx, side, HB, (c) => c.fillRect(side === 'L' ? -GROUND_LEN : 0, -GROUND, GROUND_LEN, GROUND + 1))
    }
  }),
)

const heavy = {
  id: 'heavy',
  kind: 'vfold',
  on: 'gutter',
  day: 51,
  ...HEAVY,
  outline: heavyOutline,
  front(g) {
    // hard neubrutalist shadows, then the bodies on top
    g.ink(B, (ctx) => heavyShape(ctx, 0.15))
    LETTERS.forEach(([ch, x, y, rot, ink, side, over]) => {
      const draw = (tone) => (ctx) => {
        ctx.transform(...wingM(side, HB))
        ctx.translate(x, y)
        ctx.rotate(rot * DEG)
        ctx.font = `${LETTER_SIZE}px "Caprasimo"`
        ctx.textAlign = 'center'
        ctx.fillStyle = g.tone(tone)
        ctx.fillText(ch, 0, 0)
      }
      g.knock(B, draw(1))
      g.ink(ink, draw(1))
      // yellow alone is the weakest ink on cream: a red tint makes it orange
      if (over) g.ink(R, draw(over))
    })
    const pill = (cx, cy, l, rot, side, half) => (ctx) => {
      if (side) ctx.transform(...wingM(side, HB))
      ctx.translate(cx, cy)
      ctx.rotate(rot * DEG)
      ctx.beginPath()
      if (half) ctx.rect(0, -0.4, l, 0.8)
      else ctx.roundRect(-l / 2, -0.32, l, 0.64, 0.32)
      if (half) {
        ctx.clip()
        ctx.beginPath()
        ctx.roundRect(-l / 2, -0.32, l, 0.64, 0.32)
      }
      ctx.fill()
    }
    for (const [cx, cy, l, rot, side] of PILLS) {
      g.knock(B, pill(cx, cy, l, rot, side))
      g.ink(Y, pill(cx, cy, l, rot, side))
      g.ink(R, pill(cx, cy, l, rot, side, true))
    }
    const cp = (ctx) => {
      ctx.beginPath()
      ctx.roundRect(-CREASE_PILL.w / 2, CREASE_PILL.y0, CREASE_PILL.w, CREASE_PILL.y1 - CREASE_PILL.y0, CREASE_PILL.w / 2)
      ctx.fill()
    }
    g.knock(B, cp)
    g.ink(Y, cp)
    g.ink(R, (ctx) => {
      ctx.beginPath()
      ctx.rect(-1, CREASE_PILL.y0 - 0.1, 2, (CREASE_PILL.y1 - CREASE_PILL.y0) / 2 + 0.1)
      ctx.clip()
      cp(ctx)
    })
    g.fill(B, box4(-0.5, -0.75, 0.5, 1))
    for (const side of ['L', 'R']) {
      const k = turned(g, wingM(side, HB), side === 'L' ? [-40, -40, 40, 80] : [0, -40, 40, 80])
      const ground = box4(side === 'L' ? -7 : 0, -GROUND, side === 'L' ? 0 : 7, 1.5)
      for (const n of [R, Y]) k.knock(n, (ctx) => ctx.fill(g.path(ground)))
      k.fill(B, ground)
      const label = side === 'L' ? 'HEAVY · DAY 51' : 'MATTER.JS'
      const lo = { kind: 'mono', size: 0.3, align: side === 'L' ? 'right' : 'left', tracking: 0.14 }
      k.knock(B, (ctx) => typeset(g, ctx, label, side === 'L' ? -0.6 : 0.6, -0.1, lo))
      k.text(Y, label, side === 'L' ? -0.6 : 0.6, -0.1, lo)
    }
  },
  back(g) {
    g.fill(R, BIG, 0.32)
    g.text(R, 'gravity: on', 0, -1.6, { kind: 'serif', size: 0.4, italic: true, align: 'center' })
  },
}

// ------------------------------------------- left page: the Celestial deck
// The top card of the deck is a flap hinged on its right edge (rot 90: its
// hinge runs down the page, so it turns like a little page). Glued across
// that hinge, a fan of five cards stands up as the card is lifted.

const DECK = { hx: 7.9, hy: 16.3, w: 7.6, h: 5.3 } // hinge x, hinge top, length down the hinge, width across
const DECK_X0 = DECK.hx - DECK.h
// closed: page-upright (px, py) from the card's top-left → card coords
const FLAP_FRONT = [0, -1, 1, 0, 0, DECK.h]
// open (face down beside the hinge): page-upright (qx, qy) from the hinge top → back-painter coords
const FLAP_BACK = [0, 1, -1, 0, DECK.w, 0]

function sunEmblem(k, cx, cy, r) {
  k.ink(Y, (ctx) => {
    ctx.beginPath()
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * Math.PI * 2
      const rr = i % 2 ? r * 0.72 : r
      ctx.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr)
    }
    ctx.closePath()
    ctx.fill()
  })
  k.circle(R, cx, cy, r * 0.48)
  k.ink(B, (ctx) => {
    ctx.beginPath()
    ctx.arc(cx + r * 0.18, cy - r * 0.08, r * 0.4, 0, Math.PI * 2)
    ctx.arc(cx + r * 0.34, cy - r * 0.16, r * 0.34, 0, Math.PI * 2, true)
    ctx.fill()
  })
}

/** The patterned back of a Celestial Arcana card, in a w × h box at (x, y). */
function cardBack(k, x, y, w, h) {
  k.fill(B, box4(x, y, x + w, y + h))
  const lattice = (ctx) => {
    ctx.beginPath()
    for (let d = -h; d < w + h; d += 0.6) {
      ctx.moveTo(x + d, y)
      ctx.lineTo(x + d + h, y + h)
      ctx.moveTo(x + d + h, y)
      ctx.lineTo(x + d, y + h)
    }
  }
  const inner = (ctx) => {
    ctx.beginPath()
    ctx.rect(x + 0.42, y + 0.42, w - 0.84, h - 0.84)
    ctx.clip()
  }
  k.knock(B, (ctx) => {
    ctx.lineWidth = 0.06
    ctx.strokeRect(x + 0.26, y + 0.26, w - 0.52, h - 0.52)
    inner(ctx)
    ctx.lineWidth = 0.035
    lattice(ctx)
    ctx.stroke()
  })
  k.ink(Y, (ctx) => {
    ctx.lineWidth = 0.06
    ctx.strokeRect(x + 0.26, y + 0.26, w - 0.52, h - 0.52)
    inner(ctx)
    ctx.lineWidth = 0.035
    lattice(ctx)
    ctx.stroke()
  })
  const cx = x + w / 2
  const cy = y + h / 2
  for (const n of [B, Y]) k.knock(n, (ctx) => (ctx.beginPath(), ctx.arc(cx, cy, Math.min(w, h) * 0.32, 0, Math.PI * 2), ctx.fill()))
  sunEmblem(k, cx, cy, Math.min(w, h) * 0.27)
}

const deck = {
  id: 'deck',
  kind: 'flap',
  on: 'page:L',
  at: [DECK.hx, DECK.hy],
  rot: 90,
  outline: roundRect(0, 0, DECK.w, DECK.h, 0.32),
  front(g) {
    const k = turned(g, FLAP_FRONT)
    const w = DECK.h
    const h = DECK.w
    cardBack(k, 0, 0, w, h)
    // each word on a solid blue band, so the lattice can't swallow it
    for (const [str, y] of [
      ['CELESTIAL', 1.02],
      ['ARCANA', h - 0.76],
    ]) {
      const o = { kind: 'mono', size: 0.3, align: 'center', tracking: 0.3 }
      const half = g.measure(str, o) * 0.5 + str.length * 0.3 * 0.3 * 0.5 + 0.25
      const band = box4(w / 2 - half, y - 0.38, w / 2 + half, y + 0.16)
      k.knock(Y, (ctx) => ctx.fill(g.path(band)))
      k.fill(B, band)
      k.knock(B, (ctx) => typeset(g, ctx, str, w / 2, y, o))
      k.text(Y, str, w / 2, y, o)
    }
  },
  back(g) {
    // the face of the card, seen once it lies open to the right of the hinge
    const k = turned(g, FLAP_BACK)
    const w = DECK.h
    const h = DECK.w
    k.stroke(B, roundRect(0.24, 0.24, w - 0.48, h - 0.48, 0.24), 0.06, 1, true)
    k.stroke(B, roundRect(0.38, 0.38, w - 0.76, h - 0.76, 0.18), 0.025, 1, true)
    // the upper face stands behind the fan once it rises: a few stars there,
    // and the card's title in the lower part, in front of it
    k.ink(Y, (ctx) => {
      for (let i = 0; i < 7; i++) {
        starPath(ctx, 0.8 + ((i * 1.37) % 3.7), 0.9 + ((i * 1.13) % 2.3), 0.12 + (i % 3) * 0.06)
        ctx.fill()
      }
    })
    // (the fan's base runs from the hinge at 4.9 down to about (2.05, 6.0):
    // the title sits right of and below it, where nothing stands)
    const field = roundRect(0.55, 3.6, w - 1.1, h - 4.15, 0.16)
    k.fill(Y, field, 0.25)
    const tx = 3.25
    sunEmblem(k, 4.3, 4.4, 0.42)
    k.text(R, 'XII', tx, 6.2, { kind: 'display', size: 1.2, align: 'center' })
    k.text(B, 'The Deck', tx, 6.9, { kind: 'display', size: 0.55, align: 'center' })
  },
}

// the fan of five cards that rises out of the deck's hinge
const FAN = { at: 4.9, glue: [62, 62], angle: [104, 104] }
const FAN_CARDS = [
  // rotation, numeral, emblem
  [-44, 'X', 'moon', B, 0.22],
  [-22, 'XVI', 'star', Y, 0.45],
  [0, 'XII', 'sun', R, 0.2],
  [22, 'XVII', 'star', Y, 0.45],
  [44, 'LX', 'comet', B, 0.22],
]
const FAN_PIVOT = [0, 0.9]
const FAN_CARD = { w: 2.0, h: 3.75, lift: 1.42 } // lift: gap between pivot and card bottom

function fanCard(ctx, rot) {
  ctx.save()
  ctx.translate(...FAN_PIVOT)
  ctx.rotate(rot * DEG)
  ctx.beginPath()
  ctx.roundRect(-FAN_CARD.w / 2, -FAN_CARD.lift - FAN_CARD.h, FAN_CARD.w, FAN_CARD.h, 0.16)
  ctx.fill()
  ctx.restore()
}

const fanOutline = once(() =>
  vtrace('fan', { x0: -4.8, y0: -5.0, w: 9.6, h: 6.0 }, FAN.angle, (ctx) => {
    for (const [rot] of FAN_CARDS) fanCard(ctx, rot)
    ctx.fillRect(-2.25, -0.7, 4.5, 2)
  }),
)

const fan = {
  id: 'fan',
  kind: 'vfold',
  on: 'deck',
  day: 12,
  ...FAN,
  outline: fanOutline,
  front(g) {
    FAN_CARDS.forEach(([rot, num, emblem, tint, tone], i) => {
      const inCard = (fn) => (ctx) => {
        ctx.translate(...FAN_PIVOT)
        ctx.rotate(rot * DEG)
        ctx.translate(0, -FAN_CARD.lift - FAN_CARD.h / 2)
        fn(ctx)
      }
      const card = (ctx) => {
        ctx.beginPath()
        ctx.roundRect(-FAN_CARD.w / 2, -FAN_CARD.h / 2, FAN_CARD.w, FAN_CARD.h, 0.16)
      }
      // each card covers the ones before it: knock what lies beneath
      for (const ink of [R, B, Y]) g.knock(ink, inCard((ctx) => (card(ctx), ctx.fill())))
      g.ink(tint, inCard((ctx) => {
        card(ctx)
        ctx.fillStyle = g.tone(tone)
        ctx.fill()
      }))
      g.ink(B, inCard((ctx) => {
        card(ctx)
        ctx.lineWidth = 0.08
        ctx.stroke()
        ctx.lineWidth = 0.03
        ctx.strokeRect(-FAN_CARD.w / 2 + 0.16, -FAN_CARD.h / 2 + 0.16, FAN_CARD.w - 0.32, FAN_CARD.h - 0.32)
      }))
      g.ink(R, inCard((ctx) => typeset(g, ctx, num, 0, -FAN_CARD.h / 2 + 0.62, { kind: 'display', size: 0.38, align: 'center' })))
      const ey = 0.3
      if (emblem === 'sun') {
        g.ink(Y, inCard((ctx) => {
          ctx.beginPath()
          for (let k = 0; k < 16; k++) {
            const t = (k / 16) * Math.PI * 2
            const rr = k % 2 ? 0.4 : 0.62
            ctx.lineTo(Math.cos(t) * rr, ey + Math.sin(t) * rr)
          }
          ctx.fill()
        }))
        g.ink(R, inCard((ctx) => (ctx.beginPath(), ctx.arc(0, ey, 0.28, 0, Math.PI * 2), ctx.fill())))
      } else if (emblem === 'moon') {
        g.ink(B, inCard((ctx) => {
          ctx.beginPath()
          ctx.arc(0, ey, 0.52, 0, Math.PI * 2)
          ctx.arc(0.22, ey - 0.1, 0.43, 0, Math.PI * 2, true)
          ctx.fill()
        }))
      } else if (emblem === 'star') {
        g.ink(i === 1 ? R : Y, inCard((ctx) => (starPath(ctx, 0, ey, 0.6), ctx.fill())))
        if (i !== 1) g.ink(R, inCard((ctx) => (starPath(ctx, 0, ey, 0.6), (ctx.lineWidth = 0.05), ctx.stroke())))
      } else {
        g.ink(Y, inCard((ctx) => {
          ctx.beginPath()
          ctx.moveTo(-0.55, ey + 0.55)
          ctx.lineTo(0.12, ey - 0.25)
          ctx.lineTo(0.38, ey - 0.02)
          ctx.closePath()
          ctx.fill()
        }))
        g.ink(R, inCard((ctx) => (starPath(ctx, 0.25, ey - 0.14, 0.32), ctx.fill())))
      }
    })
    const base = box4(-4.8, -0.7, 4.8, 2)
    for (const ink of [R, Y]) g.knock(ink, (ctx) => ctx.fill(g.path(base)))
    g.fill(B, base)
    g.text(Y, 'DAY 12', 0, -0.2, { kind: 'mono', size: 0.28, align: 'center', tracking: 0.16 })
  },
  back(g) {
    g.fill(B, BIG)
    g.ink(Y, (ctx) => {
      for (let i = 0; i < 16; i++) {
        starPath(ctx, -3.4 + ((i * 1.73) % 6.8), -4 + ((i * 2.37) % 3.8), 0.1 + (i % 3) * 0.05)
        ctx.fill()
      }
    })
  },
}

function deckBed(g) {
  const { hy, w, h } = DECK
  const x0 = DECK_X0
  const top = roundRect(x0, hy, h, w, 0.32)
  // the rest of the deck peeks out below the top card
  for (const k of [3, 2, 1]) {
    const c = roundRect(x0 - 0.1 * k, hy + 0.12 * k, h, w, 0.32)
    g.knock(B, (ctx) => ctx.fill(g.path(c)))
    g.fill(B, c, 0.5)
    g.stroke(B, c, 0.04, 1, true)
  }
  // under the top card: a pale field where the fan is glued, and what the deck was
  g.knock(B, (ctx) => ctx.fill(g.path(top)))
  g.fill(Y, top, 0.42)
  g.stroke(B, top, 0.04, 0.8, true)
  g.text(R, 'XII', x0 + 0.5, hy + 1.2, { kind: 'display', size: 0.62 })
  g.para(B, 'Ten Celestial Arcana in CSS 3D: they fan, shuffle, flip and cycle on a click.', x0 + 0.5, hy + w - 1.05, h - 1.0, { size: 0.26, italic: true, leading: 0.34 })
  // the lift, hinted: a dashed arc over the hinge
  g.ink(B, (ctx) => {
    ctx.setLineDash([0.12, 0.12])
    ctx.lineWidth = 0.04
    ctx.globalAlpha = 0.65
    ctx.beginPath()
    ctx.arc(DECK.hx, hy + 1.0, 2.3, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
  })
  g.text(B, 'lift the top card', DECK.hx + 0.6, hy - 0.55, { kind: 'serif', size: 0.3, italic: true, tone: 0.9 })
}

// ---------------------------------------- right page: the scoreboard
// A pull-tab under a die-cut bezel. At rest the window reads INSERT COIN;
// pulled, the strip drops 2.6 cm and the window spells the high score in
// periodic-table tiles: H I S Co Re. Only the striped stem and the PULL tab
// ever leave the bezel; the wide screen strip stays under it at full pull.

const BEZ = { x: 8.6, y: 16.4, w: 9.0, h: 8.4 }
const WIN = { x: 10.0, y: 19.5, w: 6.2, h: 2.2 }
const TRAVEL = 2.6
const STRIP = { x: 9.4, y: 16.7, w: 7.4, full: 9.2, tab: 10.7 }
const FA_Y = WIN.y - STRIP.y // frame A (at rest) on the strip
const FB_Y = FA_Y - TRAVEL // frame B (pulled)
const NECK = FA_Y + WIN.h + 0.3 // below this the strip narrows to the stem
const STEM = [2.1, 5.3]
const TILES = [
  [1, 'H', 'hydrogen'],
  [53, 'I', 'iodine'],
  [16, 'S', 'sulfur'],
  [27, 'Co', 'cobalt'],
  [75, 'Re', 'rhenium'],
]

const arcPts = (cx, cy, r, a0, a1, n = 6) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = (a0 + ((a1 - a0) * i) / n) * DEG
    return [cx + Math.cos(t) * r, cy + Math.sin(t) * r]
  })

// the screen strip with rounded leading corners (so it doesn't snag under
// the bezel), then the stem and its chamfered PULL tab
const stripOutline = [
  ...arcPts(0.3, 0.3, 0.3, 180, 270),
  ...arcPts(STRIP.w - 0.3, 0.3, 0.3, 270, 360),
  [STRIP.w, NECK],
  [STEM[1], NECK],
  [STEM[1], STRIP.tab - 0.4],
  [STEM[1] - 0.4, STRIP.tab],
  [STEM[0] + 0.4, STRIP.tab],
  [STEM[0], STRIP.tab - 0.4],
  [STEM[0], NECK],
  [0, NECK],
]

function tile(g, x, y, w, h, z, sym, name) {
  const b = box4(x, y, x + w, y + h)
  for (const n of [B, Y]) g.knock(n, (ctx) => ctx.fill(g.path(b)))
  g.fill(R, b)
  g.knock(R, (ctx) => {
    typeset(g, ctx, String(z), x + 0.09, y + 0.26, { kind: 'mono', size: 0.19 })
    typeset(g, ctx, sym, x + w / 2, y + h * 0.7, { kind: 'display', size: h * 0.48, align: 'center' })
    typeset(g, ctx, name, x + w / 2, y + h - 0.1, { kind: 'mono', size: 0.125, align: 'center' })
  })
}

/** Type knocked out of one ink and printed in another. */
function plate(g, under, ink, str, x, y, o) {
  g.knock(under, (ctx) => typeset(g, ctx, str, x, y, o))
  g.text(ink, str, x, y, o)
}

const coin = {
  id: 'coin',
  kind: 'slider',
  on: 'page:R',
  at: [STRIP.x, STRIP.y],
  travel: [0, TRAVEL],
  outline: stripOutline,
  front(g) {
    const fx = WIN.x - STRIP.x
    const cx = fx + WIN.w / 2
    const screen = (y) => box4(fx - 0.3, y - 0.2, fx + WIN.w + 0.3, y + WIN.h + 0.2)
    // frame B, shown once pulled: the high score in element tiles
    g.fill(B, screen(FB_Y))
    const tw = 1.04
    const gap = 0.12
    const tx0 = fx + (WIN.w - (TILES.length * tw + (TILES.length - 1) * gap)) / 2
    TILES.forEach(([z, s, n], i) => tile(g, tx0 + i * (tw + gap), FB_Y + 0.16, tw, 1.26, z, s, n))
    plate(g, B, Y, 'HI-SCORE · 65 DAYS', cx, FB_Y + 1.95, { kind: 'mono', size: 0.3, align: 'center', tracking: 0.14 })
    // frame A, at rest: INSERT COIN
    g.fill(B, screen(FA_Y))
    plate(g, B, Y, 'INSERT COIN', cx, FA_Y + 1.15, { kind: 'mono', size: 0.62, align: 'center', tracking: 0.06 })
    plate(g, B, Y, 'CREDIT 00 · PULL', cx, FA_Y + 1.82, { kind: 'mono', size: 0.3, align: 'center', tracking: 0.14 })
    // the stem and tab: everything that can leave the bezel is handle, red
    // with yellow hazard stripes, and PULL on the tab
    const [s0, s1] = STEM
    g.fill(R, box4(s0, NECK - 0.1, s1, STRIP.tab + 0.1))
    const stripes = (ctx) => {
      ctx.beginPath()
      ctx.rect(s0, NECK + 0.15, s1 - s0, STRIP.full - 0.15 - NECK)
      ctx.clip()
      ctx.beginPath()
      for (let y = NECK - 1.2; y < STRIP.full; y += 0.62) {
        ctx.moveTo(s0, y)
        ctx.lineTo(s1, y + 1.0)
        ctx.lineTo(s1, y + 1.26)
        ctx.lineTo(s0, y + 0.26)
        ctx.closePath()
      }
      ctx.fill()
    }
    g.knock(R, stripes)
    g.ink(Y, stripes)
    plate(g, R, Y, 'PULL', (s0 + s1) / 2, STRIP.tab - 0.42, { kind: 'display', size: 0.66, align: 'center' })
  },
}

const bezelOutline = roundRect(0, 0, BEZ.w, BEZ.h, 0.3)
const bezelHole = roundRect(WIN.x - BEZ.x, WIN.y - BEZ.y, WIN.w, WIN.h, 0.12)

const scoreboard = {
  id: 'scoreboard',
  kind: 'flat',
  on: 'page:R',
  day: 10,
  at: [BEZ.x, BEZ.y],
  outline: bezelOutline,
  holes: [bezelHole],
  front(g) {
    g.fill(R, box4(0, 0, BEZ.w, BEZ.h))
    g.stroke(B, bezelOutline, 0.3, 1, true)
    const wx = WIN.x - BEZ.x
    const wy = WIN.y - BEZ.y
    g.stroke(B, roundRect(wx - 0.2, wy - 0.2, WIN.w + 0.4, WIN.h + 0.4, 0.22), 0.24, 1, true)
    const p1 = { kind: 'display', size: 0.82, align: 'center' }
    g.ink(B, (ctx) => typeset(g, ctx, 'PLAYER 1', BEZ.w / 2 + 0.08, 1.24, p1))
    g.knock(B, (ctx) => typeset(g, ctx, 'PLAYER 1', BEZ.w / 2, 1.16, p1))
    plate(g, R, Y, 'PLAYER 1', BEZ.w / 2, 1.16, p1)
    plate(g, R, Y, 'HIGH SCORES KEPT IN THE ELEMENTS', BEZ.w / 2, 1.95, { kind: 'mono', size: 0.25, align: 'center', tracking: 0.12 })
    // the coin slot below the window
    const coinPlate = roundRect(BEZ.w / 2 - 1.1, 6.0, 2.2, 0.8, 0.15)
    g.knock(R, (ctx) => ctx.fill(g.path(coinPlate)))
    g.fill(Y, coinPlate)
    g.stroke(B, coinPlate, 0.08, 1, true)
    g.fill(B, box4(BEZ.w / 2 - 0.75, 6.25, BEZ.w / 2 + 0.75, 6.55))
    plate(g, R, Y, '25 CENTS · ONE PLAY', BEZ.w / 2, 7.65, { kind: 'mono', size: 0.28, align: 'center', tracking: 0.14 })
  },
}

// ---------------------------------------------- right page: the table

const PT = { x: 9.78, y: 2.3, s: 0.49, cell: 0.44 }
function ptCells() {
  const out = []
  const put = (z, row, col) => out.push({ z, row, col })
  put(1, 0, 0)
  put(2, 0, 17)
  for (const [p, z0] of [
    [1, 3],
    [2, 11],
  ]) {
    put(z0, p, 0)
    put(z0 + 1, p, 1)
    for (let i = 0; i < 6; i++) put(z0 + 2 + i, p, 12 + i)
  }
  for (let i = 0; i < 18; i++) {
    put(19 + i, 3, i)
    put(37 + i, 4, i)
  }
  for (const [p, z0, f] of [
    [5, 55, 7.6],
    [6, 87, 8.6],
  ]) {
    put(z0, p, 0)
    put(z0 + 1, p, 1)
    for (let i = 0; i < 15; i++) put(z0 + 2 + i, f, 2 + i)
    for (let i = 0; i < 15; i++) put(z0 + 17 + i, p, 3 + i)
  }
  return out
}
const PT_CELLS = ptCells()
const PT_SYM = new Map(TILES.map(([z, s]) => [z, s]))

function periodicTable(g) {
  for (const { z, row, col } of PT_CELLS) {
    const x = PT.x + col * PT.s
    const y = PT.y + row * PT.s
    const b = box4(x, y, x + PT.cell, y + PT.cell)
    if (PT_SYM.has(z)) {
      g.fill(R, b)
      g.knock(R, (ctx) => typeset(g, ctx, PT_SYM.get(z), x + PT.cell / 2, y + PT.cell * 0.72, { kind: 'mono', size: 0.24, align: 'center' }))
      continue
    }
    const block = row >= 7 ? 'f' : col < 2 ? 's' : col >= 12 ? 'p' : 'd'
    const [ink, tone] = { s: [R, 0.42], d: [B, 0.42], p: [Y, 0.85], f: [B, 0.2] }[block]
    g.fill(ink, b, tone)
  }
  g.text(B, 'fig. 10 — all 118, and where the high score is kept', PT.x, PT.y + 9.6 * PT.s + 0.2, { kind: 'serif', size: 0.27, italic: true, tone: 0.85 })
}

// ------------------------------------------------------------------ pages

const PARA =
  'The days the browser turned into a toy box. A periodic table you could heat until it boiled; a deck of Celestial Arcana that fanned and flipped; two sorts racing bar against bar; a city laid down tile by tile; a pixel editor; a maze that solved itself; a landing page built to fall over; and an arcade loud enough to shake the screen. Every one a small machine with rules. Press a key and watch it play.'

const idx = dayIndex({ days: CH.days, side: 'R', x: 9.55, y: 8.4, width: 9.1, cols: 2, gap: 1.3, size: 0.36, ink: B, accent: R })

function pageL(g) {
  mazeFloor(g, 'L')
  runningHead(g, `${CH.numeral} · ${CH.title}`, 'L', B)
  g.text(R, 'CHAPTER SIX', M.outer, 2.6, { kind: 'mono', size: 0.28, tracking: 0.3 })
  g.text(Y, 'VI', M.outer + 0.16, 6.36, { kind: 'display', size: 3.6 })
  g.text(R, 'VI', M.outer, 6.2, { kind: 'display', size: 3.6 })
  g.text(B, 'Machines', M.outer, 8.25, { kind: 'display', size: 1.45 })
  g.text(B, '& Games', M.outer, 9.85, { kind: 'display', size: 1.45 })
  g.para(B, PARA, M.outer, 11.2, 9.0, { size: 0.36, leading: 0.5 })
  deckBed(g)
  folio(g, pl, 'L', B)
}

function pageR(g) {
  mazeFloor(g, 'R')
  runningHead(g, 'insert coin to continue', 'R', B)
  periodicTable(g)
  idx.paint(g)
  folio(g, pr, 'R', B)
}

export default {
  id: CH.id,
  title: CH.title,
  inks: CH.inks,
  paper: 'cream',
  card: 'white',
  pages: { L: pageL, R: pageR },
  pieces: [skyline, cabinet, heavy, deck, fan, coin, scoreboard],
  spots: [...idx.spots],
}
