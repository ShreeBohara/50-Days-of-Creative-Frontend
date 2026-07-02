import { describe, expect, it } from 'vitest'
import { blendGenomes } from './blend'
import { clampGenome, defaultGenome, randomGenome, type WindowGenome } from './genome'
import { createRng } from './random'

const parentA: WindowGenome = clampGenome({
  ...defaultGenome(),
  seed: 'north-rose',
  archetype: 'rose',
  symmetry: 12,
  rings: 2,
  density: 0.2,
  paletteId: 'chartres',
})

const parentB: WindowGenome = clampGenome({
  ...defaultGenome(),
  seed: 'south-lancet',
  archetype: 'lancet',
  symmetry: 6,
  rings: 6,
  density: 0.9,
  paletteId: 'ember',
})

describe('blend', () => {
  it('is deterministic for the same parents', () => {
    expect(blendGenomes(parentA, parentB)).toEqual(blendGenomes(parentA, parentB))
  })

  it('numeric genes land between the parents', () => {
    const child = blendGenomes(parentA, parentB)
    expect(child.rings).toBeGreaterThanOrEqual(2)
    expect(child.rings).toBeLessThanOrEqual(6)
    expect(child.density).toBeGreaterThanOrEqual(0.2)
    expect(child.density).toBeLessThanOrEqual(0.9)
  })

  it('categorical genes come whole from one parent', () => {
    const child = blendGenomes(parentA, parentB)
    expect(['rose', 'lancet']).toContain(child.archetype)
    expect([12, 6]).toContain(child.symmetry)
    expect(['chartres', 'ember']).toContain(child.paletteId)
  })

  it('gets a fresh seed so the child is its own window', () => {
    const child = blendGenomes(parentA, parentB)
    expect(child.seed).not.toBe(parentA.seed)
    expect(child.seed).not.toBe(parentB.seed)
  })

  it('blending a window with itself keeps its genes', () => {
    const child = blendGenomes(parentA, parentA)
    expect({ ...child, seed: parentA.seed, density: parentA.density, leadWidth: parentA.leadWidth, jitter: parentA.jitter }).toEqual(parentA)
  })

  it('always produces a valid genome from arbitrary parents', () => {
    for (let i = 0; i < 20; i++) {
      const a = randomGenome(createRng(`a${i}`))
      const b = randomGenome(createRng(`b${i}`))
      const child = blendGenomes(a, b)
      expect(child).toEqual(clampGenome(child))
    }
  })
})
