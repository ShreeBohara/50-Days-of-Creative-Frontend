import { beforeEach, describe, expect, it } from 'vitest'
import {
  addWindow,
  createSavedWindow,
  loadCollection,
  removeWindow,
  renameWindow,
  saveCollection,
  type SavedWindow,
} from './collection'
import { defaultGenome } from './genome'

describe('collection', () => {
  beforeEach(() => localStorage.clear())

  it('creates saved windows with unique ids and fallback names', () => {
    const a = createSavedWindow('', defaultGenome())
    const b = createSavedWindow('  ', defaultGenome())
    expect(a.id).not.toBe(b.id)
    expect(a.name).toBe(defaultGenome().seed)
  })

  it('adds to the front and caps the list', () => {
    let list: SavedWindow[] = []
    for (let i = 0; i < 30; i++) {
      list = addWindow(list, createSavedWindow(`w${i}`, defaultGenome(), i))
    }
    expect(list).toHaveLength(24)
    expect(list[0].name).toBe('w29')
  })

  it('renames and removes by id', () => {
    const w = createSavedWindow('rose', defaultGenome())
    let list = addWindow([], w)
    list = renameWindow(list, w.id, 'Vesper Rose')
    expect(list[0].name).toBe('Vesper Rose')
    list = renameWindow(list, w.id, '   ')
    expect(list[0].name).toBe('Vesper Rose')
    expect(removeWindow(list, w.id)).toHaveLength(0)
  })

  it('round-trips through localStorage', () => {
    const w = createSavedWindow('kept', defaultGenome())
    saveCollection([w])
    const loaded = loadCollection()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('kept')
    expect(loaded[0].genome).toEqual(defaultGenome())
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('vitrail:collection:v1', '{nope')
    expect(loadCollection()).toEqual([])
    localStorage.setItem('vitrail:collection:v1', JSON.stringify({ not: 'a list' }))
    expect(loadCollection()).toEqual([])
  })

  it('clamps genomes from old versions of the app', () => {
    const w = createSavedWindow('old', defaultGenome())
    const tampered = [{ ...w, genome: { ...w.genome, rings: 99, paletteId: 'gone' } }]
    localStorage.setItem('vitrail:collection:v1', JSON.stringify(tampered))
    const loaded = loadCollection()
    expect(loaded[0].genome.rings).toBe(6)
    expect(loaded[0].genome.paletteId).toBe('chartres')
  })
})
