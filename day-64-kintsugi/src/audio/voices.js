// ============================================================
// Voice bookkeeping and parameter maps — the pure half of the
// audio engine. Nothing here touches Web Audio, so all of it runs
// under Vitest in node: which voice to steal when the pool is
// full, how loud and how high a shard contact sounds, how stroke
// speed opens a filter, and the rate limiter that keeps a shard
// avalanche from turning into a buzz.
// ============================================================

// Metres. The tray is under a metre across; anything past this is
// a physics blow-up, not a place a sound should come from.
export const POSITION_LIMIT = 20

// Mirrors the PannerNode settings so voices can be ranked by what
// the listener actually hears.
export const PANNER_REF_DISTANCE = 0.35
export const PANNER_ROLLOFF = 1

// Every one-shot envelope decays to this depth by its end time.
export const TAIL_DB = 80

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
export const clamp01 = (x) => (x > 0 ? (x < 1 ? x : 1) : 0) // NaN → 0

// ------------------------------------------------------------
// Vectors — callers may hand us [x, y, z] or a three.js Vector3.
// ------------------------------------------------------------

export function toVec3(v) {
  if (v == null || typeof v !== 'object') return null
  const indexed = Array.isArray(v) || ArrayBuffer.isView(v)
  const x = indexed ? v[0] : v.x
  const y = indexed ? v[1] : v.y
  const z = indexed ? v[2] : v.z
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null
  return [x, y, z]
}

// Non-finite components collapse to 0, everything else is boxed
// into ±POSITION_LIMIT. Always returns a fresh [x, y, z].
export function clampPosition(p) {
  const out = [0, 0, 0]
  if (p == null || typeof p !== 'object') return out
  const indexed = Array.isArray(p) || ArrayBuffer.isView(p)
  const src = indexed ? [p[0], p[1], p[2]] : [p.x, p.y, p.z]
  for (let i = 0; i < 3; i += 1) {
    const c = src[i]
    out[i] = Number.isFinite(c) ? clamp(c, -POSITION_LIMIT, POSITION_LIMIT) : 0
  }
  return out
}

