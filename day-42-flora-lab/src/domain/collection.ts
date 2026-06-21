import { encodeGenome, normalizeGenome, type PlantGenomeV1 } from './genome'

export const COLLECTION_STORAGE_KEY = 'flora-lab:v1'
export const COLLECTION_LIMIT = 12

export interface SavedSpecimen {
  id: string
  savedAt: string
  genome: PlantGenomeV1
}

interface PersistedCollection {
  version: 1
  specimens: SavedSpecimen[]
}

export type CollectionStorage = Pick<Storage, 'getItem' | 'setItem'>

function availableStorage(): CollectionStorage | null {
  if (typeof window === 'undefined') return null
  const storage = window.localStorage
  return typeof storage?.getItem === 'function' && typeof storage?.setItem === 'function' ? storage : null
}

function validDate(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

export function readCollection(storage: CollectionStorage | null = availableStorage()): SavedSpecimen[] {
  if (!storage) return []

  try {
    const raw = storage.getItem(COLLECTION_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { version?: unknown; specimens?: unknown }
    if (parsed.version !== 1 || !Array.isArray(parsed.specimens)) return []

    return parsed.specimens.flatMap((candidate) => {
      if (!candidate || typeof candidate !== 'object') return []
      const value = candidate as Record<string, unknown>
      if (typeof value.id !== 'string' || !validDate(value.savedAt)) return []
      return [{
        id: value.id,
        savedAt: value.savedAt as string,
        genome: normalizeGenome(value.genome),
      }]
    }).slice(0, COLLECTION_LIMIT)
  } catch {
    return []
  }
}

export function writeCollection(specimens: SavedSpecimen[], storage: CollectionStorage | null = availableStorage()) {
  if (!storage) return
  const payload: PersistedCollection = {
    version: 1,
    specimens: specimens.slice(0, COLLECTION_LIMIT),
  }

  try {
    storage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // The app continues in-memory when storage is blocked or full.
  }
}

export function saveSpecimen(collection: SavedSpecimen[], genome: PlantGenomeV1): SavedSpecimen[] {
  const dna = encodeGenome(genome)
  const withoutDuplicate = collection.filter((item) => encodeGenome(item.genome) !== dna)
  const savedAt = new Date().toISOString()
  const suffix = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return [{ id: `flora-${suffix}`, savedAt, genome: structuredClone(genome) }, ...withoutDuplicate]
    .slice(0, COLLECTION_LIMIT)
}
