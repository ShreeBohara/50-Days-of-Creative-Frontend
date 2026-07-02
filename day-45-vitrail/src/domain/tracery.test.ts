import { describe, expect, it } from 'vitest'
import { clampGenome, defaultGenome, type WindowGenome } from './genome'
import { buildTracery } from './tracery'

function genome(overrides: Partial<WindowGenome> = {}): WindowGenome {
  return clampGenome({ ...defaultGenome(), ...overrides })
}

describe('tracery', () => {
  it('is deterministic for equal genomes', () => {
    const a = buildTracery(genome())
    const b = buildTracery(genome())
    expect(a).toEqual(b)
  })

  it.each(['rose', 'lancet', 'triptych'] as const)('%s archetype produces closed, unique panes', (archetype) => {
    const result = buildTracery(genome({ archetype }))
    expect(result.panes.length).toBeGreaterThan(10)
    const ids = new Set(result.panes.map((p) => p.id))
    expect(ids.size).toBe(result.panes.length)
    for (const pane of result.panes) {
      expect(pane.path.startsWith('M ')).toBe(true)
      expect(pane.path.endsWith('Z')).toBe(true)
      expect(pane.ring).toBeGreaterThanOrEqual(0)
      expect(pane.ring).toBeLessThan(result.ringCount)
      expect(pane.areaHint).toBeGreaterThan(0)
    }
  })

  it.each(['rose', 'lancet', 'triptych'] as const)('%s centroids stay inside the viewbox', (archetype) => {
    const result = buildTracery(genome({ archetype }))
    for (const pane of result.panes) {
      expect(pane.centroid.x).toBeGreaterThanOrEqual(0)
      expect(pane.centroid.x).toBeLessThanOrEqual(result.frame.width)
      expect(pane.centroid.y).toBeGreaterThanOrEqual(0)
      expect(pane.centroid.y).toBeLessThanOrEqual(result.frame.height)
    }
  })

  it('higher symmetry yields more rose panes', () => {
    const small = buildTracery(genome({ archetype: 'rose', symmetry: 6 }))
    const large = buildTracery(genome({ archetype: 'rose', symmetry: 16 }))
    expect(large.panes.length).toBeGreaterThan(small.panes.length)
  })

  it('higher density yields more panes', () => {
    const sparse = buildTracery(genome({ density: 0 }))
    const dense = buildTracery(genome({ density: 1 }))
    expect(dense.panes.length).toBeGreaterThan(sparse.panes.length)
  })

  it('more rings add more rose bands', () => {
    const few = buildTracery(genome({ rings: 2 }))
    const many = buildTracery(genome({ rings: 6 }))
    expect(many.ringCount).toBeGreaterThan(few.ringCount)
  })

  it('oculus medallion drops the foil overlay', () => {
    const withFoil = buildTracery(genome({ medallion: 'blossom' }))
    const plain = buildTracery(genome({ medallion: 'oculus' }))
    expect(withFoil.panes.some((p) => p.id === 'medallion-foil')).toBe(true)
    expect(plain.panes.some((p) => p.id === 'medallion-foil')).toBe(false)
  })

  it('triptych builds three lights', () => {
    const result = buildTracery(genome({ archetype: 'triptych' }))
    for (const prefix of ['a-', 'b-', 'c-']) {
      expect(result.panes.some((p) => p.id.startsWith(prefix))).toBe(true)
    }
    expect(result.leadPaths).toHaveLength(3)
  })
})
