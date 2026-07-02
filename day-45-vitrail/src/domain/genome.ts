// The WindowGenome is the single source of truth for a stained-glass window.
// Every downstream stage (tracery, palette assignment, rendering, export,
// share links) derives deterministically from it, so equal genomes always
// produce pixel-identical windows.

import { createRng, makeSeedToken, pick, randInt, randRange, type Rng } from './random'

export const ARCHETYPES = ['rose', 'lancet', 'triptych'] as const
export type Archetype = (typeof ARCHETYPES)[number]

export const TRACERY_STYLES = ['geometric', 'foil', 'flamboyant'] as const
export type TraceryStyle = (typeof TRACERY_STYLES)[number]

export const MEDALLIONS = ['star', 'blossom', 'cross', 'oculus'] as const
export type Medallion = (typeof MEDALLIONS)[number]

export const SYMMETRY_OPTIONS = [6, 8, 12, 16] as const

// Palette ids live here (colors live in palettes.ts) so the genome module
// stays dependency-free and palettes can import the canonical id list.
export const PALETTE_IDS = ['chartres', 'sainte-chapelle', 'forest', 'ember', 'moonlight', 'rosarium'] as const
export type PaletteId = (typeof PALETTE_IDS)[number]

export interface WindowGenome {
  seed: string
  archetype: Archetype
  /** rotational fold count for rose windows; column rhythm elsewhere */
  symmetry: number
  /** concentric rings (rose) or horizontal bands (lancet/triptych) */
  rings: number
  /** 0..1 — how finely rings/bands subdivide into panes */
  density: number
  traceryStyle: TraceryStyle
  /** relative width of the lead came, 1..6 */
  leadWidth: number
  paletteId: PaletteId
  /** 0..1 — per-pane hue/lightness variance of the glass */
  jitter: number
  medallion: Medallion
}

export const GENOME_BOUNDS = {
  rings: { min: 2, max: 6 },
  density: { min: 0, max: 1 },
  leadWidth: { min: 1, max: 6 },
  jitter: { min: 0, max: 1 },
} as const

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function nearestSymmetry(value: number): number {
  let best: number = SYMMETRY_OPTIONS[0]
  for (const option of SYMMETRY_OPTIONS) {
    if (Math.abs(option - value) < Math.abs(best - value)) best = option
  }
  return best
}

export function defaultGenome(): WindowGenome {
  return {
    seed: 'chartres-noon',
    archetype: 'rose',
    symmetry: 12,
    rings: 4,
    density: 0.55,
    traceryStyle: 'foil',
    leadWidth: 3,
    paletteId: 'chartres',
    jitter: 0.35,
    medallion: 'blossom',
  }
}

// Coerce any partially-invalid genome (old share links, hand-edited hashes)
// back into a renderable one instead of throwing.
export function clampGenome(genome: Partial<WindowGenome>): WindowGenome {
  const base = defaultGenome()
  const archetype = ARCHETYPES.includes(genome.archetype as Archetype)
    ? (genome.archetype as Archetype)
    : base.archetype
  const traceryStyle = TRACERY_STYLES.includes(genome.traceryStyle as TraceryStyle)
    ? (genome.traceryStyle as TraceryStyle)
    : base.traceryStyle
  const medallion = MEDALLIONS.includes(genome.medallion as Medallion)
    ? (genome.medallion as Medallion)
    : base.medallion
  const paletteId = PALETTE_IDS.includes(genome.paletteId as PaletteId)
    ? (genome.paletteId as PaletteId)
    : base.paletteId

  return {
    seed: typeof genome.seed === 'string' && genome.seed.length > 0 ? genome.seed.slice(0, 48) : base.seed,
    archetype,
    symmetry: nearestSymmetry(typeof genome.symmetry === 'number' ? genome.symmetry : base.symmetry),
    rings: Math.round(clampNumber(genome.rings ?? base.rings, GENOME_BOUNDS.rings.min, GENOME_BOUNDS.rings.max)),
    density: clampNumber(genome.density ?? base.density, GENOME_BOUNDS.density.min, GENOME_BOUNDS.density.max),
    traceryStyle,
    leadWidth: clampNumber(genome.leadWidth ?? base.leadWidth, GENOME_BOUNDS.leadWidth.min, GENOME_BOUNDS.leadWidth.max),
    paletteId,
    jitter: clampNumber(genome.jitter ?? base.jitter, GENOME_BOUNDS.jitter.min, GENOME_BOUNDS.jitter.max),
    medallion,
  }
}

// A whole new window, deterministic for a given rng.
export function randomGenome(rng: Rng): WindowGenome {
  return clampGenome({
    seed: makeSeedToken(rng),
    archetype: pick(rng, ARCHETYPES),
    symmetry: pick(rng, SYMMETRY_OPTIONS),
    rings: randInt(rng, GENOME_BOUNDS.rings.min, GENOME_BOUNDS.rings.max),
    density: randRange(rng, 0.25, 0.9),
    traceryStyle: pick(rng, TRACERY_STYLES),
    leadWidth: randRange(rng, 1.5, 5),
    paletteId: pick(rng, PALETTE_IDS),
    jitter: randRange(rng, 0.1, 0.8),
    medallion: pick(rng, MEDALLIONS),
  })
}

// Bounded perturbation: nudge numeric genes, occasionally flip a categorical
// one. strength 0..1 scales how far the window drifts from its parent.
export function mutateGenome(genome: WindowGenome, strength: number, seed: string): WindowGenome {
  const rng = createRng(`${seed}:mutate:${genome.seed}`)
  const s = clampNumber(strength, 0, 1)
  const drift = (span: number) => randRange(rng, -span, span) * s

  const flip = <T,>(current: T, options: readonly T[], chance: number): T =>
    rng() < chance * s ? pick(rng, options) : current

  return clampGenome({
    ...genome,
    seed: makeSeedToken(rng),
    archetype: flip(genome.archetype, ARCHETYPES, 0.35),
    symmetry: flip(genome.symmetry, SYMMETRY_OPTIONS, 0.5),
    rings: Math.round(genome.rings + drift(2.4)),
    density: genome.density + drift(0.45),
    traceryStyle: flip(genome.traceryStyle, TRACERY_STYLES, 0.45),
    leadWidth: genome.leadWidth + drift(2.2),
    paletteId: flip(genome.paletteId, PALETTE_IDS, 0.4),
    jitter: genome.jitter + drift(0.4),
    medallion: flip(genome.medallion, MEDALLIONS, 0.45),
  })
}
