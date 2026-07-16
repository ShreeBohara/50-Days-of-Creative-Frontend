import { describe, expect, it } from 'vitest'
import { getInkEdgeSprings, getNextTabIndex, measureTabEdges } from './tabsGeometry.js'

describe('measureTabEdges', () => {
  it('returns edges relative to the tab list', () => {
    expect(measureTabEdges({ left: 146, right: 226 }, { left: 110 })).toEqual({
      left: 36,
      right: 116,
    })
  })
})

describe('getNextTabIndex', () => {
  it('wraps arrow navigation and supports Home and End', () => {
    expect(getNextTabIndex(3, 'ArrowRight', 4)).toBe(0)
    expect(getNextTabIndex(0, 'ArrowLeft', 4)).toBe(3)
    expect(getNextTabIndex(2, 'Home', 4)).toBe(0)
    expect(getNextTabIndex(1, 'End', 4)).toBe(3)
  })

  it('leaves the index alone for unrelated keys', () => {
    expect(getNextTabIndex(2, 'Enter', 4)).toBe(2)
  })
})

describe('getInkEdgeSprings', () => {
  it('makes the edge leading the movement stiffer', () => {
    const movingRight = getInkEdgeSprings(1)
    const movingLeft = getInkEdgeSprings(-1)

    expect(movingRight.right.stiffness).toBeGreaterThan(movingRight.left.stiffness)
    expect(movingLeft.left.stiffness).toBeGreaterThan(movingLeft.right.stiffness)
  })
})
