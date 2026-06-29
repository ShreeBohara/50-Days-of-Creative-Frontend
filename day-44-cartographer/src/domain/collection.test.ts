import { describe, expect, it } from 'vitest'
import { createDefaultParams } from './defaults'
import {
  addWorld,
  createSavedWorld,
  loadCollection,
  removeWorld,
  renameWorld,
  saveCollection,
  type KeyValueStore,
  type SavedWorld,
} from './collection'

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v)
    },
  }
}

describe('collection list ops', () => {
  it('adds newest-first and removes by id', () => {
    const a = createSavedWorld('A', createDefaultParams())
    const b = createSavedWorld('B', createDefaultParams())
    let list: SavedWorld[] = []
    list = addWorld(list, a)
    list = addWorld(list, b)
    expect(list.map((w) => w.name)).toEqual(['B', 'A'])
    expect(removeWorld(list, a.id).map((w) => w.name)).toEqual(['B'])
  })

  it('renames, ignoring blank names', () => {
    const w = createSavedWorld('Old', createDefaultParams())
    expect(renameWorld([w], w.id, 'New')[0].name).toBe('New')
    expect(renameWorld([w], w.id, '   ')[0].name).toBe('Old')
  })

  it('createSavedWorld deep-copies params', () => {
    const params = createDefaultParams()
    const w = createSavedWorld('X', params)
    params.seaLevel = 0.99
    expect(w.params.seaLevel).not.toBe(0.99)
  })
})

describe('collection persistence', () => {
  it('round-trips through a key-value store', () => {
    const store = memoryStore()
    const list = [createSavedWorld('One', createDefaultParams())]
    saveCollection(list, store)
    const loaded = loadCollection(store)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('One')
  })

  it('returns an empty list for missing or invalid data', () => {
    const store = memoryStore()
    expect(loadCollection(store)).toEqual([])
    store.setItem('meridian.atlas.v1', 'not json')
    expect(loadCollection(store)).toEqual([])
    store.setItem('meridian.atlas.v1', JSON.stringify([{ junk: true }]))
    expect(loadCollection(store)).toEqual([])
  })
})
