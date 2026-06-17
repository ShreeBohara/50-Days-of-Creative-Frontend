export function normalizeRect(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  }
}

export function getPointBounds(points) {
  if (!points.length) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function expandBounds(bounds, amount) {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + (amount * 2),
    height: bounds.height + (amount * 2),
  }
}

export function boundsFromElement(element) {
  if (element.points) {
    return expandBounds(getPointBounds(element.points), element.strokeWidth ?? 1)
  }

  if (element.type === 'text') {
    return {
      x: element.x,
      y: element.y - element.fontSize,
      width: Math.max(element.width ?? 120, element.text.length * element.fontSize * 0.52),
      height: element.fontSize * 1.35,
    }
  }

  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  }
}

export function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function translateElement(element, delta) {
  if (element.points) {
    return {
      ...element,
      points: element.points.map((point) => ({
        ...point,
        x: point.x + delta.x,
        y: point.y + delta.y,
      })),
    }
  }

  return {
    ...element,
    x: element.x + delta.x,
    y: element.y + delta.y,
  }
}
