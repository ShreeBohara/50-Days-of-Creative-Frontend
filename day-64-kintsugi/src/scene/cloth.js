// A square of silk as a Verlet particle grid: structural, shear and bend
// constraints relaxed a few times per step, collisions against the bowl (a
// solid of revolution sampled from its profile) and the tray. Pure JS, no
// three.js — the Veil component copies positions into a BufferGeometry.

export const GRID = 30 // particles per side
export const SIZE = 0.3 // metres
const REST = SIZE / (GRID - 1)
const drapeCache = new Map()

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
    this.m = m
    this.ca = new Int32Array(m)
    this.cb = new Int32Array(m)
    this.crest = new Float32Array(m)
    this.cstiff = new Float32Array(m)
    for (let c = 0; c < m; c++) {
      this.ca[c] = list[c * 4]
      this.cb[c] = list[c * 4 + 1]
      this.crest[c] = list[c * 4 + 2]
      this.cstiff[c] = list[c * 4 + 3]
    }
    this.rest = REST
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
      for (let i = 0; i < steps; i++) c.step(1 / 120, 8)
      d = { pos: c.pos.slice(), prev: c.prev.slice() }
      drapeCache.set(key, d)
    }
    const c = new Cloth(opts)
    c.pos.set(d.pos)
    c.prev.set(d.pos) // at rest
    return c
  }

  grab(k, target) {
    this.pinned[0] = k
    this.pinTarget = target
  }

  release() {
    this.pinned[0] = -1
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
    const { ca, cb, crest, cstiff, m } = this
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
        // stretching resists fully; compression barely (cloth buckles)
        const diff = ((d - rest) / d) * (d > rest ? stiff : stiff * 0.15) * 0.5
        const wa = a === pin ? 0 : 1
        const wb = b === pin ? 0 : 1
        const w = wa + wb || 1
        const fa = (diff * 2 * wa) / w
        const fb = (diff * 2 * wb) / w
        pos[ia] += dx * fa
        pos[ia + 1] += dy * fa
        pos[ia + 2] += dz * fa
        pos[ib] -= dx * fb
        pos[ib + 1] -= dy * fb
        pos[ib + 2] -= dz * fb
      }
      if (pin >= 0) pos.set(this.pinTarget, pin * 3)
      this.collide()
    }
  }

  collide() {
    const { pos, prev, n, center } = this
    const pad = 0.003
    for (let k = 0; k < n; k++) {
      const i = k * 3
      // tray (with friction: kill sliding when resting)
      if (pos[i + 1] < pad) {
        pos[i + 1] = pad
        prev[i] += (pos[i] - prev[i]) * 0.6
        prev[i + 2] += (pos[i + 2] - prev[i + 2]) * 0.6
      }
      // bowl: push out radially below the rim, up through the closed mouth
      const x = pos[i] - center[0]
      const z = pos[i + 2] - center[2]
      const y = pos[i + 1] - center[1]
      if (y > BOWL_TOP + pad) continue
      const r = Math.sqrt(x * x + z * z)
      const R = bowlRadiusAt(Math.max(0, y)) + pad
      if (r >= R) continue
      const toTop = BOWL_TOP + pad - y
      const toSide = R - r
      if (toTop < toSide) {
        pos[i + 1] = center[1] + BOWL_TOP + pad
        prev[i] += (pos[i] - prev[i]) * 0.5 // silk grips the rim a little
        prev[i + 2] += (pos[i + 2] - prev[i + 2]) * 0.5
      } else {
        const s = R / (r || 1e-6)
        pos[i] = center[0] + x * s
        pos[i + 2] = center[2] + z * s
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
