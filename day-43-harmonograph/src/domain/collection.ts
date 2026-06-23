import type { HarmonographParams } from './harmonograph'
import { makeSeedToken } from './random'

export interface SavedFigure {
  id: string
  name: string
  params: HarmonographParams
  paletteId: string
  createdAt: number
}

export interface KeyValueStore {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

const STORAGE_KEY = 'pendula.collection.v1'

export function createSavedFigure(
  name: string,
  params: HarmonographParams,
  paletteId: string,
): SavedFigure {
  return {
    id: `fig-${makeSeedToken()}${Date.now().toString(36)}`,
    name,
    params: structuredClone(params),
    paletteId,
    createdAt: Date.now(),
  }
}

// — pure list operations —

export function addFigure(list: SavedFigure[], figure: SavedFigure): SavedFigure[] {
  return [figure, ...list]
}

export function removeFigure(list: SavedFigure[], id: string): SavedFigure[] {
  return list.filter((f) => f.id !== id)
}

export function renameFigure(list: SavedFigure[], id: string, name: string): SavedFigure[] {
  const clean = name.trim()
  if (!clean) return list
  return list.map((f) => (f.id === id ? { ...f, name: clean } : f))
}

// — persistence —

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function isValid(f: unknown): f is SavedFigure {
  return (
    typeof f === 'object' &&
    f !== null &&
    typeof (f as SavedFigure).id === 'string' &&
    typeof (f as SavedFigure).name === 'string' &&
    typeof (f as SavedFigure).params === 'object'
  )
}

export function loadCollection(store: KeyValueStore | null = defaultStore()): SavedFigure[] {
  if (!store) return []
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(isValid) : []
  } catch {
    return []
  }
}

export function saveCollection(
  list: SavedFigure[],
  store: KeyValueStore | null = defaultStore(),
): void {
  if (!store) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* quota or serialization failure — ignore, collection is non-critical */
  }
}
