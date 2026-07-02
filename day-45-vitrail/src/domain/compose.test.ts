import { describe, expect, it } from 'vitest'
import { composeWindow, windowTitle } from './compose'
import { clampGenome, defaultGenome, type WindowGenome } from './genome'

function genome(overrides: Partial<WindowGenome> = {}): WindowGenome {
  return clampGenome({ ...defaultGenome(), ...overrides })
}

describe('compose', () => {
  it('is fully deterministic for equal genomes', () => {
    expect(composeWindow(genome())).toEqual(composeWindow(genome()))
  })

  it('different seeds change the glass', () => {
    const a = composeWindow(genome({ seed: 'aube' }))
    const b = composeWindow(genome({ seed: 'crepuscule' }))
    expect(a.panes.map((p) => p.fill)).not.toEqual(b.panes.map((p) => p.fill))
    expect(a.title).not.toBe(b.title)
  })

  it('every pane gets a valid fill, glow and reveal', () => {
    const spec = composeWindow(genome({ archetype: 'triptych' }))
    for (const pane of spec.panes) {
      expect(pane.fill).toMatch(/^hsl\(-?\d+ \d+% \d+%\)$/)
      expect(pane.glow).toBeGreaterThanOrEqual(0.55)
      expect(pane.glow).toBeLessThanOrEqual(1)
      expect(pane.reveal).toBeGreaterThanOrEqual(0)
      expect(pane.reveal).toBeLessThanOrEqual(1)
    }
  })

  it('zero jitter keeps each ring to its planned glasses', () => {
    const spec = composeWindow(genome({ jitter: 0 }))
    const fieldRings = new Map<number, Set<string>>()
    for (const pane of spec.panes) {
      if (pane.kind !== 'field') continue
      if (!fieldRings.has(pane.ring)) fieldRings.set(pane.ring, new Set())
      fieldRings.get(pane.ring)!.add(pane.fill)
    }
    for (const fills of fieldRings.values()) {
      expect(fills.size).toBeLessThanOrEqual(2)
    }
  })

  it('lead width scales with the genome gene', () => {
    const thin = composeWindow(genome({ leadWidth: 1 }))
    const thick = composeWindow(genome({ leadWidth: 6 }))
    expect(thick.leadWidth).toBeGreaterThan(thin.leadWidth)
  })

  it('titles are deterministic and themed to the archetype', () => {
    const g = genome({ archetype: 'rose', seed: 'test-rose' })
    expect(windowTitle(g)).toBe(windowTitle(g))
    expect(windowTitle(g)).toMatch(/Rose|Wheel|Oculus|Corona/)
  })
})
