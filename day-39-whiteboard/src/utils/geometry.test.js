import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE } from '../data/whiteboardConfig'
import {
  createFreehandElement,
  createShapeElement,
  createStickyElement,
} from './elements'
import { boundsFromElement, resizeElementToBounds } from './geometry'
import { findElementAtPoint, hitTestElement } from './hitTest'

describe('geometry and hit testing', () => {
  it('hit-tests freehand strokes by segment distance', () => {
    const stroke = createFreehandElement([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ], DEFAULT_STYLE, 1)

    expect(hitTestElement(stroke, { x: 50, y: 3 }, 4)).toBe(true)
    expect(hitTestElement(stroke, { x: 50, y: 32 }, 4)).toBe(false)
  })

  it('finds the top-most element at a point', () => {
    const bottom = createShapeElement('rectangle', { x: 0, y: 0 }, { x: 100, y: 100 }, DEFAULT_STYLE, 1)
    const top = createStickyElement({ x: 10, y: 10 }, 'Top', DEFAULT_STYLE, 2)

    expect(findElementAtPoint([bottom, top], { x: 20, y: 20 })?.id).toBe(top.id)
  })

  it('resizes an element into target bounds', () => {
    const rectangle = createShapeElement('rectangle', { x: 10, y: 10 }, { x: 50, y: 40 }, DEFAULT_STYLE, 1)
    const resized = resizeElementToBounds(
      rectangle,
      boundsFromElement(rectangle),
      { x: 0, y: 0, width: 200, height: 120 },
    )

    expect(boundsFromElement(resized)).toEqual({ x: 0, y: 0, width: 200, height: 120 })
  })
})
