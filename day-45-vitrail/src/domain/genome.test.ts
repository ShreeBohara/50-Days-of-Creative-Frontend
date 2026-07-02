import { describe, expect, it } from 'vitest'
import {
  ARCHETYPES,
  GENOME_BOUNDS,
  MEDALLIONS,
  PALETTE_IDS,
  SYMMETRY_OPTIONS,
  TRACERY_STYLES,
  clampGenome,
  defaultGenome,
  mutateGenome,
  randomGenome,
} from './genome'
import { createRng } from './random'

function expectValid(g: ReturnType<typeof defaultGenome>) {
  expect(ARCHETYPES).toContain(g.archetype)
  expect(TRACERY_STYLES).toContain(g.traceryStyle)
  expect(MEDALLIONS).toContain(g.medallion)
  expect(PALETTE_IDS).toContain(g.paletteId)
  expect(SYMMETRY_OPTIONS).toContain(g.symmetry as (typeof SYMMETRY_OPTIONS)[number])
  expect(g.rings).toBeGreaterThanOrEqual(GENOME_BOUNDS.rings.min)
  expect(g.rings).toBeLessThanOrEqual(GENOME_BOUNDS.rings.max)
  expect(g.density).toBeGreaterThanOrEqual(0)
  expect(g.density).toBeLessThanOrEqual(1)
  expect(g.leadWidth).toBeGreaterThanOrEqual(GENOME_BOUNDS.leadWidth.min)
  expect(g.leadWidth).toBeLessThanOrEqual(GENOME_BOUNDS.leadWidth.max)
  expect(g.jitter).toBeGreaterThanOrEqual(0)
  expect(g.jitter).toBeLessThanOrEqual(1)
  expect(g.seed.length).toBeGreaterThan(0)
}

describe('genome', () => {
  it('default genome is valid', () => {
    expectValid(defaultGenome())
  })

  it('clamps wildly invalid genomes back into range', () => {
    const g = clampGenome({
      seed: '',
      archetype: 'cathedral' as never,
      symmetry: 97,
      rings: 40,
      density: -3,
      traceryStyle: 'baroque' as never,
      leadWidth: 99,
      paletteId: 'neon' as never,
      jitter: 12,
      medallion: 'skull' as never,
    })
    expectValid(g)
    expect(g.symmetry).toBe(16)
    expect(g.rings).toBe(GENOME_BOUNDS.rings.max)
    expect(g.density).toBe(0)
  })

  it('randomGenome is deterministic for the same rng seed', () => {
    const a = randomGenome(createRng('vitrail'))
    const b = randomGenome(createRng('vitrail'))
    expect(a).toEqual(b)
    expectValid(a)
  })

  it('different seeds give different windows', () => {
    const a = randomGenome(createRng('one'))
    const b = randomGenome(createRng('two'))
    expect(a).not.toEqual(b)
  })

  it('mutateGenome is deterministic and stays in bounds', () => {
    const parent = defaultGenome()
    const a = mutateGenome(parent, 0.8, 'candle')
    const b = mutateGenome(parent, 0.8, 'candle')
    expect(a).toEqual(b)
    expectValid(a)
    expect(a.seed).not.toBe(parent.seed)
  })

  it('mutation at zero strength keeps every non-seed gene', () => {
    const parent = defaultGenome()
    const child = mutateGenome(parent, 0, 'still')
    expect({ ...child, seed: parent.seed }).toEqual(parent)
  })
})
