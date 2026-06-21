export function hashString(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function randomFor(seed: string, path: string): number {
  return seededRandom(hashString(`${seed}::${path}`))()
}

export function randomBetween(seed: string, path: string, min: number, max: number): number {
  return min + randomFor(seed, path) * (max - min)
}

export function randomItem<T>(seed: string, path: string, values: readonly T[]): T {
  const index = Math.min(values.length - 1, Math.floor(randomFor(seed, path) * values.length))
  return values[index]
}
