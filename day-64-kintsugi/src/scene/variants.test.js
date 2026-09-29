import { describe, expect, it } from 'vitest'
import { hullPoints } from './variants.js'

// a dense, slightly squashed sphere: every vertex is on its own hull
function sphere(n = 4000) {
  const out = new Float32Array(n * 3)
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    out.set([Math.cos(ga * i) * r * 0.03, y * 0.012, Math.sin(ga * i) * r * 0.02], i * 3)
  }
  return out
}

describe('hullPoints', () => {
  it('keeps a bounded subset of points, every one taken from the input', () => {
    const pos = sphere()
    const pts = hullPoints(pos)
    const k = pts.length / 3
    expect(k).toBeGreaterThan(30)
    expect(k).toBeLessThanOrEqual(406)
    const set = new Set()
    for (let i = 0; i < pos.length; i += 3) set.add(`${pos[i]},${pos[i + 1]},${pos[i + 2]}`)
    for (let i = 0; i < pts.length; i += 3) expect(set.has(`${pts[i]},${pts[i + 1]},${pts[i + 2]}`)).toBe(true)
  })

  it('preserves the extent along each axis (the collider is as big as the shard)', () => {
    const pos = sphere()
    const pts = hullPoints(pos)
    for (let axis = 0; axis < 3; axis++) {
      let lo = Infinity
      let hi = -Infinity
      let plo = Infinity
      let phi = -Infinity
      for (let i = axis; i < pos.length; i += 3) {
        lo = Math.min(lo, pos[i])
        hi = Math.max(hi, pos[i])
      }
      for (let i = axis; i < pts.length; i += 3) {
        plo = Math.min(plo, pts[i])
        phi = Math.max(phi, pts[i])
      }
      // within 1% of the true extent on every axis
      expect(phi - plo).toBeGreaterThan((hi - lo) * 0.99)
    }
  })

  it('handles a single triangle', () => {
    const pts = hullPoints(new Float32Array([0, 0, 0, 0.01, 0, 0, 0, 0.01, 0]))
    expect(pts.length / 3).toBeLessThanOrEqual(3)
    expect(pts.length / 3).toBeGreaterThanOrEqual(2)
  })
})
