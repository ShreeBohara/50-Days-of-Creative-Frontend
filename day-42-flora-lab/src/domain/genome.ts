export const DNA_VERSION = 1 as const
export const DNA_QUERY_KEY = 'dna'

export const SYMMETRIES = ['bilateral', 'radial', 'spiral'] as const
export const LEAF_SHAPES = ['oval', 'lance', 'fan'] as const
export const LEAF_ARRANGEMENTS = ['alternate', 'opposite', 'golden'] as const
export const BLOOM_FORMS = ['none', 'daisy', 'bell', 'star'] as const
export const PALETTES = ['herbarium', 'alpine', 'desert', 'tropic'] as const

export type Symmetry = (typeof SYMMETRIES)[number]
export type LeafShape = (typeof LEAF_SHAPES)[number]
export type LeafArrangement = (typeof LEAF_ARRANGEMENTS)[number]
export type BloomForm = (typeof BLOOM_FORMS)[number]
export type PaletteName = (typeof PALETTES)[number]

export interface PlantGenomeV1 {
  version: typeof DNA_VERSION
  seed: string
  architecture: {
    branchDepth: number
    spread: number
    curvature: number
    taper: number
    symmetry: Symmetry
  }
  foliage: {
    shape: LeafShape
    arrangement: LeafArrangement
    size: number
    density: number
  }
  bloom: {
    form: BloomForm
    density: number
    scale: number
  }
  palette: PaletteName
}

export const DEFAULT_GENOME: PlantGenomeV1 = {
  version: DNA_VERSION,
  seed: 'verdant-42',
  architecture: {
    branchDepth: 4,
    spread: 34,
    curvature: 0.18,
    taper: 0.72,
    symmetry: 'bilateral',
  },
  foliage: {
    shape: 'oval',
    arrangement: 'alternate',
    size: 0.92,
    density: 0.7,
  },
  bloom: {
    form: 'daisy',
    density: 0.32,
    scale: 0.9,
  },
  palette: 'herbarium',
}

const bounds = {
  branchDepth: [2, 5],
  spread: [14, 62],
  curvature: [-0.42, 0.42],
  taper: [0.56, 0.82],
  leafSize: [0.45, 1.5],
  leafDensity: [0.18, 1],
  bloomDensity: [0, 0.72],
  bloomScale: [0.5, 1.45],
} as const

function clamp(value: unknown, [minimum, maximum]: readonly [number, number], fallback: number) {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(maximum, Math.max(minimum, number))
}

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? (value as T) : fallback
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function normalizeSeed(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_GENOME.seed
  const cleaned = value.trim().replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40)
  return cleaned || DEFAULT_GENOME.seed
}

export function normalizeGenome(value: unknown): PlantGenomeV1 {
  const candidate = objectValue(value)
  const architecture = objectValue(candidate.architecture)
  const foliage = objectValue(candidate.foliage)
  const bloom = objectValue(candidate.bloom)

  return {
    version: DNA_VERSION,
    seed: normalizeSeed(candidate.seed),
    architecture: {
      branchDepth: Math.round(clamp(architecture.branchDepth, bounds.branchDepth, DEFAULT_GENOME.architecture.branchDepth)),
      spread: clamp(architecture.spread, bounds.spread, DEFAULT_GENOME.architecture.spread),
      curvature: clamp(architecture.curvature, bounds.curvature, DEFAULT_GENOME.architecture.curvature),
      taper: clamp(architecture.taper, bounds.taper, DEFAULT_GENOME.architecture.taper),
      symmetry: enumValue(architecture.symmetry, SYMMETRIES, DEFAULT_GENOME.architecture.symmetry),
    },
    foliage: {
      shape: enumValue(foliage.shape, LEAF_SHAPES, DEFAULT_GENOME.foliage.shape),
      arrangement: enumValue(foliage.arrangement, LEAF_ARRANGEMENTS, DEFAULT_GENOME.foliage.arrangement),
      size: clamp(foliage.size, bounds.leafSize, DEFAULT_GENOME.foliage.size),
      density: clamp(foliage.density, bounds.leafDensity, DEFAULT_GENOME.foliage.density),
    },
    bloom: {
      form: enumValue(bloom.form, BLOOM_FORMS, DEFAULT_GENOME.bloom.form),
      density: clamp(bloom.density, bounds.bloomDensity, DEFAULT_GENOME.bloom.density),
      scale: clamp(bloom.scale, bounds.bloomScale, DEFAULT_GENOME.bloom.scale),
    },
    palette: enumValue(candidate.palette, PALETTES, DEFAULT_GENOME.palette),
  }
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeGenome(genome: PlantGenomeV1): string {
  return toBase64Url(JSON.stringify(normalizeGenome(genome)))
}

export function decodeGenome(encoded: string): PlantGenomeV1 {
  const parsed = JSON.parse(fromBase64Url(encoded)) as { version?: unknown }
  if (parsed.version !== DNA_VERSION) {
    throw new Error('This specimen uses an unsupported DNA version.')
  }
  return normalizeGenome(parsed)
}

export function genomeFromSearch(search: string): { genome: PlantGenomeV1; error: string | null } {
  const encoded = new URLSearchParams(search).get(DNA_QUERY_KEY)
  if (!encoded) return { genome: DEFAULT_GENOME, error: null }

  try {
    return { genome: decodeGenome(encoded), error: null }
  } catch {
    return {
      genome: DEFAULT_GENOME,
      error: 'The shared DNA could not be read. A healthy base specimen was restored.',
    }
  }
}

export function cloneGenome(genome: PlantGenomeV1): PlantGenomeV1 {
  return structuredClone(genome)
}

export function makeSeed(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return `flora-${bytes[0].toString(36)}${bytes[1].toString(36)}`.slice(0, 28)
}
