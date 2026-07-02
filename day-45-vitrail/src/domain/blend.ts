// Two-parent crossbreed. Fully deterministic: the same two parents always
// yield the same child, so blends are as reproducible as seeds are.

import { clampGenome, type WindowGenome } from './genome'
import { createRng, makeSeedToken, randRange } from './random'

export function blendGenomes(a: WindowGenome, b: WindowGenome): WindowGenome {
  const rng = createRng(`${a.seed}×${b.seed}:blend`)

  // numeric genes: lerp at a seeded ratio biased toward the middle
  const mix = (x: number, y: number) => {
    const t = randRange(rng, 0.3, 0.7)
    return x + (y - x) * t
  }
  // categorical genes: inherit whole from one parent
  const inherit = <T,>(x: T, y: T): T => (rng() < 0.5 ? x : y)

  return clampGenome({
    seed: makeSeedToken(rng),
    archetype: inherit(a.archetype, b.archetype),
    symmetry: inherit(a.symmetry, b.symmetry),
    rings: Math.round(mix(a.rings, b.rings)),
    density: mix(a.density, b.density),
    traceryStyle: inherit(a.traceryStyle, b.traceryStyle),
    leadWidth: mix(a.leadWidth, b.leadWidth),
    paletteId: inherit(a.paletteId, b.paletteId),
    jitter: mix(a.jitter, b.jitter),
    medallion: inherit(a.medallion, b.medallion),
  })
}
