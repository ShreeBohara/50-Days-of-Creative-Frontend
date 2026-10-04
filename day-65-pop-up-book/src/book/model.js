// The book as a mechanism: S spreads bound between two boards. Leaf 0 is the
// front cover; leaf i (1…S−1) carries spread i−1's right page on its front and
// spread i's left page on its back; the back board (fixed) carries the last
// spread's right page. Each leaf turns about the spine, φ ∈ [0, π]
// (0 = lying on the right-hand stack, π = on the left).
//
// `turned` leaves lie on the left, so spread `turned − 1` is open (−1: shut).
// Only the top leaf of either stack can move — exactly like paper.
//
// Pure logic: no three.js, no DOM. The renderer reads `phi` every frame.

/** Angle step between stacked leaves (rad): board thickness over page width. */
export const STACK = 0.006

/** Spring stiffness (rad/s natural frequency) for leaves settling. */
const OMEGA = 9.5

export function createBook(S) {
  const phi = new Float64Array(S)
  const vel = new Float64Array(S)
  const target = new Float64Array(S)
  const book = {
    S,
    phi,
    vel,
    target,
    turned: 0,
    /** leaf being dragged by the reader, or −1 */
    held: -1,
    /** leaves still flipping on their own (riffles) */
    queue: [],
    queueClock: 0,
  }
  for (let i = 0; i < S; i++) phi[i] = target[i] = restAngle(book, i, 0)
  return book
}

/** Where leaf i rests once `turned` leaves are on the left. */
export function restAngle(book, i, turned = book.turned) {
  // the top of each stack sits highest: on the left, leaf i has i leaves
  // under it; on the right, S − i (counting the back board)
  return i < turned ? Math.PI - i * STACK : (book.S - i) * STACK
}

/** The angles of a spread's left and right pages. */
export function spreadAngles(book, k) {
  const left = book.phi[k]
  const right = k + 1 < book.S ? book.phi[k + 1] : 0
  return [left, right]
}

/** Spread k's opening angle (0 shut … π flat). */
export const spreadAlpha = (book, k) => {
  const [l, r] = spreadAngles(book, k)
  return Math.max(0, l - r)
}

/** Index of the open spread (−1 while the book is shut). */
export const openSpread = (book) => book.turned - 1

export function beginDrag(book, leaf) {
  if (book.held >= 0 || book.queue.length) return false
  if (leaf !== book.turned && leaf !== book.turned - 1) return false
  book.held = leaf
  return true
}

/** Set the held leaf's angle (clamped between its stacks). */
export function drag(book, phi, dt = 1 / 60) {
  const i = book.held
  if (i < 0) return
  // between its stacks, and never through a neighbour still settling
  let lo = restAngle(book, i, i)
  let hi = restAngle(book, i, i + 1)
  if (i + 1 < book.S) lo = Math.max(lo, book.phi[i + 1] + STACK * 0.5)
  if (i > 0) hi = Math.min(hi, book.phi[i - 1] - STACK * 0.5)
  if (lo > hi) lo = hi
  const next = Math.max(lo, Math.min(hi, phi))
  // smoothed angular velocity: the release reads it as the flick
  book.vel[i] = book.vel[i] * 0.6 + ((next - book.phi[i]) / Math.max(dt, 1e-3)) * 0.4
  book.phi[i] = next
}

/**
 * Let go: the leaf completes its turn if it is past the vertical or was
 * flicked toward the far stack, else falls back. Returns +1 (turned forward),
 * −1 (turned back) or 0 (settled where it came from).
 */
export function release(book, flick = book.vel[book.held] ?? 0) {
  const i = book.held
  if (i < 0) return 0
  book.held = -1
  const wasLeft = i < book.turned
  const p = book.phi[i]
  const goLeft = flick > 2.2 ? true : flick < -2.2 ? false : p > Math.PI / 2
  if (goLeft && !wasLeft) book.turned = i + 1
  if (!goLeft && wasLeft) book.turned = i
  for (let j = 0; j < book.S; j++) book.target[j] = restAngle(book, j)
  book.vel[i] = flick
  return goLeft === wasLeft ? 0 : goLeft ? 1 : -1
}

/**
 * Turn to spread k (−1 = shut) on its own, leaf by leaf with a stagger —
 * a riffle when the jump is long.
 */
export function turnTo(book, k, stagger = 0.11) {
  const want = Math.max(0, Math.min(book.S, k + 1))
  if (book.held >= 0) return false
  if (want === book.turned) {
    // asked to stop a riffle where it is: drop the rest of the queue
    if (!book.queue.length) return false
    book.queue = []
    for (let j = 0; j < book.S; j++) book.target[j] = restAngle(book, j)
    return true
  }
  const step = want > book.turned ? 1 : -1
  const leaves = []
  for (let t = book.turned; t !== want; t += step) leaves.push(step > 0 ? t : t - 1)
  // long jumps riffle faster
  const gap = Math.min(stagger, 0.9 / leaves.length)
  book.queue = leaves.map((leaf, n) => ({ leaf, at: n * gap, dir: step }))
  book.queueClock = 0
  return true
}

/** Advance springs and any queued turns by dt seconds. Returns true while anything moves. */
export function step(book, dt) {
  dt = Math.min(dt, 1 / 20)
  if (book.queue.length) {
    book.queueClock += dt
    while (book.queue.length && book.queue[0].at <= book.queueClock) {
      const { leaf, dir } = book.queue.shift()
      book.turned = dir > 0 ? leaf + 1 : leaf
      for (let j = 0; j < book.S; j++) book.target[j] = restAngle(book, j)
    }
  }
  let moving = book.queue.length > 0
  for (let i = 0; i < book.S; i++) {
    if (i === book.held) {
      moving = true
      continue
    }
    const x = book.phi[i] - book.target[i]
    const v = book.vel[i]
    if (Math.abs(x) < 1e-5 && Math.abs(v) < 1e-4) {
      book.phi[i] = book.target[i]
      book.vel[i] = 0
      continue
    }
    moving = true
    // critically damped spring, integrated exactly for the step
    const w = OMEGA
    const e = Math.exp(-w * dt)
    const c = v + w * x
    const nx = (x + c * dt) * e
    const nv = (v - w * c * dt) * e
    book.phi[i] = book.target[i] + nx
    book.vel[i] = nv
    // a leaf can never pass through the stacks
    const lo = restAngle(book, i, i)
    const hi = restAngle(book, i, i + 1)
    if (book.phi[i] < lo) {
      book.phi[i] = lo
      book.vel[i] = 0
    } else if (book.phi[i] > hi) {
      book.phi[i] = hi
      book.vel[i] = 0
    }
  }
  return moving
}

/** Finish any queued turns at once and put every leaf at rest (reduced motion). */
export function settleNow(book) {
  if (book.held >= 0) return
  for (const q of book.queue) book.turned = q.dir > 0 ? q.leaf + 1 : q.leaf
  book.queue = []
  for (let i = 0; i < book.S; i++) {
    book.target[i] = book.phi[i] = restAngle(book, i)
    book.vel[i] = 0
  }
}
