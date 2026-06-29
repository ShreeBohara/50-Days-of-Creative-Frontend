// Rivers: pick sources in the highlands, then follow steepest descent down to
// the sea. Pure and deterministic — the same world always grows the same rivers.

import type { Polyline } from './coastline'
import { createRng, type Rng } from './random'
import { seedFor, type HeightField, type WorldParams } from './world'

const NEIGH8: ReadonlyArray<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
]

/** Follow the lowest neighbour from `start` until reaching the sea or a pit. */
function flowDownhill(data: Float32Array, size: number, start: number, seaLevel: number): Polyline {
  const path: Polyline = []
  const visited = new Set<number>()
  let idx = start

  for (let step = 0; step < size * 2; step++) {
    if (visited.has(idx)) break
    visited.add(idx)
    const x = idx % size
    const y = (idx / size) | 0
    path.push({ x, y })
    if (data[idx] < seaLevel) break // reached open water

    let best = -1
    let bestVal = data[idx]
    for (const [dx, dy] of NEIGH8) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      const ni = ny * size + nx
      if (data[ni] < bestVal) {
        bestVal = data[ni]
        best = ni
      }
    }
    if (best < 0) break // local depression
    idx = best
  }
  return path
}

/** Trace up to `params.rivers` rivers, spaced apart, each ≥ a few cells long. */
export function traceRivers(field: HeightField, params: WorldParams): Polyline[] {
  const { size, data } = field
  const count = Math.max(0, Math.round(params.rivers))
  if (count === 0) return []

  const rng: Rng = createRng(seedFor(params.seed, 'rivers'))
  const seaLevel = params.seaLevel
  const srcThreshold = seaLevel + (1 - seaLevel) * 0.55

  const sources: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (data[i] >= srcThreshold) sources.push(i)
  }
  if (sources.length === 0) return []

  const rivers: Polyline[] = []
  const usedSources = new Set<number>()
  const minSpacing = size * 0.06
  const minSpacing2 = minSpacing * minSpacing

  let attempts = 0
  const maxAttempts = count * 24
  while (rivers.length < count && attempts < maxAttempts) {
    attempts++
    const start = sources[(rng() * sources.length) | 0]
    if (usedSources.has(start)) continue

    const sx = start % size
    const sy = (start / size) | 0
    let tooClose = false
    for (const s of usedSources) {
      const dx = (s % size) - sx
      const dy = ((s / size) | 0) - sy
      if (dx * dx + dy * dy < minSpacing2) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue

    const path = flowDownhill(data, size, start, seaLevel)
    if (path.length >= 6) {
      rivers.push(path)
      usedSources.add(start)
    }
  }
  return rivers
}
