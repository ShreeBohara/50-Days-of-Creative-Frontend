import { describe, expect, it } from 'vitest'
import { clampGenome, defaultGenome, randomGenome } from './genome'
import { createRng } from './random'
import { deserializeGenome, serializeGenome } from './serialize'

describe('serialize', () => {
  it('round-trips the default genome exactly', () => {
    const g = defaultGenome()
    expect(deserializeGenome(serializeGenome(g))).toEqual(g)
  })

  it('round-trips many random genomes', () => {
    for (let i = 0; i < 25; i++) {
      const g = randomGenome(createRng(`share-${i}`))
      const back = deserializeGenome(serializeGenome(g))
      expect(back).not.toBeNull()
      expect(back!.seed).toBe(g.seed)
      expect(back!.archetype).toBe(g.archetype)
      expect(back!.paletteId).toBe(g.paletteId)
      expect(back!.density).toBeCloseTo(g.density, 3)
      expect(back!.leadWidth).toBeCloseTo(g.leadWidth, 2)
    }
  })

  it('survives seeds with URL-hostile characters', () => {
    const g = clampGenome({ ...defaultGenome(), seed: 'rose 12 | #gold & light?' })
    const back = deserializeGenome(serializeGenome(g))
    expect(back?.seed).toBe('rose 12 | #gold & light?')
  })

  it('rejects malformed or foreign strings', () => {
    expect(deserializeGenome('')).toBeNull()
    expect(deserializeGenome('2|too|new')).toBeNull()
    expect(deserializeGenome('nonsense')).toBeNull()
    expect(deserializeGenome('1|only|three')).toBeNull()
  })

  it('clamps tampered values instead of failing', () => {
    const tampered = serializeGenome(defaultGenome()).replace('|4|', '|400|')
    const back = deserializeGenome(tampered)
    expect(back).not.toBeNull()
    expect(back!.rings).toBeLessThanOrEqual(6)
  })
})
