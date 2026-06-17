import { describe, expect, it } from 'vitest'
import {
  clampScale,
  screenToWorld,
  worldToScreen,
  zoomViewport,
} from './viewport'

describe('viewport helpers', () => {
  it('round trips between screen and world coordinates', () => {
    const viewport = { x: 120, y: -48, scale: 1.75 }
    const world = { x: 320, y: 180 }
    const screen = worldToScreen(world, viewport)

    expect(screenToWorld(screen, viewport)).toEqual(world)
  })

  it('zooms around a fixed screen point', () => {
    const viewport = { x: 20, y: 30, scale: 1 }
    const screenPoint = { x: 200, y: 160 }
    const before = screenToWorld(screenPoint, viewport)
    const next = zoomViewport(viewport, screenPoint, 2)

    expect(screenToWorld(screenPoint, next)).toEqual(before)
  })

  it('clamps zoom to whiteboard limits', () => {
    expect(clampScale(99)).toBe(3)
    expect(clampScale(0.01)).toBe(0.25)
  })
})
