import { describe, expect, it } from 'vitest'
import { DEFAULT_GENOME } from './genome'
import { mutateGenome, randomGenome } from './genetics'

function changedTraits(before: typeof DEFAULT_GENOME, after: typeof DEFAULT_GENOME) {
  const beforeValues = [
    before.architecture.branchDepth, before.architecture.spread, before.architecture.curvature,
    before.architecture.taper, before.architecture.symmetry, before.foliage.shape,
    before.foliage.arrangement, before.foliage.size, before.foliage.density,
    before.bloom.form, before.bloom.density, before.bloom.scale, before.palette,
  ]
  const afterValues = [
    after.architecture.branchDepth, after.architecture.spread, after.architecture.curvature,
    after.architecture.taper, after.architecture.symmetry, after.foliage.shape,
    after.foliage.arrangement, after.foliage.size, after.foliage.density,
    after.bloom.form, after.bloom.density, after.bloom.scale, after.palette,
  ]
  return beforeValues.filter((value, index) => value !== afterValues[index]).length
}

describe('genetic operations', () => {
  it('creates reproducible random specimens', () => {
    expect(randomGenome('fixed-seed')).toEqual(randomGenome('fixed-seed'))
    expect(randomGenome('fixed-seed')).not.toEqual(randomGenome('other-seed'))
  })

  it('mutates one to three traits deterministically', () => {
    const first = mutateGenome(DEFAULT_GENOME, 'mutation-seed-1')
    const second = mutateGenome(DEFAULT_GENOME, 'mutation-seed-1')
    const changes = changedTraits(DEFAULT_GENOME, first)

    expect(first).toEqual(second)
    expect(changes).toBeGreaterThanOrEqual(1)
    expect(changes).toBeLessThanOrEqual(3)
  })

  it('keeps mutation results inside normalized bounds', () => {
    const mutated = Array.from({ length: 40 }, (_, index) =>
      mutateGenome(DEFAULT_GENOME, `stress-${index}`),
    )
    expect(mutated.every((genome) => genome.architecture.branchDepth >= 2 && genome.architecture.branchDepth <= 5)).toBe(true)
    expect(mutated.every((genome) => genome.foliage.density >= 0.18 && genome.foliage.density <= 1)).toBe(true)
    expect(mutated.every((genome) => genome.bloom.density >= 0 && genome.bloom.density <= 0.72)).toBe(true)
  })
})
