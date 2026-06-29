// Deterministic 2D value noise + fractal Brownian motion + domain warp.
//
// Lattice values come from a seed-perturbed integer hash, so the field is fully
// reproducible from a seed and has no global state. fBm stacks octaves of that
// noise into cloudy terrain; domain warp distorts the sample point with a second
// noise field, which is what turns smooth blobs into ragged, believable coasts.

import { hashSeed } from './random'

export type Noise2D = (x: number, y: number) => number

/** Integer lattice hash → a stable pseudo-random value in [0, 1). */
function hash2(ix: number, iy: number, seed: number): number {
  let h = seed >>> 0
  h = Math.imul(h ^ (ix | 0), 0x27d4eb2d)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (iy | 0), 0x165667b1)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Quintic fade — Perlin's smootherstep, zero 1st & 2nd derivatives at 0/1. */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Build a smooth value-noise function `f(x, y) → [0, 1]` for a given seed. */
export function makeValueNoise(seed: number | string): Noise2D {
  const s = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0
  return (x, y) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = fade(x - x0)
    const fy = fade(y - y0)
    const top = lerp(hash2(x0, y0, s), hash2(x0 + 1, y0, s), fx)
    const bottom = lerp(hash2(x0, y0 + 1, s), hash2(x0 + 1, y0 + 1, s), fx)
    return lerp(top, bottom, fy)
  }
}

export interface FbmOptions {
  /** Number of noise layers summed (more = finer detail). */
  octaves: number
  /** Amplitude multiplier per octave, 0..1 (lower = smoother). */
  persistence: number
  /** Frequency multiplier per octave (~2 = classic). */
  lacunarity: number
  /** Base frequency of the first octave. */
  frequency: number
}

export const DEFAULT_FBM: FbmOptions = {
  octaves: 5,
  persistence: 0.5,
  lacunarity: 2,
  frequency: 1,
}

/** Fractal Brownian motion: amplitude-normalised sum of noise octaves → [0, 1]. */
export function fbm(noise: Noise2D, x: number, y: number, opts: FbmOptions): number {
  let amp = 1
  let freq = opts.frequency
  let sum = 0
  let norm = 0
  const octaves = Math.max(1, Math.round(opts.octaves))
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * freq, y * freq)
    norm += amp
    amp *= opts.persistence
    freq *= opts.lacunarity
  }
  return norm > 0 ? sum / norm : 0
}

/**
 * Domain warp: offset `(x, y)` by an fBm vector field before sampling, so the
 * terrain folds back on itself into organic coastlines. `strength` is in the
 * same units as the input coordinates. Returns the warped sample point.
 */
export function warp(
  noise: Noise2D,
  x: number,
  y: number,
  strength: number,
  opts: FbmOptions,
): { x: number; y: number } {
  const wx = fbm(noise, x + 11.3, y + 5.1, opts)
  const wy = fbm(noise, x + 41.7, y + 17.9, opts)
  return {
    x: x + (wx - 0.5) * 2 * strength,
    y: y + (wy - 0.5) * 2 * strength,
  }
}
