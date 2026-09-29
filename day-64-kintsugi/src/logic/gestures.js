// ============================================================
// Gestures — what did that pointer trace mean?
//
// Traces are [{ x, y, t }] in CSS pixels and milliseconds, from
// pointerdown to pointerup (append the pointerup sample — a
// resting pointer fires no moves, so the last move can be old).
//
// Rules, first match wins:
//   tap    < 6 px from the start, over in < 220 ms
//   flick  release speed > 1.2 px/ms over the last 80 ms
//   swipe  average horizontal speed > 0.9 px/ms, |dx| > 3·|dy|
//   drag   anything else
// ============================================================

export const TAP_SLOP_PX = 6
export const TAP_MAX_MS = 220
export const FLICK_SPEED = 1.2
export const SWIPE_SPEED = 0.9
export const RELEASE_WINDOW_MS = 80
const REVERSAL_WEIGHT = 1.5

const valid = (s) => s != null && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.t)
const clean = (samples) => (Array.isArray(samples) ? samples.filter(valid) : [])

// Least-squares slope of x(t) and y(t) over the trailing window —
// steadier than first/last when pointer events jitter. If the
// window holds a single timestamp (one sample, or a pointerup
// stamped the same ms as the last move), earlier samples are
// pulled in until there is a time span to fit.
export function releaseVelocity(samples, windowMs = RELEASE_WINDOW_MS) {
  const pts = clean(samples)
  if (pts.length < 2) return { vx: 0, vy: 0 }

  const tEnd = pts[pts.length - 1].t
  let start = pts.length - 1
  while (start > 0 && pts[start - 1].t >= tEnd - windowMs) start -= 1
  while (start > 0 && pts[start].t === tEnd) start -= 1
  const win = pts.slice(start)

  let mt = 0
  let mx = 0
  let my = 0
  for (const p of win) {
    mt += p.t
    mx += p.x
    my += p.y
  }
  mt /= win.length
  mx /= win.length
  my /= win.length

  let stt = 0
  let stx = 0
  let sty = 0
  for (const p of win) {
    const dt = p.t - mt
    stt += dt * dt
    stx += dt * (p.x - mx)
    sty += dt * (p.y - my)
  }
  // All samples share one timestamp: no usable velocity.
  if (stt === 0) return { vx: 0, vy: 0 }
  return { vx: stx / stt, vy: sty / stt }
}

export function classify(samples) {
  const pts = clean(samples)
  if (pts.length === 0) return 'tap'
  const first = pts[0]
  const last = pts[pts.length - 1]
  const duration = last.t - first.t

  // Tap slop is the furthest the pointer strayed, not the net
  // displacement — a wobble out and back is still a drag.
  let travel = 0
  for (const p of pts) travel = Math.max(travel, Math.hypot(p.x - first.x, p.y - first.y))
  if (travel < TAP_SLOP_PX && duration < TAP_MAX_MS) return 'tap'

  const { vx, vy } = releaseVelocity(pts)
  if (Math.hypot(vx, vy) > FLICK_SPEED) return 'flick'

  const dx = last.x - first.x
  const dy = last.y - first.y
  if (duration > 0 && Math.abs(dx) / duration > SWIPE_SPEED && Math.abs(dx) > 3 * Math.abs(dy)) {
    return 'swipe'
  }
  return 'drag'
}

// Burnishing energy: total path length in px, with every segment
// that doubles back on the previous one (negative dot product)
// weighted ×1.5 — fast back-and-forth rubbing beats one long drag.
export function rubEnergy(samples) {
  const pts = clean(samples)
  let energy = 0
  let px = 0
  let py = 0
  for (let i = 1; i < pts.length; i += 1) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    const len = Math.hypot(dx, dy)
    if (len === 0) continue
    const reversed = dx * px + dy * py < 0
    energy += reversed ? len * REVERSAL_WEIGHT : len
    px = dx
    py = dy
  }
  return energy
}
