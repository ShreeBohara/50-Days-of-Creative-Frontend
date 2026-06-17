import { DEFAULT_STYLE } from '../data/whiteboardConfig'
import { normalizeRect } from './geometry'

export function createElementId(prefix = 'el') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createBaseElement(type, style = DEFAULT_STYLE, zIndex = 1) {
  const timestamp = Date.now()

  return {
    id: createElementId(type),
    type,
    createdAt: timestamp,
    updatedAt: timestamp,
    zIndex,
    stroke: style.stroke,
    fill: style.fillEnabled ? style.fill : 'transparent',
    strokeWidth: style.strokeWidth,
    strokeStyle: style.strokeStyle,
    opacity: style.opacity,
  }
}

export function createFreehandElement(points, style, zIndex) {
  return {
    ...createBaseElement('draw', style, zIndex),
    points,
  }
}

export function createShapeElement(type, start, end, style, zIndex) {
  return {
    ...createBaseElement(type, style, zIndex),
    ...normalizeRect(start, end),
  }
}

export function createTextElement(point, text, style, zIndex) {
  return {
    ...createBaseElement('text', style, zIndex),
    x: point.x,
    y: point.y,
    width: 220,
    text,
    fill: style.stroke,
    fontSize: style.fontSize,
  }
}

export function createStickyElement(point, text, style, zIndex) {
  return {
    ...createBaseElement('sticky', style, zIndex),
    x: point.x,
    y: point.y,
    width: 190,
    height: 160,
    text,
    fill: style.stickyColor,
    fontSize: Math.max(16, style.fontSize - 4),
  }
}

export function orderElements(elements) {
  return [...elements].sort((a, b) => a.zIndex - b.zIndex || a.createdAt - b.createdAt)
}

export function getNextZIndex(elements) {
  return elements.reduce((max, element) => Math.max(max, element.zIndex), 0) + 1
}
