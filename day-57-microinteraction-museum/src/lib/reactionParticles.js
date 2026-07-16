const MIN_PARTICLES = 10
const MAX_PARTICLES = 14

export function createSeededRandom(seed) {
  let value = Number(seed) >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

export function createReactionParticles(seed, requestedCount) {
  const random = createSeededRandom(seed)
  const count = requestedCount == null
    ? MIN_PARTICLES + Math.floor(random() * (MAX_PARTICLES - MIN_PARTICLES + 1))
    : Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round(requestedCount)))

  return Array.from({ length: count }, (_, index) => {
    const direction = random() < 0.5 ? -1 : 1
    const horizontal = direction * (28 + random() * 92)
    const lift = -(54 + random() * 90)
    const gravity = 76 + random() * 88

    return {
      index,
      kind: random() < 0.56 ? 'heart' : 'spark',
      color: random() < 0.5 ? 'vermilion' : 'cobalt',
      x: Number(horizontal.toFixed(3)),
      lift: Number(lift.toFixed(3)),
      fall: Number((lift * 0.22 + gravity).toFixed(3)),
      gravity: Number(gravity.toFixed(3)),
      rotation: Number(((random() - 0.5) * 300).toFixed(3)),
      scale: Number((0.65 + random() * 0.72).toFixed(3)),
      duration: Number((0.72 + random() * 0.42).toFixed(3)),
      delay: Number((index * 0.012).toFixed(3)),
    }
  })
}

export function capReactionParticles(existing, incoming, limit = 100) {
  const cap = Math.max(0, Math.floor(limit))
  if (cap === 0) return []
  return [...existing, ...incoming].slice(-cap)
}
