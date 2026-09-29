// A square of silk as a Verlet particle grid: structural, shear and bend
// constraints relaxed a few times per step, collisions against the bowl (a
// solid of revolution sampled from its profile) and the tray. Pure JS, no
// three.js — the Veil component copies positions into a BufferGeometry.

export const GRID = 30 // particles per side
export const SIZE = 0.3 // metres
const REST = SIZE / (GRID - 1)
const drapeCache = new Map()

// The silk runs on its own fixed clock ("Fix Your Timestep"): position Verlet
// assumes every step is the same length, and the 0.985 damping is per step, so
// a frame-sized step made it twitch on frame-time jitter and look heavier at
// 120 Hz than at 60. One tick is 1/120 s at any frame rate; 8 relaxation
// passes keep a pull taut (≈0.4 ms a tick on an M3, so ~0.8 ms a 60 Hz frame).
export const TICK = 1 / 120
export const ITERATIONS = 8
const MAX_TICKS = 4 // after a hitch, drop the backlog rather than spiral

// Outer silhouette of the chawan (r at height y), a coarse lookup is plenty
// for a draped cloth; the mouth is treated as closed (silk spans it).
const PROFILE = [
  [0.0, 0.0268],
  [0.009, 0.0268],
  [0.02, 0.046],
  [0.035, 0.056],
  [0.05, 0.0603],
  [0.07, 0.0618],
  [0.084, 0.0622],
  [0.0895, 0.0625],
]
// a hair above the uneven rim, so flat cloth triangles never cut through it
export const BOWL_TOP = 0.0895

export function bowlRadiusAt(y) {
  if (y <= PROFILE[0][0]) return PROFILE[0][1]
  for (let i = 1; i < PROFILE.length; i++) {
    const [y1, r1] = PROFILE[i]
    const [y0, r0] = PROFILE[i - 1]
    if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0)
  }
  return PROFILE[PROFILE.length - 1][1]
}

// The same silhouette as a flat table for the hot loop (collide runs 8× a
// tick over 900 particles), plus the widest radius for a cheap early-out.
const R_STEPS = 256
const R_TABLE = new Float32Array(R_STEPS + 1)
for (let i = 0; i <= R_STEPS; i++) R_TABLE[i] = bowlRadiusAt((i / R_STEPS) * BOWL_TOP)
const R_MAX = Math.max(...PROFILE.map((p) => p[1]))

function radiusAt(y) {
  const f = (Math.min(Math.max(y, 0), BOWL_TOP) / BOWL_TOP) * R_STEPS
  const i = Math.min(f | 0, R_STEPS - 1)
  return R_TABLE[i] + (R_TABLE[i + 1] - R_TABLE[i]) * (f - i)
}

// Constraints are relaxed in colour groups (e.g. every even horizontal link,
// then every odd one): no two links in a run share a particle, so each solve
// doesn't wait on the one before it — about 1.7× faster than grid order.
function colourOf(a, b) {
  const i = a % GRID
  const j = (a / GRID) | 0
  const di = (b % GRID) - i
  const dj = ((b / GRID) | 0) - j
  if (dj === 0) return di === 1 ? i % 2 : 2 + ((i >> 1) % 2) // stretch / bend along a row
  if (di === 0) return dj === 1 ? 4 + (j % 2) : 6 + ((j >> 1) % 2) // … along a column
  return (di === 1 ? 8 : 10) + (j % 2) // the two shear diagonals
}

