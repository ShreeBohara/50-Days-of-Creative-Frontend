import { describe, expect, it } from 'vitest'
import { createDefaultParams } from './defaults'
import {
  addFigure,
  createSavedFigure,
  loadCollection,
  removeFigure,
  renameFigure,
  saveCollection,
  type KeyValueStore,
  type SavedFigure,
} from './collection'

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  }
}

function fig(name: string): SavedFigure {
  return createSavedFigure(name, createDefaultParams(), 'ember')
}

describe('collection list operations', () => {
  it('prepends new figures', () => {
    const a = fig('A')
    const b = fig('B')
    const list = addFigure(addFigure([], a), b)
    expect(list.map((f) => f.name)).toEqual(['B', 'A'])
  })

  it('removes by id', () => {
    const a = fig('A')
    const b = fig('B')
    expect(removeFigure([a, b], a.id)).toEqual([b])
  })

  it('renames a matching figure only', () => {
    const a = fig('A')
    const b = fig('B')
    const out = renameFigure([a, b], a.id, 'Renamed')
    expect(out[0].name).toBe('Renamed')
    expect(out[1].name).toBe('B')
  })

  it('ignores blank rename', () => {
    const a = fig('A')
    expect(renameFigure([a], a.id, '   ')).toEqual([a])
  })

  it('snapshots params by value (independent copy)', () => {
    const params = createDefaultParams()
    const saved = createSavedFigure('Copy', params, 'aurora')
    params.x[0].freq = 99
    expect(saved.params.x[0].freq).not.toBe(99)
  })
})

describe('collection persistence', () => {
  it('round-trips through a key-value store', () => {
    const store = memoryStore()
    const list = [fig('One'), fig('Two')]
    saveCollection(list, store)
    expect(loadCollection(store)).toEqual(list)
  })

  it('returns empty for missing or invalid data', () => {
    const store = memoryStore()
    expect(loadCollection(store)).toEqual([])
    store.setItem('pendula.collection.v1', '{not json')
    expect(loadCollection(store)).toEqual([])
    store.setItem('pendula.collection.v1', JSON.stringify([{ bogus: true }]))
    expect(loadCollection(store)).toEqual([])
  })
})
