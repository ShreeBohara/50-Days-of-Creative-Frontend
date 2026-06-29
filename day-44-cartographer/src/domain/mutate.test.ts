import { describe, expect, it } from 'vitest'
import { createDefaultParams } from './defaults'
import { mutate, randomWorld } from './mutate'
import { PALETTES } from './palettes'
import { LANGUAGES } from '../data/languages'
import { PARAM_RANGES } from './world'

function inRange(v: number, k: keyof typeof PARAM_RANGES) {
  expect(v).toBeGreaterThanOrEqual(PARAM_RANGES[k].min)
  expect(v).toBeLessThanOrEqual(PARAM_RANGES[k].max)
}

describe('randomWorld', () => {
  it('is deterministic for a seed', () => {
    expect(randomWorld('atlantis')).toEqual(randomWorld('atlantis'))
  })

  it('keeps every gene within its range and uses valid categories', () => {
    const w = randomWorld('archipelago')
    inRange(w.seaLevel, 'seaLevel')
    inRange(w.relief, 'relief')
    inRange(w.octaves, 'octaves')
    inRange(w.persistence, 'persistence')
    inRange(w.mountainBias, 'mountainBias')
    inRange(w.islandBias, 'islandBias')
    inRange(w.rivers, 'rivers')
    inRange(w.labelDensity, 'labelDensity')
    expect(PALETTES.some((p) => p.id === w.biomePaletteId)).toBe(true)
    expect(LANGUAGES.some((l) => l.id === w.languageId)).toBe(true)
    expect(Number.isInteger(w.octaves)).toBe(true)
    expect(Number.isInteger(w.rivers)).toBe(true)
  })

  it('differs across seeds', () => {
    expect(randomWorld('one')).not.toEqual(randomWorld('two'))
  })
})

describe('mutate', () => {
  it('is deterministic and keeps genes in range', () => {
    const base = createDefaultParams()
    const a = mutate(base, 'm1')
    const b = mutate(base, 'm1')
    expect(a).toEqual(b)
    inRange(a.seaLevel, 'seaLevel')
    inRange(a.islandBias, 'islandBias')
    inRange(a.rivers, 'rivers')
  })

  it('a zero amount leaves numeric genes unchanged', () => {
    const base = createDefaultParams()
    const m = mutate(base, base.seed, 0)
    expect(m.seaLevel).toBeCloseTo(base.seaLevel, 6)
    expect(m.relief).toBeCloseTo(base.relief, 6)
    expect(m.octaves).toBe(base.octaves)
  })
})
