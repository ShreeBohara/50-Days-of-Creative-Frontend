import { describe, it, expect } from 'vitest'
import {
  azimuth,
  zoneFromLocalPoint,
  variantId,
  VARIANT_IDS,
  variantIndex,
  variantFromIndex,
  parseVariantId,
} from './impactZone.js'
import { SEVERITY } from './severity.js'

// Unit point on the bowl's equator at azimuth `deg`.
const at = (deg, r = 0.06, y = 0.03) => {
  const a = (deg * Math.PI) / 180
  return [Math.sin(a) * r, y, Math.cos(a) * r]
}

describe('azimuth', () => {
  it('measures from +Z towards +X', () => {
    expect(azimuth([0, 0, 1])).toBe(0)
    expect(azimuth([1, 0, 0])).toBeCloseTo(90, 10)
    expect(azimuth([0, 0, -1])).toBeCloseTo(180, 10)
    expect(azimuth([-1, 0, 0])).toBeCloseTo(270, 10)
  })

  it('always returns [0, 360)', () => {
    for (let d = -720; d <= 720; d += 7.5) {
      const phi = azimuth(at(d))
      expect(phi).toBeGreaterThanOrEqual(0)
      expect(phi).toBeLessThan(360)
    }
    // -0 on the back axis and a hair left of front both fold correctly.
    expect(azimuth([-0, 0, -1])).toBe(180)
    expect(azimuth([-1e-300, 0, 1])).toBe(0)
  })

  it('ignores y and accepts Vector3-like objects', () => {
    expect(azimuth([1, 5, 1])).toBeCloseTo(45, 10)
    expect(azimuth({ x: 1, y: -3, z: 1 })).toBeCloseTo(45, 10)
    expect(azimuth(new Float32Array([1, 0, 1]))).toBeCloseTo(45, 5)
  })

  it('returns 0 for degenerate input', () => {
    expect(azimuth([0, 1, 0])).toBe(0)
    expect(azimuth(null)).toBe(0)
    expect(azimuth([NaN, 0, 1])).toBe(0)
  })
})

describe('zoneFromLocalPoint', () => {
  it('maps zone centres', () => {
    for (let k = 0; k < 6; k += 1) expect(zoneFromLocalPoint(at(k * 60))).toBe(k)
  })

  it('is half-open at every boundary, built with sin/cos', () => {
    for (let k = 0; k < 6; k += 1) {
      const edge = k * 60 + 30
      expect(zoneFromLocalPoint(at(edge))).toBe((k + 1) % 6)
      expect(zoneFromLocalPoint(at(edge - 1e-6))).toBe(k)
    }
  })

  it('wraps: 330° starts zone 0, 329.99° is zone 5', () => {
    expect(zoneFromLocalPoint(at(330))).toBe(0)
    expect(zoneFromLocalPoint(at(-30))).toBe(0)
    expect(zoneFromLocalPoint(at(329.99))).toBe(5)
    expect(zoneFromLocalPoint(at(359.9999))).toBe(0)
    expect(zoneFromLocalPoint([0, 0, 1])).toBe(0)
  })

  it('is always an integer 0..5', () => {
    for (let d = 0; d < 360; d += 0.37) {
      const z = zoneFromLocalPoint(at(d))
      expect(Number.isInteger(z)).toBe(true)
      expect(z).toBeGreaterThanOrEqual(0)
      expect(z).toBeLessThan(6)
    }
  })
})

describe('variant ids', () => {
  it('builds ids from zone and severity', () => {
    expect(variantId(0, SEVERITY.DROP)).toBe('Z0_drop')
    expect(variantId(3, SEVERITY.HAIRLINE)).toBe('Z3_drop')
    expect(variantId(5, SEVERITY.FLING)).toBe('Z5_fling')
  })

  it('throws on a set, an unknown severity or a bad zone', () => {
    expect(() => variantId(0, SEVERITY.SET)).toThrow()
    expect(() => variantId(0, 'shatter')).toThrow()
    expect(() => variantId(6, SEVERITY.DROP)).toThrow(RangeError)
    expect(() => variantId(-1, SEVERITY.DROP)).toThrow(RangeError)
    expect(() => variantId(1.5, SEVERITY.DROP)).toThrow(RangeError)
  })

  it('lists all 12 ids once, zone-major', () => {
    expect(VARIANT_IDS).toHaveLength(12)
    expect(new Set(VARIANT_IDS).size).toBe(12)
    expect(VARIANT_IDS.slice(0, 3)).toEqual(['Z0_drop', 'Z0_fling', 'Z1_drop'])
    expect(VARIANT_IDS[11]).toBe('Z5_fling')
    expect(Object.isFrozen(VARIANT_IDS)).toBe(true)
  })

  it('round-trips index ⇄ id', () => {
    VARIANT_IDS.forEach((id, i) => {
      expect(variantIndex(id)).toBe(i)
      expect(variantFromIndex(i)).toBe(id)
    })
  })

  it('rejects unknown ids and out-of-range indices', () => {
    expect(variantIndex('Z6_drop')).toBe(-1)
    expect(variantIndex('z0_drop')).toBe(-1)
    expect(variantFromIndex(12)).toBeNull()
    expect(variantFromIndex(-1)).toBeNull()
    expect(variantFromIndex(0.5)).toBeNull()
  })

  it('every generated id parses back', () => {
    for (let z = 0; z < 6; z += 1) {
      for (const sev of [SEVERITY.HAIRLINE, SEVERITY.DROP, SEVERITY.FLING]) {
        const id = variantId(z, sev)
        expect(variantIndex(id)).toBeGreaterThanOrEqual(0)
        expect(parseVariantId(id).zone).toBe(z)
      }
    }
    expect(parseVariantId('Z2_fling')).toEqual({ zone: 2, kind: 'fling' })
    expect(parseVariantId('Z9_fling')).toBeNull()
  })
})
