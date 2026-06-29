// Deterministically crossbreed two worlds. Numeric genes interpolate from
// parent A (t=0) to parent B (t=1); categorical genes (palette, language) are
// inherited by a seeded coin biased toward B as t rises. The child gets its own
// seed, so its terrain is a fresh world expressing the blended genome.

import { createRng } from './random'
import { SCHEMA_VERSION, type WorldParams } from './world'

function lerp(a: number, b: number, t: number): number {
  // exact at the endpoints so a blend reproduces a parent's genes bit-for-bit
  if (t <= 0) return a
  if (t >= 1) return b
  return a + (b - a) * t
}

function round(n: number, places: number): number {
  return Number(n.toFixed(places))
}

export function blendWorlds(a: WorldParams, b: WorldParams, t: number): WorldParams {
  const rng = createRng(`${a.seed}|${b.seed}|${t.toFixed(2)}`)
  // probability of inheriting B's categorical gene rises with the mix
  const pickCat = (av: string, bv: string) => (rng() < t ? bv : av)

  return {
    version: SCHEMA_VERSION,
    seed: `${a.seed}x${b.seed}@${t.toFixed(2)}`,
    seaLevel: round(lerp(a.seaLevel, b.seaLevel, t), 3),
    relief: round(lerp(a.relief, b.relief, t), 2),
    octaves: Math.round(lerp(a.octaves, b.octaves, t)),
    persistence: round(lerp(a.persistence, b.persistence, t), 2),
    mountainBias: round(lerp(a.mountainBias, b.mountainBias, t), 2),
    islandBias: round(lerp(a.islandBias, b.islandBias, t), 2),
    rivers: Math.round(lerp(a.rivers, b.rivers, t)),
    biomePaletteId: pickCat(a.biomePaletteId, b.biomePaletteId),
    languageId: pickCat(a.languageId, b.languageId),
    labelDensity: round(lerp(a.labelDensity, b.labelDensity, t), 2),
  }
}