export class Cloth {
  constructor({ center = [0, 0, 0], height = 0.13, yaw = 0.3 } = {}) {
    const n = GRID * GRID
    this.n = n
    this.center = center
    this.pos = new Float32Array(n * 3)
    this.prev = new Float32Array(n * 3)
    this.pinned = new Int32Array(1).fill(-1)
    this.pinTarget = [0, 0, 0]
    const c = Math.cos(yaw)
    const s = Math.sin(yaw)
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const k = j * GRID + i
        const u = (i / (GRID - 1) - 0.5) * SIZE
        const v = (j / (GRID - 1) - 0.5) * SIZE
        const x = center[0] + u * c - v * s
        const z = center[2] + u * s + v * c
        // a gentle dome so it settles over the bowl instead of folding flat
        const y = center[1] + height - (u * u + v * v) * 0.9
        this.pos.set([x, y, z], k * 3)
        this.prev.set([x, y, z], k * 3)
      }
    }
    // constraints in flat typed arrays: a, b, rest length, stiffness
    const list = []
    const add = (a, b, stiff) => {
      const dx = this.pos[a * 3] - this.pos[b * 3]
      const dz = this.pos[a * 3 + 2] - this.pos[b * 3 + 2]
      list.push(a, b, Math.sqrt(dx * dx + dz * dz), stiff)
    }
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const k = j * GRID + i
        if (i + 1 < GRID) add(k, k + 1, 1)
        if (j + 1 < GRID) add(k, k + GRID, 1)
        if (i + 1 < GRID && j + 1 < GRID) {
          add(k, k + GRID + 1, 0.6)
          add(k + 1, k + GRID, 0.6)
        }
        if (i + 2 < GRID) add(k, k + 2, 0.08) // silk barely resists bending
        if (j + 2 < GRID) add(k, k + GRID * 2, 0.08)
      }
    }
    const m = list.length / 4
    const order = Array.from({ length: m }, (_, c) => c)
    const colour = order.map((c) => colourOf(list[c * 4], list[c * 4 + 1]))
    order.sort((p, q) => colour[p] - colour[q] || p - q)
    this.m = m
    this.ca = new Int32Array(m)
    this.cb = new Int32Array(m)
    this.crest = new Float32Array(m)
    this.cstiff = new Float32Array(m)
    for (let c = 0; c < m; c++) {
      const o = order[c] * 4
      this.ca[c] = list[o]
      this.cb[c] = list[o + 1]
      this.crest[c] = list[o + 2]
      this.cstiff[c] = list[o + 3]
    }
    this.w = new Float32Array(n).fill(1) // inverse mass: 0 while pinned under the finger
    this.rest = REST
    // fixed clock: time not yet simulated, and the positions before the latest tick
    this.acc = 0
    this.last = this.pos.slice()
  }

  /**
   * A cloth already draped over the bowl. The drape is deterministic, so it is
   * simulated once per page and copied into every new cloth ("begin again"
   * remounts the veil) instead of re-running ~260 steps on the main thread.
   */
  static draped(opts = {}, steps = 260) {
    const key = JSON.stringify(opts)
    let d = drapeCache.get(key)
    if (!d) {
      const c = new Cloth(opts)
      for (let i = 0; i < steps; i++) c.step(TICK, ITERATIONS)
      d = { pos: c.pos.slice(), prev: c.prev.slice() }
      drapeCache.set(key, d)
    }
    const c = new Cloth(opts)
    c.pos.set(d.pos)
    c.prev.set(d.pos) // at rest
    c.last.set(d.pos)
    return c
  }

  grab(k, target) {
    this.pinned[0] = k
    this.pinTarget = target
  }

  release() {
    this.pinned[0] = -1
  }

  /**
   * Consume frame time in fixed ticks. `beforeTick(TICK)` runs ahead of each
   * one (anything that drives the cloth should move on simulation time).
   * Returns how many ticks ran — 0 on a fast display's in-between frames.
   */
  advance(dt, beforeTick) {
    this.acc += Math.min(Math.max(dt, 0), 0.1)
    let n = 0
    while (this.acc >= TICK && n < MAX_TICKS) {
      beforeTick?.(TICK)
      this.last.set(this.pos)
      this.step(TICK, ITERATIONS)
      this.acc -= TICK
      n++
    }
    if (this.acc >= TICK) this.acc %= TICK
    return n
  }

  /** Positions to draw: between the last two ticks by the time left over. */
  lerpInto(out) {
    const { pos, last } = this
    const a = Math.min(1, this.acc / TICK)
    for (let i = 0; i < out.length; i++) out[i] = last[i] + (pos[i] - last[i]) * a
    return out
  }

  step(dt, iterations = 10) {
    const { pos, prev, n } = this
    const g = -9.81 * dt * dt
    const damp = 0.985
    for (let k = 0; k < n; k++) {
      const i = k * 3
      const x = pos[i]
      const y = pos[i + 1]
      const z = pos[i + 2]
      pos[i] += (x - prev[i]) * damp
      pos[i + 1] += (y - prev[i + 1]) * damp + g
      pos[i + 2] += (z - prev[i + 2]) * damp
      prev[i] = x
      prev[i + 1] = y
      prev[i + 2] = z
    }
    const pin = this.pinned[0]
    const { ca, cb, crest, cstiff, m, w } = this
    if (pin >= 0) w[pin] = 0
    for (let it = 0; it < iterations; it++) {
      for (let c = 0; c < m; c++) {
        const a = ca[c]
        const b = cb[c]
        const ia = a * 3
        const ib = b * 3
        const dx = pos[ib] - pos[ia]
        const dy = pos[ib + 1] - pos[ia + 1]
        const dz = pos[ib + 2] - pos[ia + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9
        const rest = crest[c]
        const stiff = cstiff[c]
        const wa = w[a]
        const wb = w[b]
        // stretching resists fully; compression barely (cloth buckles)
        const s = (((d - rest) / d) * (d > rest ? stiff : stiff * 0.15)) / (wa + wb || 1)
        const fa = s * wa
        const fb = s * wb
        pos[ia] += dx * fa
        pos[ia + 1] += dy * fa
        pos[ia + 2] += dz * fa
        pos[ib] -= dx * fb
        pos[ib + 1] -= dy * fb
        pos[ib + 2] -= dz * fb
      }
      if (pin >= 0) {
        const t = this.pinTarget
        pos[pin * 3] = t[0]
        pos[pin * 3 + 1] = t[1]
        pos[pin * 3 + 2] = t[2]
      }
      this.collide()
    }
    if (pin >= 0) w[pin] = 1
  }

  collide() {
    const { pos, prev, n, center } = this
    const pad = 0.003
    const [cx, cy, cz] = center
    const top = BOWL_TOP + pad
    const reach2 = (R_MAX + pad) ** 2
    for (let k = 0; k < n; k++) {
      const i = k * 3
      // tray (with friction: kill sliding when resting)
      if (pos[i + 1] < pad) {
        pos[i + 1] = pad
        prev[i] += (pos[i] - prev[i]) * 0.6
        prev[i + 2] += (pos[i + 2] - prev[i + 2]) * 0.6
      }
      // bowl: push out radially below the rim, up through the closed mouth
      const y = pos[i + 1] - cy
      if (y > top) continue
      const x = pos[i] - cx
      const z = pos[i + 2] - cz
      const r2 = x * x + z * z
      if (r2 >= reach2) continue
      const R = radiusAt(y) + pad
      if (r2 >= R * R) continue
      const r = Math.sqrt(r2)
      const toTop = top - y
      const toSide = R - r
      if (toTop < toSide) {
        pos[i + 1] = cy + top
        prev[i] += (pos[i] - prev[i]) * 0.5 // silk grips the rim a little
        prev[i + 2] += (pos[i + 2] - prev[i + 2]) * 0.5
      } else {
        const s = R / (r || 1e-6)
        pos[i] = cx + x * s
        pos[i + 2] = cz + z * s
      }
    }
  }

  /** Share of the cloth still resting on/over the bowl mouth (0..1). */
  coverage() {
    const { pos, n, center } = this
    let over = 0
    for (let k = 0; k < n; k++) {
      const i = k * 3
      const r = Math.hypot(pos[i] - center[0], pos[i + 2] - center[2])
      if (r < 0.055 && pos[i + 1] - center[1] > BOWL_TOP - 0.01) over++
    }
    // the mouth holds ~ (π·0.055²) / cell² particles when fully covered
    const full = (Math.PI * 0.055 * 0.055) / (REST * REST)
    return Math.min(1, over / full)
  }

  nearest(point) {
    let best = -1
    let bd = Infinity
    for (let k = 0; k < this.n; k++) {
      const i = k * 3
      const d = (this.pos[i] - point[0]) ** 2 + (this.pos[i + 1] - point[1]) ** 2 + (this.pos[i + 2] - point[2]) ** 2
      if (d < bd) {
        bd = d
        best = k
      }
    }
    return best
  }
}
