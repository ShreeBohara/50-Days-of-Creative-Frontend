export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function normalizePoint(clientX, clientY) {
  const width = Math.max(window.innerWidth, 1)
  const height = Math.max(window.innerHeight, 1)

  return {
    x: clamp(clientX / width),
    y: clamp(clientY / height),
  }
}

export function denormalizePoint(point) {
  return {
    x: clamp(point.x) * window.innerWidth,
    y: clamp(point.y) * window.innerHeight,
  }
}

export function pointDistance(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y

  return Math.sqrt(dx * dx + dy * dy)
}
