import { describe, it, expect } from 'vitest'
import { relativeLuminance, contrastRatio } from './contrast.js'

const GROUND = '#1f1712'

describe('relativeLuminance', () => {
  it('pins black and white', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 12)
  })

  it('accepts shorthand, missing # and any case', () => {
    expect(relativeLuminance('#fff')).toBe(relativeLuminance('#FFFFFF'))
    expect(relativeLuminance('d7a64a')).toBe(relativeLuminance('#D7A64A'))
  })

  it('weights green most, blue least', () => {
    const r = relativeLuminance('#ff0000')
    const g = relativeLuminance('#00ff00')
    const b = relativeLuminance('#0000ff')
    expect(g).toBeGreaterThan(r)
    expect(r).toBeGreaterThan(b)
    expect(r + g + b).toBeCloseTo(1, 12)
  })

  it('throws on non-hex input', () => {
    expect(() => relativeLuminance('red')).toThrow(TypeError)
    expect(() => relativeLuminance('#12345')).toThrow(TypeError)
  })
})

describe('contrastRatio', () => {
  it('is 21:1 for black on white, symmetric, and 1:1 for a colour on itself', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 9)
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 9)
    expect(contrastRatio(GROUND, GROUND)).toBe(1)
  })

  it('palette tokens clear WCAG on the lacquer ground', () => {
    expect(contrastRatio('#e9dfcf', GROUND)).toBeGreaterThanOrEqual(7)
    expect(contrastRatio('#9c8d7a', GROUND)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#d7a64a', GROUND)).toBeGreaterThanOrEqual(4.5)
  })
})
