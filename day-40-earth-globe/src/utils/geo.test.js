import { describe, expect, it } from 'vitest'
import { greatCirclePoints, latLngToVector3, sunDirectionFromTime, vectorToLatLng } from './geo'

describe('geo utilities', () => {
  it('converts lat/lng into unit sphere coordinates', () => {
    expect(latLngToVector3(0, 0)).toEqual({ x: 0, y: 0, z: 1 })
    expect(latLngToVector3(90, 0).y).toBeCloseTo(1, 6)
    expect(latLngToVector3(0, 90).x).toBeCloseTo(1, 6)
  })

  it('round-trips vector coordinates back to lat/lng', () => {
    const vector = latLngToVector3(35.6762, 139.6503)
    const coords = vectorToLatLng(vector)

    expect(coords.lat).toBeCloseTo(35.6762, 4)
    expect(coords.lng).toBeCloseTo(139.6503, 4)
  })

  it('builds lifted great-circle arcs', () => {
    const points = greatCirclePoints({ lat: 0, lng: 0 }, { lat: 0, lng: 90 }, { segments: 8, altitude: 0.4 })
    const middle = points[4]

    expect(points).toHaveLength(9)
    expect(Math.hypot(points[0].x, points[0].y, points[0].z)).toBeCloseTo(1, 6)
    expect(Math.hypot(middle.x, middle.y, middle.z)).toBeGreaterThan(1.3)
  })

  it('creates normalized sun vectors from local time', () => {
    const direction = sunDirectionFromTime(18)
    expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1, 6)
  })
})
