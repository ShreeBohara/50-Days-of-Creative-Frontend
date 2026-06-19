const DEG_TO_RAD = Math.PI / 180

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  }
}

export function scaleVector(vector, scale) {
  return {
    x: vector.x * scale,
    y: vector.y * scale,
    z: vector.z * scale,
  }
}

export function latLngToVector3(lat, lng, radius = 1) {
  const latRad = lat * DEG_TO_RAD
  const lngRad = lng * DEG_TO_RAD
  const cosLat = Math.cos(latRad)

  return {
    x: radius * cosLat * Math.sin(lngRad),
    y: radius * Math.sin(latRad),
    z: radius * cosLat * Math.cos(lngRad),
  }
}

export function vectorToLatLng(vector) {
  const normalized = normalizeVector(vector)
  return {
    lat: Math.asin(normalized.y) / DEG_TO_RAD,
    lng: Math.atan2(normalized.x, normalized.z) / DEG_TO_RAD,
  }
}

export function slerpVector(start, end, t) {
  const from = normalizeVector(start)
  const to = normalizeVector(end)
  const dot = clamp(from.x * to.x + from.y * to.y + from.z * to.z, -1, 1)
  const theta = Math.acos(dot) * t
  const relative = normalizeVector({
    x: to.x - from.x * dot,
    y: to.y - from.y * dot,
    z: to.z - from.z * dot,
  })

  return {
    x: from.x * Math.cos(theta) + relative.x * Math.sin(theta),
    y: from.y * Math.cos(theta) + relative.y * Math.sin(theta),
    z: from.z * Math.cos(theta) + relative.z * Math.sin(theta),
  }
}

export function greatCirclePoints(from, to, options = {}) {
  const { segments = 48, radius = 1, altitude = 0.32 } = options
  const start = latLngToVector3(from.lat, from.lng, radius)
  const end = latLngToVector3(to.lat, to.lng, radius)

  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments
    const arcLift = Math.sin(Math.PI * t) * altitude
    return scaleVector(slerpVector(start, end, t), radius + arcLift)
  })
}

export function sunDirectionFromTime(hour) {
  const normalizedHour = ((hour % 24) + 24) % 24
  const angle = ((normalizedHour - 12) / 24) * Math.PI * 2
  return normalizeVector({
    x: Math.sin(angle),
    y: 0.22,
    z: Math.cos(angle),
  })
}

export function formatPopulation(population) {
  if (population >= 1_000_000) return `${(population / 1_000_000).toFixed(1)}M`
  if (population >= 1_000) return `${Math.round(population / 1_000)}K`
  return String(population)
}
