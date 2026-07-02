import { describe, expect, it } from 'vitest'
import { PALETTE_IDS } from './genome'
import { PALETTES, getPalette, hslString, jitterHue } from './palettes'

describe('palettes', () => {
  it('defines a palette for every genome palette id', () => {
    for (const id of PALETTE_IDS) {
      const palette = PALETTES[id]
      expect(palette).toBeDefined()
      expect(palette.id).toBe(id)
      expect(palette.glasses.length).toBeGreaterThanOrEqual(3)
      expect(palette.name.length).toBeGreaterThan(0)
    }
  })

  it('falls back to chartres for unknown ids', () => {
    expect(getPalette('vantablack').id).toBe('chartres')
  })

  it('renders hues as hsl strings', () => {
    expect(hslString({ h: 221.4, s: 68, l: 40 })).toBe('hsl(221 68% 40%)')
  })

  it('jitter at zero amount is the identity', () => {
    const hue = { h: 100, s: 50, l: 50 }
    expect(jitterHue(hue, 0, 0.9, 0.1, 0.7)).toEqual(hue)
  })

  it('jitter keeps saturation and lightness in displayable range', () => {
    const extreme = jitterHue({ h: 0, s: 95, l: 87 }, 1, 1, 1, 1)
    expect(extreme.s).toBeLessThanOrEqual(96)
    expect(extreme.l).toBeLessThanOrEqual(88)
    const dark = jitterHue({ h: 0, s: 10, l: 12 }, 1, 0, 0, 0)
    expect(dark.s).toBeGreaterThanOrEqual(8)
    expect(dark.l).toBeGreaterThanOrEqual(10)
  })
})
