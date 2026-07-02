// Saved-window collection, persisted to localStorage. Pure list helpers stay
// separate from the storage IO so they are trivially testable.

import { clampGenome, type WindowGenome } from './genome'
import { makeSeedToken } from './random'

export interface SavedWindow {
  id: string
  name: string
  genome: WindowGenome
  savedAt: number
}

const STORAGE_KEY = 'vitrail:collection:v1'
const LIMIT = 24

export function createSavedWindow(name: string, genome: WindowGenome, now = Date.now()): SavedWindow {
  return {
    id: `w-${now.toString(36)}-${makeSeedToken()}`,
    name: name.trim() || genome.seed,
    genome: clampGenome(genome),
    savedAt: now,
  }
}

export function addWindow(list: SavedWindow[], window: SavedWindow): SavedWindow[] {
  return [window, ...list].slice(0, LIMIT)
}

export function renameWindow(list: SavedWindow[], id: string, name: string): SavedWindow[] {
  const trimmed = name.trim()
  if (!trimmed) return list
  return list.map((w) => (w.id === id ? { ...w, name: trimmed } : w))
}

export function removeWindow(list: SavedWindow[], id: string): SavedWindow[] {
  return list.filter((w) => w.id !== id)
}

export function loadCollection(storage: Pick<Storage, 'getItem'> = localStorage): SavedWindow[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (w): w is SavedWindow =>
          typeof w === 'object' && w !== null && typeof (w as SavedWindow).id === 'string',
      )
      .map((w) => ({
        id: w.id,
        name: typeof w.name === 'string' && w.name.trim() ? w.name : 'Unnamed window',
        genome: clampGenome(w.genome ?? {}),
        savedAt: typeof w.savedAt === 'number' ? w.savedAt : 0,
      }))
      .slice(0, LIMIT)
  } catch {
    return []
  }
}

export function saveCollection(list: SavedWindow[], storage: Pick<Storage, 'setItem'> = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // storage may be unavailable (private mode); the session copy still works
  }
}
