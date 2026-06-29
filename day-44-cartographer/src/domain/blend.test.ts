import { describe, expect, it } from 'vitest'
import { blendWorlds } from './blend'
import { SCHEMA_VERSION, type WorldParams } from './world'

const A: WorldParams = {
  version: SCHEMA_VERSION,
  seed: 'alpha',
  seaLevel: 0.4,
  relief: 0.2,
  octaves: 4,
  persistence: 0.45,
  mountainBias: 1.2,
  islandBias: 0.3,
  rivers: 2,
  biomePaletteId: 'atlas',
  languageId: 'norse',
  labelDensity: 0.5,
}

const B: WorldParams = {
  version: SCHEMA_VERSION,
  seed: 'beta',
  seaLevel: 0.5,
  relief: 0.4,
  octaves: 6,
  persistence: 0.65,
  mountainBias: 2.0,
  islandBias: 0.7,
  rivers: 6,
  biomePaletteId: 'volcanic',
  languageId: 'latin',
  labelDensity: 0.9,
}

describe('blendWorlds', () => {
  it('inherits parent A genes at t=0 (except the fresh seed)', () => {
    const child = blendWorlds(A, B, 0)
    expect(child.seaLevel).toBe(A.seaLevel)
    expect(child.octaves).toBe(A.octaves)
    expect(child.biomePaletteId).toBe(A.biomePaletteId)
    expect(child.languageId).toBe(A.languageId)
    expect(child.seed).not.toBe(A.seed)
  })

  it('inherits parent B genes at t=1', () => {
    const child = blendWorlds(A, B, 1)
    expect(child.seaLevel).toBe(B.seaLevel)
    expect(child.octaves).toBe(B.octaves)
    expect(child.biomePaletteId).toBe(B.biomePaletteId)
    expect(child.languageId).toBe(B.languageId)
  })

  it('interpolates numeric genes at the midpoint', () => {
    const child = blendWorlds(A, B, 0.5)
    expect(child.seaLevel).toBeCloseTo(0.45, 5)
    expect(child.relief).toBeCloseTo(0.3, 5)
    expect(child.octaves).toBe(5)
    expect(child.rivers).toBe(4)
  })

  it('is deterministic', () => {
    expect(blendWorlds(A, B, 0.5)).toEqual(blendWorlds(A, B, 0.5))
    expect(blendWorlds(A, B, 0.37)).toEqual(blendWorlds(A, B, 0.37))
  })

  it('keeps categorical genes valid (one parent or the other)', () => {
    for (const t of [0.2, 0.5, 0.8]) {
      const child = blendWorlds(A, B, t)
      expect([A.biomePaletteId, B.biomePaletteId]).toContain(child.biomePaletteId)
      expect([A.languageId, B.languageId]).toContain(child.languageId)
    }
  })

  it('encodes both parents and the mix in the child seed', () => {
    expect(blendWorlds(A, B, 0.5).seed).toBe('alphaxbeta@0.50')
  })
})
