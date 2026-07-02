// Compact, URL-safe genome codec for share links. Versioned so old links
// keep resolving; anything malformed clamps back to a renderable window.

import { clampGenome, type WindowGenome } from './genome'

const VERSION = '1'
const FIELDS = 11

export function serializeGenome(genome: WindowGenome): string {
  const g = clampGenome(genome)
  return [
    VERSION,
    encodeURIComponent(g.seed),
    g.archetype,
    g.symmetry,
    g.rings,
    g.density.toFixed(3),
    g.traceryStyle,
    g.leadWidth.toFixed(2),
    g.paletteId,
    g.jitter.toFixed(3),
    g.medallion,
  ].join('|')
}

export function deserializeGenome(input: string): WindowGenome | null {
  const parts = input.split('|')
  if (parts.length !== FIELDS || parts[0] !== VERSION) return null
  const [, seed, archetype, symmetry, rings, density, traceryStyle, leadWidth, paletteId, jitter, medallion] = parts
  try {
    return clampGenome({
      seed: decodeURIComponent(seed),
      archetype: archetype as WindowGenome['archetype'],
      symmetry: Number(symmetry),
      rings: Number(rings),
      density: Number(density),
      traceryStyle: traceryStyle as WindowGenome['traceryStyle'],
      leadWidth: Number(leadWidth),
      paletteId: paletteId as WindowGenome['paletteId'],
      jitter: Number(jitter),
      medallion: medallion as WindowGenome['medallion'],
    })
  } catch {
    return null
  }
}
