import { describe, expect, it } from 'vitest'
import {
  figureExtent,
  frequencyRatio,
  pathLength,
  pathToSvgD,
  samplePath,
  SCHEMA_VERSION,
  type HarmonographParams,
  type Pendulum,
} from './harmonograph'

function pendulum(over: Partial<Pendulum> = {}): Pendulum {
  return { freq: 1, amp: 1, phase: 0, damping: 0, ...over }
}

function params(over: Partial<HarmonographParams> = {}): HarmonographParams {
  return {
    version: SCHEMA_VERSION,
    x: [pendulum()],
    y: [pendulum({ phase: Math.PI / 2 })],
    duration: 100,
    steps: 1000,
    seed: 'test',
    ...over,
  }
}

describe('samplePath', () => {
  it('returns steps + 1 points', () => {
    const pts = samplePath(params({ steps: 500 }))
    expect(pts).toHaveLength(501)
  })

  it('is deterministic', () => {
    const p = params()
    expect(samplePath(p)).toEqual(samplePath(p))
  })

  it('honours a steps override without mutating params', () => {
    const p = params({ steps: 1000 })
    const pts = samplePath(p, { steps: 200 })
    expect(pts).toHaveLength(201)
    expect(p.steps).toBe(1000)
  })

  it('traces a unit circle for a 1:1 quadrature pair (no damping)', () => {
    // x = sin(t), y = sin(t + π/2) = cos(t)  ⇒  x² + y² = 1
    const pts = samplePath(params({ duration: 2 * Math.PI, steps: 360 }))
    for (const pt of pts) {
      expect(Math.hypot(pt.x, pt.y)).toBeCloseTo(1, 5)
    }
  })

  it('decays toward the origin when damped', () => {
    const damped = samplePath(
      params({
        x: [pendulum({ damping: 0.05 })],
        y: [pendulum({ phase: Math.PI / 2, damping: 0.05 })],
        duration: 120,
        steps: 1200,
      }),
    )
    const early = Math.hypot(damped[60].x, damped[60].y)
    const late = Math.hypot(damped[1100].x, damped[1100].y)
    expect(late).toBeLessThan(early)
  })
})

describe('figureExtent', () => {
  it('sums the absolute amplitudes of the larger axis', () => {
    const p = params({
      x: [pendulum({ amp: 0.6 }), pendulum({ amp: 0.5 })],
      y: [pendulum({ amp: 0.3 })],
    })
    expect(figureExtent(p)).toBeCloseTo(1.1, 6)
  })

  it('never returns zero', () => {
    expect(figureExtent(params({ x: [pendulum({ amp: 0 })], y: [pendulum({ amp: 0 })] }))).toBeGreaterThan(0)
  })
})

describe('pathToSvgD', () => {
  it('starts with a moveto and keeps points centered in the box', () => {
    const pts = samplePath(params({ duration: 2 * Math.PI, steps: 8 }))
    const d = pathToSvgD(pts, figureExtent(params()), 1000)
    expect(d.startsWith('M')).toBe(true)
    expect(d).toContain('L')
  })

  it('returns empty string for no points', () => {
    expect(pathToSvgD([], 1)).toBe('')
  })
})

describe('pathLength', () => {
  it('is positive for a real figure and zero for a single point', () => {
    expect(pathLength(samplePath(params()))).toBeGreaterThan(0)
    expect(pathLength([{ x: 0, y: 0 }])).toBe(0)
  })
})

describe('frequencyRatio', () => {
  it('reduces the axis frequency ratio', () => {
    expect(frequencyRatio(params({ x: [pendulum({ freq: 3 })], y: [pendulum({ freq: 2 })] }))).toBe('3 : 2')
    expect(frequencyRatio(params({ x: [pendulum({ freq: 2 })], y: [pendulum({ freq: 2 })] }))).toBe('1 : 1')
  })
})
