import { makeSeedToken } from './random'
import type { WorldParams } from './world'

// Saved worlds, persisted to localStorage. The genome already carries the
// palette and language, so a SavedWorld is just a named set of params.

export interface SavedWorld {
  id: string
  name: string
  params: WorldParams
  createdAt: number
}

export interface KeyValueStore {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

const STORAGE_KEY = 'meridian.atlas.v1'

export function createSavedWorld(name: string, params: WorldParams): SavedWorld {
  return {
    id: `world-${makeSeedToken()}${Date.now().toString(36)}`,
    name,
    params: structuredClone(params),
    createdAt: Date.now(),
  }
}

// — pure list operations —

export function addWorld(list: SavedWorld[], world: SavedWorld): SavedWorld[] {
  return [world, ...list]
}

export function removeWorld(list: SavedWorld[], id: string): SavedWorld[] {
  return list.filter((w) => w.id !== id)
}

export function renameWorld(list: SavedWorld[], id: string, name: string): SavedWorld[] {
  const clean = name.trim()
  if (!clean) return list
  return list.map((w) => (w.id === id ? { ...w, name: clean } : w))
}

// — persistence —

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function isValid(w: unknown): w is SavedWorld {
  return (
    typeof w === 'object' &&
    w !== null &&
    typeof (w as SavedWorld).id === 'string' &&
    typeof (w as SavedWorld).name === 'string' &&
    typeof (w as SavedWorld).params === 'object'
  )
}

export function loadCollection(store: KeyValueStore | null = defaultStore()): SavedWorld[] {
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
  list: SavedWorld[],
  store: KeyValueStore | null = defaultStore(),
): void {
  if (!store) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* quota or serialization failure — ignore, collection is non-critical */
  }
}
