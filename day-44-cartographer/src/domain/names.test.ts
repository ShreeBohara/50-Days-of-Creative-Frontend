import { describe, expect, it } from 'vitest'
import { getLanguage, LANGUAGES } from '../data/languages'
import { makeName, makeRoot, placeLabels, worldName, type LabelKind } from './names'
import { createRng } from './random'
import { generateHeightfield, SCHEMA_VERSION, type WorldParams } from './world'

function makeParams(over: Partial<WorldParams> = {}): WorldParams {
  return {
    version: SCHEMA_VERSION,
    seed: 'eldermark',
    seaLevel: 0.44,
    relief: 0.22,
    octaves: 5,
    persistence: 0.5,
    mountainBias: 1.4,
    islandBias: 0.5,
    rivers: 3,
    biomePaletteId: 'atlas',
    languageId: 'norse',
    labelDensity: 0.7,
    ...over,
  }
}

describe('name grammar', () => {
  it('builds non-empty roots from a language', () => {
    const rng = createRng('roots')
    const lang = getLanguage('norse')
    for (let i = 0; i < 20; i++) expect(makeRoot(rng, lang).length).toBeGreaterThan(2)
  })

  it('positions the root via the feature template (no stray placeholder)', () => {
    const kinds: LabelKind[] = ['peak', 'cape', 'bay', 'isle', 'town']
    for (const lang of LANGUAGES) {
      const rng = createRng(`${lang.id}-names`)
      for (const kind of kinds) {
        const name = makeName(rng, lang, kind)
        expect(name).not.toContain('{}')
        expect(name.trim().length).toBeGreaterThan(2)
      }
    }
  })

  it('is deterministic for the same seed', () => {
    const lang = getLanguage('latin')
    const a = createRng('x')
    const b = createRng('x')
    expect(makeName(a, lang, 'bay')).toBe(makeName(b, lang, 'bay'))
  })
})

describe('worldName', () => {
  it('is deterministic and templated', () => {
    expect(worldName(makeParams())).toBe(worldName(makeParams()))
    expect(worldName(makeParams())).not.toContain('{}')
  })

  it('changes with the seed', () => {
    expect(worldName(makeParams({ seed: 'one' }))).not.toBe(worldName(makeParams({ seed: 'two' })))
  })
})

describe('placeLabels', () => {
  it('produces spaced, named, in-bounds labels', () => {
    const p = makeParams()
    const f = generateHeightfield(p)
    const labels = placeLabels(f, p)
    expect(labels.length).toBeGreaterThan(0)
    for (const l of labels) {
      expect(l.name.length).toBeGreaterThan(0)
      expect(l.gx).toBeGreaterThanOrEqual(0)
      expect(l.gx).toBeLessThan(f.size)
      expect(l.gy).toBeGreaterThanOrEqual(0)
      expect(l.gy).toBeLessThan(f.size)
    }
    // spacing: no two labels closer than the min distance
    const minDist2 = (f.size * 0.07) ** 2
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const dx = labels[i].gx - labels[j].gx
        const dy = labels[i].gy - labels[j].gy
        expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(minDist2)
      }
    }
  })

  it('scales count with label density', () => {
    const f = generateHeightfield(makeParams())
    const few = placeLabels(f, makeParams({ labelDensity: 0.1 }))
    const many = placeLabels(f, makeParams({ labelDensity: 1 }))
    expect(many.length).toBeGreaterThanOrEqual(few.length)
  })

  it('is deterministic', () => {
    const p = makeParams()
    const f = generateHeightfield(p)
    expect(JSON.stringify(placeLabels(f, p))).toBe(JSON.stringify(placeLabels(f, p)))
  })
})
