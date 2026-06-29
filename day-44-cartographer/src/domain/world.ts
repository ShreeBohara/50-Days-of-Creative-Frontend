// The world model: a small genome → a deterministic elevation/moisture field →
// biome classification. Everything here is pure so a chart reproduces exactly
// from its `WorldParams`, which is what powers presets, share links and blending.

import { DEFAULT_FBM, fbm, makeValueNoise, warp, type FbmOptions } from './noise'
import { hashSeed } from './random'

export const SCHEMA_VERSION = 1

/** Heightfield resolution (cells per side). */
export const GRID_SIZE = 144

/** Controls continent size — lower = larger landmasses. */
const FEATURE_SCALE = 3.1

/** The genome of a world. */
export interface WorldParams {
  version: number
  /** Human/URL-friendly seed token — drives every noise channel. */
  seed: string
  /** Height threshold below which a cell is ocean (0..1). */
  seaLevel: number
  /** Domain-warp strength — higher = more ragged, fjorded coastlines. */
  relief: number
  /** fBm octave count — higher = finer terrain detail. */
  octaves: number
  /** fBm amplitude falloff (0..1) — higher = rougher. */
  persistence: number
  /** Uplift exponent — <1 flattens, >1 sharpens peaks. */
  mountainBias: number
  /** Radial falloff strength — 0 = sprawling continents, 1 = lone island. */
  islandBias: number
  /** Number of rivers to trace from the highlands. */
  rivers: number
  /** Selected biome palette id. */
  biomePaletteId: string
  /** Selected place-name language id. */
  languageId: string
  /** Fraction of candidate sites to engrave with names (0..1). */
  labelDensity: number
}

export const PARAM_RANGES = {
  seaLevel: { min: 0.3, max: 0.6, step: 0.005 },
  relief: { min: 0, max: 0.55, step: 0.01 },
  octaves: { min: 2, max: 7, step: 1 },
  persistence: { min: 0.35, max: 0.7, step: 0.01 },
  mountainBias: { min: 0.6, max: 2.6, step: 0.05 },
  islandBias: { min: 0, max: 1, step: 0.02 },
  rivers: { min: 0, max: 8, step: 1 },
  labelDensity: { min: 0, max: 1, step: 0.05 },
} as const

/** Biome bands, ordered from deepest water to highest peak. */
export const BIOMES = [
  'deep',
  'ocean',
  'shore',
  'lowland',
  'grass',
  'forest',
  'highland',
  'mountain',
  'peak',
] as const
export type Biome = (typeof BIOMES)[number]

export interface HeightField {
  size: number
  /** Row-major elevation in [0, 1]. */
  data: Float32Array
  /** Row-major moisture in [0, 1] (a decorrelated noise field). */
  moisture: Float32Array
}

/** Derive a decorrelated channel seed (elevation, moisture, rivers, names…). */
export function seedFor(seed: string, channel: string): number {
  return hashSeed(`${seed}::${channel}`)
}

function fbmOptions(params: WorldParams): FbmOptions {
  return {
    ...DEFAULT_FBM,
    octaves: params.octaves,
    persistence: params.persistence,
  }
}

/** Generate the elevation + moisture field for a world. */
export function generateHeightfield(params: WorldParams): HeightField {
  const size = GRID_SIZE
  const data = new Float32Array(size * size)
  const moisture = new Float32Array(size * size)
  const elevNoise = makeValueNoise(seedFor(params.seed, 'elev'))
  const warpNoise = makeValueNoise(seedFor(params.seed, 'warp'))
  const moistNoise = makeValueNoise(seedFor(params.seed, 'moist'))
  const opts = fbmOptions(params)
  const warpOpts: FbmOptions = { ...opts, octaves: 3 }

  for (let gy = 0; gy < size; gy++) {
    for (let gx = 0; gx < size; gx++) {
      const u = gx / (size - 1)
      const v = gy / (size - 1)
      const sx = u * FEATURE_SCALE
      const sy = v * FEATURE_SCALE

      // Warp the sample point for organic coastlines.
      const w = warp(warpNoise, sx, sy, params.relief, warpOpts)
      let e = fbm(elevNoise, w.x, w.y, opts)

      // Radial island mask: 1 at centre, fading to 0 at the edges, blended by islandBias.
      const nx = u * 2 - 1
      const ny = v * 2 - 1
      const radial = Math.max(0, 1 - (nx * nx + ny * ny))
      const mask = 1 - params.islandBias + params.islandBias * radial
      e *= mask

      // Uplift / flatten.
      e = Math.pow(Math.min(1, Math.max(0, e)), params.mountainBias)

      const idx = gy * size + gx
      data[idx] = e
      moisture[idx] = fbm(moistNoise, sx * 1.7 + 9.2, sy * 1.7 - 4.1, { ...opts, octaves: 3 })
    }
  }

  return { size, data, moisture }
}

/** Classify one cell into a biome index, given the world's sea level. */
export function classifyCell(elevation: number, moisture: number, seaLevel: number): number {
  if (elevation < seaLevel * 0.78) return 0 // deep
  if (elevation < seaLevel) return 1 // ocean (shallow)
  const land = (elevation - seaLevel) / Math.max(1e-4, 1 - seaLevel)
  if (land < 0.04) return 2 // shore
  if (land < 0.26) return moisture < 0.42 ? 4 : 3 // grass / lowland
  if (land < 0.5) return moisture < 0.36 ? 4 : 5 // grass / forest
  if (land < 0.72) return 6 // highland
  if (land < 0.9) return 7 // mountain
  return 8 // peak
}

/** Classify a whole field into a row-major biome-index grid. */
export function classifyField(field: HeightField, seaLevel: number): Uint8Array {
  const out = new Uint8Array(field.size * field.size)
  for (let i = 0; i < out.length; i++) {
    out[i] = classifyCell(field.data[i], field.moisture[i], seaLevel)
  }
  return out
}

/** Fraction of cells above sea level (land). */
export function landFraction(field: HeightField, seaLevel: number): number {
  let land = 0
  for (let i = 0; i < field.data.length; i++) {
    if (field.data[i] >= seaLevel) land++
  }
  return land / field.data.length
}

export interface FieldStats {
  landFraction: number
  maxElevation: number
  /** Grid coordinate of the highest cell. */
  peak: { gx: number; gy: number }
}

export function fieldStats(field: HeightField, seaLevel: number): FieldStats {
  let max = -Infinity
  let peakIdx = 0
  for (let i = 0; i < field.data.length; i++) {
    if (field.data[i] > max) {
      max = field.data[i]
      peakIdx = i
    }
  }
  return {
    landFraction: landFraction(field, seaLevel),
    maxElevation: max,
    peak: { gx: peakIdx % field.size, gy: Math.floor(peakIdx / field.size) },
  }
}
