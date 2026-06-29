import { LANGUAGES } from '../data/languages'
import { PALETTES } from './palettes'
import { createRng, pick, randInt, randRange, type Rng } from './random'
import { PARAM_RANGES, SCHEMA_VERSION, type WorldParams } from './world'

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function round(n: number, places: number): number {
  return Number(n.toFixed(places))
}

/** Build a fresh, plausible world deterministically from a seed token. */
export function randomWorld(seed: string): WorldParams {
  const rng: Rng = createRng(seed)
  const r = (k: keyof typeof PARAM_RANGES) =>
    randRange(rng, PARAM_RANGES[k].min, PARAM_RANGES[k].max)
  return {
    version: SCHEMA_VERSION,
    seed,
    seaLevel: round(r('seaLevel'), 3),
    relief: round(r('relief'), 2),
    octaves: randInt(rng, PARAM_RANGES.octaves.min, PARAM_RANGES.octaves.max),
    persistence: round(r('persistence'), 2),
    mountainBias: round(r('mountainBias'), 2),
    islandBias: round(r('islandBias'), 2),
    rivers: randInt(rng, PARAM_RANGES.rivers.min, PARAM_RANGES.rivers.max),
    biomePaletteId: pick(rng, PALETTES).id,
    languageId: pick(rng, LANGUAGES).id,
    labelDensity: round(r('labelDensity'), 2),
  }
}

/** Nudge a world's genome by a bounded, seeded amount (0 = identity). */
export function mutate(params: WorldParams, seed: string, amount = 0.16): WorldParams {
  const rng = createRng(seed)
  const nudge = (value: number, range: { min: number; max: number }) =>
    clamp(value + (rng() * 2 - 1) * amount * (range.max - range.min), range.min, range.max)

  return {
    ...params,
    seed,
    seaLevel: round(nudge(params.seaLevel, PARAM_RANGES.seaLevel), 3),
    relief: round(nudge(params.relief, PARAM_RANGES.relief), 2),
    octaves: Math.round(nudge(params.octaves, PARAM_RANGES.octaves)),
    persistence: round(nudge(params.persistence, PARAM_RANGES.persistence), 2),
    mountainBias: round(nudge(params.mountainBias, PARAM_RANGES.mountainBias), 2),
    islandBias: round(nudge(params.islandBias, PARAM_RANGES.islandBias), 2),
    rivers: Math.round(nudge(params.rivers, PARAM_RANGES.rivers)),
    labelDensity: round(nudge(params.labelDensity, PARAM_RANGES.labelDensity), 2),
    biomePaletteId: rng() < 0.3 ? pick(rng, PALETTES).id : params.biomePaletteId,
    languageId: rng() < 0.2 ? pick(rng, LANGUAGES).id : params.languageId,
  }
}
