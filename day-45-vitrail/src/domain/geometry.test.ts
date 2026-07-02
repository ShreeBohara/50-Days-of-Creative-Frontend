import { describe, expect, it } from 'vitest'
import {
  annularSectorPath,
  circleThrough3,
  dist,
  foilPath,
  lerpPt,
  petalPath,
  polar,
  polygonPath,
  sampleArchHead,
} from './geometry'

describe('geometry', () => {
  it('polar converts angles to cartesian points', () => {
    expect(polar(0, 0, 10, 0)).toEqual({ x: 10, y: 0 })
    const up = polar(0, 0, 10, -Math.PI / 2)
    expect(up.x).toBeCloseTo(0, 1)
    expect(up.y).toBeCloseTo(-10, 1)
  })

  it('circleThrough3 recovers a known circle', () => {
    const c = circleThrough3({ x: 10, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 10 })
    expect(c).not.toBeNull()
    expect(c!.center.x).toBeCloseTo(0, 6)
    expect(c!.center.y).toBeCloseTo(0, 6)
    expect(c!.radius).toBeCloseTo(10, 6)
  })

  it('circleThrough3 rejects collinear points', () => {
    expect(circleThrough3({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 })).toBeNull()
  })

  it('annular sector is a closed path with two arcs', () => {
    const d = annularSectorPath(0, 0, 40, 80, 0, Math.PI / 4)
    expect(d.startsWith('M ')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
    expect(d.match(/A /g)).toHaveLength(2)
  })

  it('petal paths close for every head style', () => {
    for (const style of ['geometric', 'foil', 'flamboyant'] as const) {
      const d = petalPath(0, 0, 30, 90, -0.4, 0.4, style)
      expect(d.startsWith('M ')).toBe(true)
      expect(d.endsWith('Z')).toBe(true)
    }
  })

  it('foil path has one arc per lobe plus the closing arc', () => {
    const d = foilPath(0, 0, 50, 4)
    expect(d.match(/A /g)).toHaveLength(4)
    expect(d.endsWith('Z')).toBe(true)
  })

  it('arch head runs spring-to-spring through the apex', () => {
    const pts = sampleArchHead(100, 60, 24)
    expect(pts[0].x).toBeCloseTo(0, 1)
    expect(pts[0].y).toBeCloseTo(0, 1)
    expect(pts[pts.length - 1].x).toBeCloseTo(100, 1)
    expect(pts[pts.length - 1].y).toBeCloseTo(0, 1)
    const apex = pts.reduce((lowest, p) => (p.y < lowest.y ? p : lowest))
    expect(apex.x).toBeCloseTo(50, 0)
    expect(apex.y).toBeCloseTo(-60, 0)
    // strictly ordered left → right so band tessellation can pair samples
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThanOrEqual(pts[i - 1].x - 0.01)
    }
  })

  it('polygonPath closes a triangle', () => {
    const d = polygonPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 8 },
    ])
    expect(d).toBe('M 0 0 L 10 0 L 5 8 Z')
  })

  it('lerpPt interpolates between points', () => {
    const m = lerpPt({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)
    expect(m).toEqual({ x: 5, y: 10 })
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})
