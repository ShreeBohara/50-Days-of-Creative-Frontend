import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_GENOME } from './genome'
import {
  COLLECTION_LIMIT,
  COLLECTION_STORAGE_KEY,
  readCollection,
  saveSpecimen,
  writeCollection,
} from './collection'

const values = new Map<string, string>()
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value) },
}

describe('field archive persistence', () => {
  beforeEach(() => values.clear())

  it('round trips a saved collection', () => {
    const collection = saveSpecimen([], DEFAULT_GENOME)
    writeCollection(collection, storage)
    expect(readCollection(storage)).toEqual(collection)
  })

  it('deduplicates matching DNA and caps the archive', () => {
    let collection = saveSpecimen([], DEFAULT_GENOME)
    collection = saveSpecimen(collection, DEFAULT_GENOME)
    expect(collection).toHaveLength(1)

    for (let index = 0; index < COLLECTION_LIMIT + 5; index += 1) {
      collection = saveSpecimen(collection, { ...DEFAULT_GENOME, seed: `seed-${index}` })
    }
    expect(collection).toHaveLength(COLLECTION_LIMIT)
    expect(collection[0].genome.seed).toBe(`seed-${COLLECTION_LIMIT + 4}`)
  })

  it('returns an empty archive for malformed storage', () => {
    storage.setItem(COLLECTION_STORAGE_KEY, '{not-json')
    expect(readCollection(storage)).toEqual([])
  })
})
