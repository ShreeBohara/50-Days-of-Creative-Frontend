import { describe, expect, it } from 'vitest'
import { DEFAULT_GENOME, normalizeGenome } from './genome'
import { generatePlantScene } from './growth'

describe('plant growth engine', () => {
  it('generates identical geometry for identical DNA', () => {
    expect(generatePlantScene(DEFAULT_GENOME)).toEqual(generatePlantScene(DEFAULT_GENOME))
  })

  it('keeps branch geometry stable when only foliage changes', () => {
    const sparse = normalizeGenome({
      ...DEFAULT_GENOME,
      foliage: { ...DEFAULT_GENOME.foliage, density: 0.2 },
    })
    const lush = normalizeGenome({
      ...DEFAULT_GENOME,
      foliage: { ...DEFAULT_GENOME.foliage, density: 1 },
    })

    expect(generatePlantScene(sparse).branches).toEqual(generatePlantScene(lush).branches)
    expect(generatePlantScene(lush).leaves.length).toBeGreaterThan(generatePlantScene(sparse).leaves.length)
  })

  it('honors architecture depth without exceeding the safety cap', () => {
    const shallow = normalizeGenome({
      ...DEFAULT_GENOME,
      architecture: { ...DEFAULT_GENOME.architecture, branchDepth: 2 },
    })
    const deep = normalizeGenome({
      ...DEFAULT_GENOME,
      architecture: { ...DEFAULT_GENOME.architecture, branchDepth: 5, symmetry: 'radial' },
    })

    expect(generatePlantScene(shallow).branches.length).toBeLessThan(generatePlantScene(deep).branches.length)
    expect(generatePlantScene(deep).branches.length).toBeLessThanOrEqual(220)
  })

  it('omits blooms when their form is none', () => {
    const bloomless = normalizeGenome({
      ...DEFAULT_GENOME,
      bloom: { ...DEFAULT_GENOME.bloom, form: 'none', density: 1 },
    })
    expect(generatePlantScene(bloomless).blooms).toHaveLength(0)
  })
})
