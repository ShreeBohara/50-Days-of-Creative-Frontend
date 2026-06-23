import { describe, expect, it } from 'vitest'
import { DEFAULT_PALETTE, getPalette, PALETTES } from './palettes'

describe('palettes', () => {
  it('resolves a known palette by id', () => {
    expect(getPalette('ember').id).toBe('ember')
  })

  it('falls back to the default for unknown ids', () => {
    expect(getPalette('does-not-exist')).toBe(DEFAULT_PALETTE)
  })

  it('every palette has from, to and glow colors', () => {
    for (const p of PALETTES) {
      expect(p.from).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.to).toMatch(/^#[0-9a-f]{6}$/i)
      expect(p.glow).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
