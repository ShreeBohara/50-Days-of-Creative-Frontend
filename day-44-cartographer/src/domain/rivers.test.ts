import { describe, expect, it } from 'vitest'
import { traceRivers } from './rivers'
import { generateHeightfield, SCHEMA_VERSION, type WorldParams } from './world'

function makeParams(over: Partial<WorldParams> = {}): WorldParams {
  return {
    version: SCHEMA_VERSION,
    seed: 'cascadia',
    seaLevel: 0.44,
    relief: 0.2,
    octaves: 5,
    persistence: 0.5,
    mountainBias: 1.5,
    islandBias: 0.5,
    rivers: 4,
    biomePaletteId: 'atlas',
    languageId: 'albion',
    labelDensity: 0.5,
    ...over,
  }
}

describe('traceRivers', () => {
  it('returns no rivers when the count is zero', () => {
    const f = generateHeightfield(makeParams({ rivers: 0 }))
    expect(traceRivers(f, makeParams({ rivers: 0 }))).toHaveLength(0)
  })

  it('is deterministic for identical params', () => {
    const p = makeParams()
    const f = generateHeightfield(p)
    expect(JSON.stringify(traceRivers(f, p))).toBe(JSON.stringify(traceRivers(f, p)))
  })

  it('never exceeds the requested count and each river has length', () => {
    const p = makeParams({ rivers: 5 })
    const f = generateHeightfield(p)
    const rivers = traceRivers(f, p)
    expect(rivers.length).toBeLessThanOrEqual(5)
    for (const r of rivers) expect(r.length).toBeGreaterThanOrEqual(6)
  })

  it('rivers descend — they end no higher than they begin', () => {
    const p = makeParams()
    const f = generateHeightfield(p)
    for (const r of traceRivers(f, p)) {
      const head = f.data[r[0].y * f.size + r[0].x]
      const tail = f.data[r[r.length - 1].y * f.size + r[r.length - 1].x]
      expect(tail).toBeLessThanOrEqual(head)
    }
  })
})
