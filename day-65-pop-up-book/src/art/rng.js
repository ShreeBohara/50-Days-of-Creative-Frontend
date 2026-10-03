// Seeded randomness for the print engine and the painters: every sheet in the
// book prints the same way on every visit (and in the node preview script).

/** mulberry32: tiny, fast, good enough for art. Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** String → 32-bit seed (FNV-1a). */
export function hashString(s) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** An rng with conveniences, seeded from anything. */
export function makeRng(seed) {
  const r = mulberry32(typeof seed === 'number' ? seed : hashString(String(seed)))
  const rng = () => r()
  rng.range = (lo, hi) => lo + (hi - lo) * r()
  rng.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r())
  rng.pick = (arr) => arr[Math.floor(r() * arr.length)]
  rng.chance = (p) => r() < p
  /** roughly normal, mean 0, sd 1 */
  rng.gauss = () => {
    let u = 0
    for (let i = 0; i < 4; i++) u += r()
    return (u - 2) * 1.73
  }
  return rng
}

/** Integer lattice hash → [0, 1). Stateless, so noise can be sampled anywhere. */
export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const fade = (t) => t * t * (3 - 2 * t)

/** Smooth value noise in [0, 1). */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = fade(x - xi)
  const yf = fade(y - yi)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
}

/** Fractal value noise, `oct` octaves, in [0, 1). */
export function fbm(x, y, seed = 0, oct = 4) {
  let amp = 0.5
  let sum = 0
  let norm = 0
  for (let i = 0; i < oct; i++) {
    sum += noise2(x, y, seed + i * 17) * amp
    norm += amp
    x *= 2.03
    y *= 2.03
    amp *= 0.5
  }
  return sum / norm
}
