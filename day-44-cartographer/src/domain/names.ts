// Procedural place-names. Roots are assembled from a language's syllables, then
// a feature template positions them ("Mount Drangard", "Velamar Bay"). Label
// sites are detected from the biome grid (peaks, capes, bays, islets, towns)
// and spaced out so engraved labels don't collide. All deterministic.

import { getLanguage, type Language } from '../data/languages'
import { createRng, pick, type Rng } from './random'
import { classifyField, seedFor, type HeightField, type WorldParams } from './world'

export type LabelKind = 'peak' | 'cape' | 'bay' | 'isle' | 'town'

export interface Label {
  kind: LabelKind
  name: string
  gx: number
  gy: number
}

/** Build a root word: usually start+end, occasionally start+mid+end. */
export function makeRoot(rng: Rng, lang: Language): string {
  if (rng() < 0.25) {
    return pick(rng, lang.starts) + pick(rng, lang.mids) + pick(rng, lang.ends)
  }
  return pick(rng, lang.starts) + pick(rng, lang.ends)
}

/** Build a full place-name of a given kind. */
export function makeName(rng: Rng, lang: Language, kind: LabelKind): string {
  const tmpl = pick(rng, lang[kind])
  const root = kind === 'town' ? pick(rng, lang.starts) : makeRoot(rng, lang)
  return tmpl.replace('{}', root)
}

const GRAND = ['The {} Reach', 'The {} Expanse', '{} Archipelago', 'Isles of {}', 'The {} Coast', 'Kingdom of {}', '{} Land']

/** A grand name for the whole chart (the cartouche title). */
export function worldName(params: WorldParams): string {
  const rng = createRng(seedFor(params.seed, 'title'))
  const lang = getLanguage(params.languageId)
  return pick(rng, GRAND).replace('{}', makeRoot(rng, lang))
}

const NEIGH8: ReadonlyArray<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
]

interface Candidate {
  kind: LabelKind
  gx: number
  gy: number
  priority: number
}

// Lower weight = placed first (wins ties for space). Peaks anchor the map.
const KIND_WEIGHT: Record<LabelKind, number> = { peak: 0, bay: 1, cape: 2, isle: 3, town: 4 }

function isLocalMax(data: Float32Array, size: number, x: number, y: number, r: number): boolean {
  const v = data[y * size + x]
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
      if (data[ny * size + nx] > v) return false
    }
  }
  return true
}

/**
 * Detect and name notable sites, then thin them so labels keep their distance.
 * `labelDensity` (0..1) scales how many survive.
 */
export function placeLabels(field: HeightField, params: WorldParams): Label[] {
  const { size, data } = field
  const biome = classifyField(field, params.seaLevel)
  const rng = createRng(seedFor(params.seed, 'names'))
  const lang = getLanguage(params.languageId)

  const candidates: Candidate[] = []
  const isWater = (i: number) => biome[i] <= 1
  const isLand = (i: number) => biome[i] >= 2

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const i = y * size + x
      let water = 0
      let land = 0
      for (const [dx, dy] of NEIGH8) {
        const ni = (y + dy) * size + (x + dx)
        if (isWater(ni)) water++
        else land++
      }
      if (isLand(i)) {
        if (biome[i] >= 7 && isLocalMax(data, size, x, y, 2)) {
          candidates.push({ kind: 'peak', gx: x, gy: y, priority: data[i] })
        } else if (water >= 6) {
          candidates.push({ kind: 'isle', gx: x, gy: y, priority: water })
        } else if (water >= 4) {
          candidates.push({ kind: 'cape', gx: x, gy: y, priority: water })
        } else if (water === 0 && biome[i] >= 3 && biome[i] <= 5) {
          candidates.push({ kind: 'town', gx: x, gy: y, priority: data[i] })
        }
      } else if (biome[i] === 1 && land >= 5) {
        candidates.push({ kind: 'bay', gx: x, gy: y, priority: land })
      }
    }
  }

  candidates.sort((a, b) =>
    KIND_WEIGHT[a.kind] !== KIND_WEIGHT[b.kind]
      ? KIND_WEIGHT[a.kind] - KIND_WEIGHT[b.kind]
      : b.priority - a.priority,
  )

  const total = Math.round(4 + params.labelDensity * 18)
  const minDist = size * 0.07
  const minDist2 = minDist * minDist
  const chosen: Label[] = []

  for (const c of candidates) {
    if (chosen.length >= total) break
    let tooClose = false
    for (const l of chosen) {
      const dx = l.gx - c.gx
      const dy = l.gy - c.gy
      if (dx * dx + dy * dy < minDist2) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue
    chosen.push({ kind: c.kind, name: makeName(rng, lang, c.kind), gx: c.gx, gy: c.gy })
  }

  return chosen
}
