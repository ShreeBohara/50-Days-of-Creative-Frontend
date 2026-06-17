import { boundsFromElement, pointDistance } from './geometry'

function pointInBounds(point, bounds, padding = 0) {
  return point.x >= bounds.x - padding
    && point.x <= bounds.x + bounds.width + padding
    && point.y >= bounds.y - padding
    && point.y <= bounds.y + bounds.height + padding
}

function distanceToSegment(point, start, end) {
  const lengthSquared = ((end.x - start.x) ** 2) + ((end.y - start.y) ** 2)

  if (lengthSquared === 0) {
    return pointDistance(point, start)
  }

  const t = Math.max(0, Math.min(1, (
    ((point.x - start.x) * (end.x - start.x))
    + ((point.y - start.y) * (end.y - start.y))
  ) / lengthSquared))

  return pointDistance(point, {
    x: start.x + (t * (end.x - start.x)),
    y: start.y + (t * (end.y - start.y)),
  })
}

export function hitTestElement(element, point, tolerance = 6) {
  if (element.type === 'draw') {
    const points = element.points ?? []

    return points.some((current, index) => {
      if (index === 0) {
        return pointDistance(point, current) <= tolerance + element.strokeWidth
      }

      return distanceToSegment(point, points[index - 1], current) <= tolerance + element.strokeWidth
    })
  }

  if (element.type === 'line' || element.type === 'arrow') {
    return distanceToSegment(
      point,
      { x: element.x1, y: element.y1 },
      { x: element.x2, y: element.y2 },
    ) <= tolerance + element.strokeWidth
  }

  return pointInBounds(point, boundsFromElement(element), tolerance)
}

export function findElementAtPoint(elements, point, tolerance = 6) {
  return [...elements]
    .sort((a, b) => b.zIndex - a.zIndex || b.createdAt - a.createdAt)
    .find((element) => hitTestElement(element, point, tolerance))
}
