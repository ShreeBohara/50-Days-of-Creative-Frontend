import {
  BLOOM_FORMS,
  LEAF_ARRANGEMENTS,
  LEAF_SHAPES,
  makeSeed,
  normalizeGenome,
  PALETTES,
  SYMMETRIES,
  type PlantGenomeV1,
} from './genome'
import { randomBetween, randomFor, randomItem } from './random'

export type MutableGene =
  | 'architecture.branchDepth'
  | 'architecture.spread'
  | 'architecture.curvature'
  | 'architecture.taper'
  | 'architecture.symmetry'
  | 'foliage.shape'
  | 'foliage.arrangement'
  | 'foliage.size'
  | 'foliage.density'
  | 'bloom.form'
  | 'bloom.density'
  | 'bloom.scale'
  | 'palette'

export const MUTABLE_GENES: readonly MutableGene[] = [
  'architecture.branchDepth',
  'architecture.spread',
  'architecture.curvature',
  'architecture.taper',
  'architecture.symmetry',
  'foliage.shape',
  'foliage.arrangement',
  'foliage.size',
  'foliage.density',
  'bloom.form',
  'bloom.density',
  'bloom.scale',
  'palette',
]

export function randomGenome(seed = makeSeed()): PlantGenomeV1 {
  return normalizeGenome({
    version: 1,
    seed,
    architecture: {
      branchDepth: Math.round(randomBetween(seed, 'gene/depth', 3, 5)),
      spread: randomBetween(seed, 'gene/spread', 20, 55),
      curvature: randomBetween(seed, 'gene/curvature', -0.34, 0.34),
      taper: randomBetween(seed, 'gene/taper', 0.6, 0.79),
      symmetry: randomItem(seed, 'gene/symmetry', SYMMETRIES),
    },
    foliage: {
      shape: randomItem(seed, 'gene/leaf-shape', LEAF_SHAPES),
      arrangement: randomItem(seed, 'gene/leaf-arrangement', LEAF_ARRANGEMENTS),
      size: randomBetween(seed, 'gene/leaf-size', 0.65, 1.3),
      density: randomBetween(seed, 'gene/leaf-density', 0.42, 0.96),
    },
    bloom: {
      form: randomItem(seed, 'gene/bloom-form', BLOOM_FORMS),
      density: randomBetween(seed, 'gene/bloom-density', 0.18, 0.68),
      scale: randomBetween(seed, 'gene/bloom-scale', 0.7, 1.3),
    },
    palette: randomItem(seed, 'gene/palette', PALETTES),
  })
}

function mutateGene(genome: PlantGenomeV1, gene: MutableGene, mutationSeed: string, index: number) {
  const path = `mutation/${index}/${gene}`
  const direction = randomFor(mutationSeed, `${path}/direction`) > 0.5 ? 1 : -1

  switch (gene) {
    case 'architecture.branchDepth':
      genome.architecture.branchDepth += direction
      break
    case 'architecture.spread':
      genome.architecture.spread += direction * randomBetween(mutationSeed, path, 4, 10)
      break
    case 'architecture.curvature':
      genome.architecture.curvature += direction * randomBetween(mutationSeed, path, 0.06, 0.16)
      break
    case 'architecture.taper':
      genome.architecture.taper += direction * randomBetween(mutationSeed, path, 0.03, 0.08)
      break
    case 'architecture.symmetry':
      genome.architecture.symmetry = randomItem(mutationSeed, path, SYMMETRIES.filter((value) => value !== genome.architecture.symmetry))
      break
    case 'foliage.shape':
      genome.foliage.shape = randomItem(mutationSeed, path, LEAF_SHAPES.filter((value) => value !== genome.foliage.shape))
      break
    case 'foliage.arrangement':
      genome.foliage.arrangement = randomItem(mutationSeed, path, LEAF_ARRANGEMENTS.filter((value) => value !== genome.foliage.arrangement))
      break
    case 'foliage.size':
      genome.foliage.size += direction * randomBetween(mutationSeed, path, 0.1, 0.24)
      break
    case 'foliage.density':
      genome.foliage.density += direction * randomBetween(mutationSeed, path, 0.08, 0.2)
      break
    case 'bloom.form':
      genome.bloom.form = randomItem(mutationSeed, path, BLOOM_FORMS.filter((value) => value !== genome.bloom.form))
      break
    case 'bloom.density':
      genome.bloom.density += direction * randomBetween(mutationSeed, path, 0.08, 0.2)
      break
    case 'bloom.scale':
      genome.bloom.scale += direction * randomBetween(mutationSeed, path, 0.1, 0.22)
      break
    case 'palette':
      genome.palette = randomItem(mutationSeed, path, PALETTES.filter((value) => value !== genome.palette))
      break
  }
}

export function mutateGenome(source: PlantGenomeV1, mutationSeed = makeSeed()): PlantGenomeV1 {
  const next = structuredClone(source)
  next.seed = `${source.seed.split('-').slice(0, 2).join('-')}-m${mutationSeed.slice(-4)}`.slice(0, 40)
  const count = 1 + Math.floor(randomFor(mutationSeed, 'mutation/count') * 3)
  const selected = new Set<MutableGene>()
  let cursor = 0

  while (selected.size < count) {
    selected.add(randomItem(mutationSeed, `mutation/select/${cursor}`, MUTABLE_GENES))
    cursor += 1
  }

  Array.from(selected).forEach((gene, index) => mutateGene(next, gene, mutationSeed, index))
  return normalizeGenome(next)
}
