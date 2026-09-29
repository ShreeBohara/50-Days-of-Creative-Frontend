// ============================================================
// Sample data the engine synthesizes once, at unlock: a white-noise
// bed, a "dust" track of sparse clicks (crackle, bristle tips, gold
// sparkle), and the impulse response of a small wooden room for the
// convolver. Pure functions over Float32Arrays with a seeded RNG, so
// they are testable and every session hears the same room.
// ============================================================

// mulberry32 — tiny, fast, good enough for audio noise.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function fillWhite(out, rng) {
  for (let i = 0; i < out.length; i += 1) out[i] = rng() * 2 - 1
  return out
}

// Sparse clicks at `density` per second. Each click is a doublet
// (+a, −0.6a) — no DC offset, and a brighter tick than a lone
// sample. Squaring a uniform skews amplitudes toward quiet, with
// the odd loud one, like grit. Returns the number of clicks.
export function fillDust(out, sampleRate, density, rng) {
  const p = density / sampleRate
  let count = 0
  for (let i = 0; i < out.length; i += 1) {
    if (rng() >= p) continue
    const r = rng()
    const a = (0.2 + 0.8 * r * r) * (rng() < 0.5 ? -1 : 1)
    out[i] = Math.max(-1, Math.min(1, out[i] + a))
    if (i + 1 < out.length) out[i + 1] -= 0.6 * a
    count += 1
  }
  return count
}

// Early reflections (s, gain): tray rim, tabletop, the near walls.
const EARLY = [
  [0.009, 0.9],
  [0.013, 0.7],
  [0.019, 0.55],
  [0.026, 0.45],
  [0.034, 0.35],
]

// Stereo impulse response of a small wooden room. Independent
// noise per channel keeps left and right decorrelated (that's what
// makes a convolver sound wide rather than mono-in-the-middle).
// The tail falls 60 dB over rt60, and a one-pole low-pass slides
// from brightHz to darkHz across the length — wood soaks up the
// highs first. The diffuse tail fades in over ~10 ms so the early
// reflections read as discrete taps. Peak-normalised to 0.9.
export function roomImpulse({
  sampleRate,
  seconds = 1.2,
  rt60 = 0.75,
  predelay = 0.006,
  brightHz = 7000,
  darkHz = 1600,
  seed = 64,
} = {}) {
  const n = Math.round(sampleRate * seconds)
  const start = Math.min(n, Math.round(sampleRate * predelay))
  const fadeLen = Math.min(n - start, Math.round(sampleRate * 0.06))
  // per-sample multipliers: −60 dB per rt60, and an 8 ms build-up constant
  const decayStep = 10 ** (-3 / (rt60 * sampleRate))
  const buildStep = Math.exp(-1 / (0.008 * sampleRate))
  const channels = []

  for (let c = 0; c < 2; c += 1) {
    const rng = mulberry32(seed * 2 + c + 1)
    const out = new Float32Array(n)
    const taps = new Map()
    for (const [time, gain] of EARLY) {
      // nudge each tap a little per channel so the reflections image apart
      const at = start + Math.round((time + (rng() - 0.5) * 0.003) * sampleRate)
      if (at < n) taps.set(at, gain * 3 * (rng() < 0.5 ? -1 : 1))
    }

    let env = 1
    let build = 1 // 1 → 0: (1 − build) is the diffuse field's fade-in
    let y = 0
    let a = 0
    for (let i = start; i < n; i += 1) {
      const k = i - start
      // the cutoff only needs to move every 64 samples
      if ((k & 63) === 0) {
        const fc = brightHz * (darkHz / brightHz) ** (k / (n - start))
        a = 1 - Math.exp((-2 * Math.PI * fc) / sampleRate)
      }
      const x = (rng() * 2 - 1) * (1 - build) + (taps.get(i) ?? 0)
      y += a * (x - y)
      out[i] = y * env
      env *= decayStep
      build *= buildStep
    }

    // raised-cosine fade so the truncated tail can't click
    for (let j = 0; j < fadeLen; j += 1) {
      out[n - 1 - j] *= 0.5 - 0.5 * Math.cos((Math.PI * j) / fadeLen)
    }
    channels.push(out)
  }

  let peak = 0
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i += 1) peak = Math.max(peak, Math.abs(ch[i]))
  }
  if (peak > 0) {
    const g = 0.9 / peak
    for (const ch of channels) for (let i = 0; i < ch.length; i += 1) ch[i] *= g
  }
  return channels
}
