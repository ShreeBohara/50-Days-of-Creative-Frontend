export const DEFAULT_VIEWPORT = {
  x: 0,
  y: 0,
  scale: 1,
}

export const MIN_ZOOM = 0.25
export const MAX_ZOOM = 3

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function clampScale(scale) {
  return clamp(scale, MIN_ZOOM, MAX_ZOOM)
}

export function screenToWorld(point, viewport) {
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale,
  }
}

export function worldToScreen(point, viewport) {
  return {
    x: (point.x * viewport.scale) + viewport.x,
    y: (point.y * viewport.scale) + viewport.y,
  }
}

export function zoomViewport(viewport, screenPoint, nextScale) {
  const scale = clampScale(nextScale)
  const worldPoint = screenToWorld(screenPoint, viewport)

  return {
    x: screenPoint.x - (worldPoint.x * scale),
    y: screenPoint.y - (worldPoint.y * scale),
    scale,
  }
}

export function translateViewport(viewport, delta) {
  return {
    ...viewport,
    x: viewport.x + delta.x,
    y: viewport.y + delta.y,
  }
}
