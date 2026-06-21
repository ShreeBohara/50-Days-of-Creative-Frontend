import { describe, expect, it } from 'vitest'
import { DEFAULT_GENOME, decodeGenome, encodeGenome, genomeFromSearch, normalizeGenome } from './genome'
import { randomFor } from './random'

describe('path-keyed random', () => {
  it('returns the same value for the same seed and path', () => {
    expect(randomFor('fern-42', 'branch/0/leaf/2')).toBe(randomFor('fern-42', 'branch/0/leaf/2'))
  })

  it('changes when either the seed or path changes', () => {
    expect(randomFor('fern-42', 'branch/0')).not.toBe(randomFor('fern-43', 'branch/0'))
    expect(randomFor('fern-42', 'branch/0')).not.toBe(randomFor('fern-42', 'branch/1'))
  })
})

describe('genome contracts', () => {
  it('normalizes malformed and out-of-range traits', () => {
    const genome = normalizeGenome({
      seed: '  strange seed!  ',
      architecture: { branchDepth: 99, spread: -4, taper: Number.NaN, symmetry: 'square' },
      foliage: { density: 9 },
      bloom: { density: -3 },
      palette: 'unknown',
    })

    expect(genome.seed).toBe('strange-seed-')
    expect(genome.architecture.branchDepth).toBe(5)
    expect(genome.architecture.spread).toBe(14)
    expect(genome.architecture.taper).toBe(DEFAULT_GENOME.architecture.taper)
    expect(genome.architecture.symmetry).toBe('bilateral')
    expect(genome.foliage.density).toBe(1)
    expect(genome.bloom.density).toBe(0)
    expect(genome.palette).toBe('herbarium')
  })

  it('round trips through the URL-safe DNA format', () => {
    const encoded = encodeGenome(DEFAULT_GENOME)
    expect(encoded).not.toMatch(/[+/=]/)
    expect(decodeGenome(encoded)).toEqual(DEFAULT_GENOME)
  })

  it('rejects unsupported versions and safely restores shared DNA', () => {
    const unsupported = btoa(JSON.stringify({ ...DEFAULT_GENOME, version: 2 }))
    expect(() => decodeGenome(unsupported)).toThrow('unsupported DNA version')
    expect(genomeFromSearch(`?dna=${unsupported}`)).toEqual({
      genome: DEFAULT_GENOME,
      error: 'The shared DNA could not be read. A healthy base specimen was restored.',
    })
  })
})
