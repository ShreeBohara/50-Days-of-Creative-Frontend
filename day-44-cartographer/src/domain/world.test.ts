import { describe, expect, it } from 'vitest'
import {
  classifyCell,
  classifyField,
  fieldStats,
  generateHeightfield,
  landFraction,
  SCHEMA_VERSION,
  type WorldParams,
} from './world'

function makeParams(over: Partial<WorldParams> = {}): WorldParams {
  return {
    version: SCHEMA_VERSION,
    seed: 'avalon',
    seaLevel: 0.45,
    relief: 0.25,
    octaves: 5,
    persistence: 0.5,
    mountainBias: 1.3,
    islandBias: 0.6,
    rivers: 3,
    biomePaletteId: 'atlas',
    languageId: 'norse',
    labelDensity: 0.5,
    ...over,
  }
}

describe('generateHeightfield', () => {
  it('is deterministic for identical params', () => {
    const a = generateHeightfield(makeParams())
    const b = generateHeightfield(makeParams())
    expect(a.size).toBe(b.size)
    expect(Array.from(a.data)).toEqual(Array.from(b.data))
    expect(Array.from(a.moisture)).toEqual(Array.from(b.moisture))
  })

  it('keeps elevation and moisture within [0, 1]', () => {
    const f = generateHeightfield(makeParams())
    for (let i = 0; i < f.data.length; i++) {
      expect(f.data[i]).toBeGreaterThanOrEqual(0)
      expect(f.data[i]).toBeLessThanOrEqual(1)
      expect(f.moisture[i]).toBeGreaterThanOrEqual(0)
      expect(f.moisture[i]).toBeLessThanOrEqual(1)
    }
  })

  it('differs across seeds', () => {
    const a = generateHeightfield(makeParams({ seed: 'one' }))
    const b = generateHeightfield(makeParams({ seed: 'two' }))
    expect(Array.from(a.data)).not.toEqual(Array.from(b.data))
  })

  it('raising sea level never increases land', () => {
    const f = generateHeightfield(makeParams())
    let prev = 1
    for (const sl of [0.3, 0.4, 0.5, 0.6]) {
      const frac = landFraction(f, sl)
      expect(frac).toBeLessThanOrEqual(prev + 1e-9)
      prev = frac
    }
  })

  it('a strong island bias yields no more land than a weak one', () => {
    const weak = generateHeightfield(makeParams({ islandBias: 0 }))
    const strong = generateHeightfield(makeParams({ islandBias: 1 }))
    expect(landFraction(strong, 0.45)).toBeLessThanOrEqual(landFraction(weak, 0.45))
  })
})

describe('classifyCell', () => {
  it('maps below sea level to water and above to land', () => {
    expect(classifyCell(0.1, 0.5, 0.45)).toBeLessThanOrEqual(1) // water
    expect(classifyCell(0.9, 0.5, 0.45)).toBeGreaterThanOrEqual(2) // land
  })

  it('orders deep ocean below shallow ocean', () => {
    expect(classifyCell(0.05, 0.5, 0.45)).toBe(0)
    expect(classifyCell(0.43, 0.5, 0.45)).toBe(1)
  })

  it('classifies the highest land as a peak', () => {
    expect(classifyCell(1, 0.5, 0.45)).toBe(8)
  })
})

describe('classifyField + fieldStats', () => {
  it('classifies every cell and reports a consistent peak', () => {
    const f = generateHeightfield(makeParams())
    const grid = classifyField(f, makeParams().seaLevel)
    expect(grid.length).toBe(f.size * f.size)

    const stats = fieldStats(f, 0.45)
    expect(stats.peak.gx).toBeGreaterThanOrEqual(0)
    expect(stats.peak.gx).toBeLessThan(f.size)
    expect(stats.peak.gy).toBeGreaterThanOrEqual(0)
    expect(stats.peak.gy).toBeLessThan(f.size)
    expect(f.data[stats.peak.gy * f.size + stats.peak.gx]).toBeCloseTo(stats.maxElevation, 6)
  })
})
