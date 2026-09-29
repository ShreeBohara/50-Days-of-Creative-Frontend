import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { shellMassProperties } from './geometry.js'

function box(w, h, d, y = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(0, y, 0)
  return { pos: g.attributes.position.array, index: g.index.array }
}

describe('shellMassProperties', () => {
  it('matches a solid box: centre of mass and inertia', () => {
    const { pos, index } = box(0.2, 0.1, 0.04, 0.05)
    const m = 2
    const p = shellMassProperties(pos, index, m)
    expect(p.centerOfMass.y).toBeCloseTo(0.05, 6)
    expect(p.centerOfMass.x).toBeCloseTo(0, 6)
    // I = m/12 · (b² + c²)
    expect(p.principalAngularInertia.x).toBeCloseTo((m / 12) * (0.1 ** 2 + 0.04 ** 2), 8)
    expect(p.principalAngularInertia.y).toBeCloseTo((m / 12) * (0.2 ** 2 + 0.04 ** 2), 8)
    expect(p.principalAngularInertia.z).toBeCloseTo((m / 12) * (0.2 ** 2 + 0.1 ** 2), 8)
  })

  it('works without an index', () => {
    const g = new THREE.BoxGeometry(0.1, 0.1, 0.1).toNonIndexed()
    const p = shellMassProperties(g.attributes.position.array, null, 1)
    expect(p.principalAngularInertia.y).toBeCloseTo((1 / 12) * 0.02, 8)
  })
})
