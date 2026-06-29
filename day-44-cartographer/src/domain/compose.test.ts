import { describe, expect, it } from 'vitest'
import { composeWorld, contourThresholds } from './compose'
import { createDefaultParams } from './defaults'
import { type WorldParams } from './world'

describe('contourThresholds', () => {
  it('returns four ascending isovalues above sea level', () => {
    const p: WorldParams = { ...createDefaultParams(), seaLevel: 0.4 }
    const t = contourThresholds(p)
    expect(t).toHaveLength(4)
    for (let i = 0; i < t.length; i++) {
      expect(t[i]).toBeGreaterThan(p.seaLevel)
      if (i > 0) expect(t[i]).toBeGreaterThan(t[i - 1])
    }
  })
})

describe('composeWorld', () => {
  it('assembles a complete, in-bounds chart', () => {
    const p = createDefaultParams()
    const map = composeWorld(p)
    expect(map.title).not.toContain('{}')
    expect(map.biome.length).toBe(map.size * map.size)
    expect(map.coastline.length).toBeGreaterThan(0)
    expect(map.contours).toHaveLength(4)
    expect(map.labels.length).toBeGreaterThan(0)
    expect(map.stats.landFraction).toBeGreaterThan(0)
    expect(map.stats.landFraction).toBeLessThan(1)
  })

  it('is deterministic in its structural output', () => {
    const p = createDefaultParams()
    const a = composeWorld(p)
    const b = composeWorld(p)
    expect(a.title).toBe(b.title)
    expect(JSON.stringify(a.coastline)).toBe(JSON.stringify(b.coastline))
    expect(JSON.stringify(a.rivers)).toBe(JSON.stringify(b.rivers))
    expect(JSON.stringify(a.labels)).toBe(JSON.stringify(b.labels))
  })

  it('changes with the seed', () => {
    const a = composeWorld({ ...createDefaultParams(), seed: 'alpha' })
    const b = composeWorld({ ...createDefaultParams(), seed: 'beta' })
    expect(a.title === b.title && JSON.stringify(a.coastline) === JSON.stringify(b.coastline)).toBe(
      false,
    )
  })
})
