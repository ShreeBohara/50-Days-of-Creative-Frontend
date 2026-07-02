import { describe, expect, it } from 'vitest'
import { defaultGenome, randomGenome } from '../domain/genome'
import { createRng } from '../domain/random'
import { buildShareHash, buildShareUrl, parseShareHash } from './share'

describe('share', () => {
  it('hash round-trips a genome (floats quantized to link precision)', () => {
    const g = randomGenome(createRng('linked'))
    const back = parseShareHash(buildShareHash(g))
    expect(back).not.toBeNull()
    expect(back!.density).toBeCloseTo(g.density, 3)
    expect(back!.jitter).toBeCloseTo(g.jitter, 3)
    expect(back!.leadWidth).toBeCloseTo(g.leadWidth, 2)
    expect({ ...back!, density: g.density, jitter: g.jitter, leadWidth: g.leadWidth }).toEqual(g)
    // a re-serialized link is stable — quantization only happens once
    expect(buildShareHash(back!)).toBe(buildShareHash(g))
  })

  it('ignores unrelated hashes', () => {
    expect(parseShareHash('#section-2')).toBeNull()
    expect(parseShareHash('')).toBeNull()
    expect(parseShareHash('#w=garbage')).toBeNull()
  })

  it('builds a full URL against a location', () => {
    const url = buildShareUrl(defaultGenome(), {
      origin: 'https://example.com',
      pathname: '/50-Days-of-Creative-Frontend/day-45-vitrail/',
    })
    expect(url.startsWith('https://example.com/50-Days-of-Creative-Frontend/day-45-vitrail/#w=1|')).toBe(true)
    expect(parseShareHash(new URL(url).hash)).toEqual(defaultGenome())
  })
})