// Grid cell id for per-place rate limiting: shards touching down
// within `cell` metres of each other share a key.
export function bucketKey(position, cell = 0.05) {
  const [x, y, z] = clampPosition(position)
  return `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
}

// Web Audio's 'inverse' distance model:
//   g = ref / (ref + rolloff · (max(d, ref) − ref))
export function distanceGain(a, b, ref = PANNER_REF_DISTANCE, rolloff = PANNER_ROLLOFF) {
  const d = Math.max(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), ref)
  return ref / (ref + rolloff * (d - ref))
}

// ------------------------------------------------------------
// Voice stealing
// ------------------------------------------------------------

// Estimated linear level of a voice { start, end, gain } at `now`.
// Every one-shot here decays exponentially to −TAIL_DB at its end
// time, so its level in dB falls linearly across [start, end].
// A voice scheduled in the future counts as full strength.
export function voiceLevel(v, now) {
  if (!v || !(v.end > now)) return 0
  const span = v.end - v.start
  const t = span > 0 && Number.isFinite(span) ? clamp01((now - v.start) / span) : 0
  // unknown (missing or NaN) gain counts as loud, so it isn't stolen first
  const gain = v.gain == null || Number.isNaN(v.gain) ? 1 : Math.max(0, v.gain)
  return gain * 10 ** ((-TAIL_DB / 20) * t)
}

// Index of the pool slot a new voice should take. Empty (null)
// or finished slots win outright; otherwise the voice that is
// quietest right now — which folds in "ends soonest", since a
// voice near its end is deep into its decay. Ties go to the one
// that ends first. Returns -1 only for an empty pool: a full pool
// always yields a valid index, even if every level is Infinity.
export function pickVoice(pool, now) {
  let best = -1
  let bestLevel = Infinity
  let bestEnd = Infinity
  for (let i = 0; i < pool.length; i += 1) {
    const v = pool[i]
    if (!v || !(v.end > now)) return i
    const level = voiceLevel(v, now)
    if (best === -1 || level < bestLevel || (level === bestLevel && v.end < bestEnd)) {
      best = i
      bestLevel = level
      bestEnd = v.end
    }
  }
  return best
}

// ------------------------------------------------------------
// Shard contacts
// ------------------------------------------------------------

// Contact impulse, N·s. Rapier reports ~1e-4 for a shard that is
// merely resting, 0.001 for a light tick, 0.2 for a hard landing.
export const IMPULSE_GATE = 0.0006
export const IMPULSE_MIN = 0.001
export const IMPULSE_MAX = 0.2
export const CLATTER_FLOOR_DB = -30

// Log-mapped: every decade of impulse adds the same number of dB,
// from CLATTER_FLOOR_DB at IMPULSE_MIN up to 0 dB at IMPULSE_MAX.
// Below the gate the contact is silent (resting jitter).
export function clatterGain(impulse) {
  if (!(impulse >= IMPULSE_GATE)) return 0
  const t = clamp01(Math.log(impulse / IMPULSE_MIN) / Math.log(IMPULSE_MAX / IMPULSE_MIN))
  return 10 ** ((CLATTER_FLOOR_DB * (1 - t)) / 20)
}

// Characteristic shard size (m) → first ping frequency (Hz).
// A thin shell's modes scale with thickness / length², but the full
// square law spans too many octaves across our shard sizes, so this
// uses a gentler power: pitch doubles when size drops ~2.4×.
export const SIZE_REF = 0.04
export const PITCH_REF = 2800
export const PITCH_MIN = 700
export const PITCH_MAX = 9000

export function clatterPitch(size) {
  const s = Number.isFinite(size) && size > 0 ? clamp(size, 0.004, 0.3) : SIZE_REF
  return clamp(PITCH_REF * (SIZE_REF / s) ** 0.8, PITCH_MIN, PITCH_MAX)
}

// The scene reports severity either as a 0..1 number or as the
// severity bucket from logic/severity.js.
const SEVERITY_AMOUNT = { set: 0.15, hairline: 0.35, drop: 0.65, fling: 1 }

export function severityAmount(severity) {
  if (typeof severity === 'string') return SEVERITY_AMOUNT[severity] ?? 0.65
  return Number.isFinite(severity) ? clamp01(severity) : 0.65
}

// ------------------------------------------------------------
// Continuous strokes (brush, burnish)
// ------------------------------------------------------------

// Stroke speed 0..1 → { freq, gain }. The cutoff moves on a log
// scale (equal steps sound equal); gain follows speed^curve, where
// curve < 1 makes slow strokes audible and > 1 holds a layer back
// until the stroke is quick.
export function mapSpeedToFilter(speed01, { minHz = 900, maxHz = 5200, maxGain = 1, curve = 0.6 } = {}) {
  const s = clamp01(speed01)
  return {
    freq: minHz * (maxHz / minHz) ** s,
    gain: maxGain * s ** curve,
  }
}

// ------------------------------------------------------------
// Envelopes
// ------------------------------------------------------------

// Swoosh envelope for setValueCurveAtTime: a half-sine whose time
// axis is warped (x^k) so the peak lands at `peakAt` instead of the
// middle; `power` sharpens (>1) or flattens (<1) the hump. Starts
// and ends at exactly 0 so the curve can't click.
export function swooshCurve(n = 48, peakAt = 0.4, power = 1.5, scale = 1) {
  const len = Math.max(3, Math.floor(n))
  const k = Math.log(0.5) / Math.log(clamp(peakAt, 0.05, 0.95))
  const out = new Float32Array(len)
  for (let i = 1; i < len - 1; i += 1) {
    const x = i / (len - 1)
    out[i] = scale * Math.sin(Math.PI * x ** k) ** power
  }
  return out
}

// ------------------------------------------------------------
// Rate limiting
// ------------------------------------------------------------

// At most `max` acquisitions in any `window` seconds, plus a
// minimum gap between acquisitions sharing a key. The window is a
// ring of the last `max` accepted timestamps: if the oldest of them
// is still inside the window, the window is full. O(1) per call.
// Rejected calls consume nothing.
export class RateLimiter {
  constructor({ max = 40, window = 1, keyInterval = 0, maxKeys = 256 } = {}) {
    this.max = Math.max(1, Math.floor(max))
    this.window = window
    this.keyInterval = keyInterval
    this.maxKeys = maxKeys
    this.times = new Float64Array(this.max).fill(-Infinity)
    this.head = 0
    this.keys = new Map()
  }

  tryAcquire(now, key) {
    if (!Number.isFinite(now)) return false
    if (now - this.times[this.head] < this.window) return false
    if (key != null && this.keyInterval > 0) {
      const last = this.keys.get(key)
      if (last !== undefined && now - last < this.keyInterval) return false
      if (this.keys.size >= this.maxKeys) this.prune(now)
      this.keys.set(key, now)
    }
    this.times[this.head] = now
    this.head = (this.head + 1) % this.max
    return true
  }

  // Keys whose interval has lapsed no longer constrain anything.
  prune(now) {
    for (const [key, t] of this.keys) {
      if (now - t >= this.keyInterval) this.keys.delete(key)
    }
  }

  get keyCount() {
    return this.keys.size
  }

  reset() {
    this.times.fill(-Infinity)
    this.head = 0
    this.keys.clear()
  }
}
