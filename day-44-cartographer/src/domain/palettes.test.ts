import { describe, expect, it } from 'vitest'
import { biomeColor, DEFAULT_PALETTE, getPalette, PALETTES } from './palettes'
import { BIOMES } from './world'

describe('palettes', () => {
  it('every palette covers all biome bands with hex colors', () => {
    for (const p of PALETTES) {
      expect(p.biomes).toHaveLength(BIOMES.length)
      for (const c of p.biomes) expect(c).toMatch(/^#[0-9a-fA-F]{3,6}$/)
      expect(p.ink).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    }
  })

  it('has unique palette ids', () => {
    const ids = PALETTES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to the default for an unknown id', () => {
    expect(getPalette('nope')).toBe(DEFAULT_PALETTE)
    expect(getPalette('atlas').id).toBe('atlas')
  })

  it('biomeColor clamps to a valid band', () => {
    expect(biomeColor(DEFAULT_PALETTE, 0)).toBe(DEFAULT_PALETTE.biomes[0])
    expect(biomeColor(DEFAULT_PALETTE, 99)).toBe(DEFAULT_PALETTE.biomes[0])
  })
})
