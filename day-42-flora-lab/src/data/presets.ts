import { normalizeGenome, type PlantGenomeV1 } from '../domain/genome'

export interface FloraPreset {
  id: string
  name: string
  note: string
  genome: PlantGenomeV1
}

export const FLORA_PRESETS: FloraPreset[] = [
  {
    id: 'meadow-fork',
    name: 'Meadow fork',
    note: 'Balanced branching with quiet red blooms.',
    genome: normalizeGenome({ seed: 'meadow-fork', architecture: { branchDepth: 4, spread: 34, curvature: 0.18, taper: 0.72, symmetry: 'bilateral' }, foliage: { shape: 'oval', arrangement: 'alternate', size: 0.92, density: 0.7 }, bloom: { form: 'daisy', density: 0.32, scale: 0.9 }, palette: 'herbarium' }),
  },
  {
    id: 'alpine-star',
    name: 'Alpine star',
    note: 'Tight radial stems and blue star flowers.',
    genome: normalizeGenome({ seed: 'alpine-star', architecture: { branchDepth: 4, spread: 28, curvature: -0.12, taper: 0.7, symmetry: 'radial' }, foliage: { shape: 'lance', arrangement: 'opposite', size: 0.68, density: 0.78 }, bloom: { form: 'star', density: 0.58, scale: 0.75 }, palette: 'alpine' }),
  },
  {
    id: 'ochre-bell',
    name: 'Ochre bell',
    note: 'Sparse desert leaves with pendulous bells.',
    genome: normalizeGenome({ seed: 'ochre-bell', architecture: { branchDepth: 3, spread: 42, curvature: 0.3, taper: 0.74, symmetry: 'bilateral' }, foliage: { shape: 'lance', arrangement: 'alternate', size: 0.78, density: 0.44 }, bloom: { form: 'bell', density: 0.66, scale: 1.18 }, palette: 'desert' }),
  },
  {
    id: 'tropic-fan',
    name: 'Tropic fan',
    note: 'Broad fan leaves and saturated daisy blooms.',
    genome: normalizeGenome({ seed: 'tropic-fan', architecture: { branchDepth: 4, spread: 48, curvature: -0.2, taper: 0.66, symmetry: 'radial' }, foliage: { shape: 'fan', arrangement: 'golden', size: 1.16, density: 0.84 }, bloom: { form: 'daisy', density: 0.42, scale: 1.22 }, palette: 'tropic' }),
  },
  {
    id: 'spiral-fern',
    name: 'Spiral fern',
    note: 'Bloomless golden phyllotaxis study.',
    genome: normalizeGenome({ seed: 'spiral-fern', architecture: { branchDepth: 5, spread: 31, curvature: 0.22, taper: 0.69, symmetry: 'spiral' }, foliage: { shape: 'lance', arrangement: 'golden', size: 0.62, density: 0.94 }, bloom: { form: 'none', density: 0, scale: 0.8 }, palette: 'herbarium' }),
  },
  {
    id: 'crimson-orbit',
    name: 'Crimson orbit',
    note: 'Open radial canopy with oversized flowers.',
    genome: normalizeGenome({ seed: 'crimson-orbit', architecture: { branchDepth: 3, spread: 54, curvature: -0.3, taper: 0.78, symmetry: 'radial' }, foliage: { shape: 'oval', arrangement: 'opposite', size: 1.08, density: 0.58 }, bloom: { form: 'star', density: 0.7, scale: 1.4 }, palette: 'tropic' }),
  },
]
