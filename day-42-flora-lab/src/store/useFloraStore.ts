import { create } from 'zustand'
import {
  cloneGenome,
  DEFAULT_GENOME,
  genomeFromSearch,
  normalizeGenome,
  type PlantGenomeV1,
} from '../domain/genome'
import { mutateGenome, randomGenome } from '../domain/genetics'
import {
  readCollection,
  saveSpecimen,
  writeCollection,
  type SavedSpecimen,
} from '../domain/collection'

const HISTORY_LIMIT = 50

interface FloraState {
  genome: PlantGenomeV1
  past: PlantGenomeV1[]
  future: PlantGenomeV1[]
  announcement: string
  collection: SavedSpecimen[]
  parentAId: string | null
  parentBId: string | null
  setGenome: (genome: PlantGenomeV1, announcement?: string) => void
  setArchitecture: <Key extends keyof PlantGenomeV1['architecture']>(
    key: Key,
    value: PlantGenomeV1['architecture'][Key],
  ) => void
  setFoliage: <Key extends keyof PlantGenomeV1['foliage']>(
    key: Key,
    value: PlantGenomeV1['foliage'][Key],
  ) => void
  setBloom: <Key extends keyof PlantGenomeV1['bloom']>(
    key: Key,
    value: PlantGenomeV1['bloom'][Key],
  ) => void
  setPalette: (palette: PlantGenomeV1['palette']) => void
  randomize: () => void
  mutate: () => void
  saveCurrent: () => void
  loadSpecimen: (id: string) => void
  removeSpecimen: (id: string) => void
  setParent: (slot: 'a' | 'b', id: string | null) => void
  cultivateOffspring: (genome: PlantGenomeV1) => void
  undo: () => void
  redo: () => void
  announce: (message: string) => void
}

const initial = typeof window === 'undefined'
  ? { genome: DEFAULT_GENOME, error: null }
  : genomeFromSearch(window.location.search)

function changed(before: PlantGenomeV1, after: PlantGenomeV1) {
  return JSON.stringify(before) !== JSON.stringify(after)
}

export const useFloraStore = create<FloraState>((set) => {
  const commitGenome = (nextGenome: PlantGenomeV1, announcement = 'Specimen DNA updated.') => {
    set((state) => {
      const next = normalizeGenome(nextGenome)
      if (!changed(state.genome, next)) return state

      return {
        genome: next,
        past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
        future: [],
        announcement,
      }
    })
  }

  return {
    genome: cloneGenome(initial.genome),
    past: [],
    future: [],
    announcement: initial.error ?? '',
    collection: readCollection(),
    parentAId: null,
    parentBId: null,
    setGenome: commitGenome,
    setArchitecture: (key, value) => {
      set((state) => {
        const next = cloneGenome(state.genome)
        next.architecture[key] = value
        if (!changed(state.genome, normalizeGenome(next))) return state
        return {
          genome: normalizeGenome(next),
          past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
          future: [],
          announcement: `${key} updated.`,
        }
      })
    },
    setFoliage: (key, value) => {
      set((state) => {
        const next = cloneGenome(state.genome)
        next.foliage[key] = value
        if (!changed(state.genome, normalizeGenome(next))) return state
        return {
          genome: normalizeGenome(next),
          past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
          future: [],
          announcement: `${key} updated.`,
        }
      })
    },
    setBloom: (key, value) => {
      set((state) => {
        const next = cloneGenome(state.genome)
        next.bloom[key] = value
        if (!changed(state.genome, normalizeGenome(next))) return state
        return {
          genome: normalizeGenome(next),
          past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
          future: [],
          announcement: `${key} updated.`,
        }
      })
    },
    setPalette: (palette) => {
      set((state) => {
        const next = { ...state.genome, palette }
        if (!changed(state.genome, next)) return state
        return {
          genome: next,
          past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
          future: [],
          announcement: 'Specimen pigments updated.',
        }
      })
    },
    randomize: () => commitGenome(randomGenome(), 'A new seed was generated.'),
    mutate: () => {
      set((state) => {
        const next = mutateGenome(state.genome)
        return {
          genome: next,
          past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
          future: [],
          announcement: 'A bounded mutation changed this specimen.',
        }
      })
    },
    saveCurrent: () => {
      set((state) => {
        const collection = saveSpecimen(state.collection, state.genome)
        writeCollection(collection)
        return {
          collection,
          announcement: `${state.genome.seed} was preserved in the field archive.`,
        }
      })
    },
    loadSpecimen: (id) => {
      set((state) => {
        const saved = state.collection.find((item) => item.id === id)
        if (!saved) return state
        return {
          genome: cloneGenome(saved.genome),
          past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
          future: [],
          announcement: `${saved.genome.seed} opened from the archive.`,
        }
      })
    },
    removeSpecimen: (id) => {
      set((state) => {
        const collection = state.collection.filter((item) => item.id !== id)
        writeCollection(collection)
        return {
          collection,
          parentAId: state.parentAId === id ? null : state.parentAId,
          parentBId: state.parentBId === id ? null : state.parentBId,
          announcement: 'Specimen removed from the field archive.',
        }
      })
    },
    setParent: (slot, id) => {
      set((state) => ({
        parentAId: slot === 'a' ? id : state.parentAId,
        parentBId: slot === 'b' ? id : state.parentBId,
        announcement: id ? `Parent ${slot.toUpperCase()} selected.` : `Parent ${slot.toUpperCase()} cleared.`,
      }))
    },
    cultivateOffspring: (genome) => commitGenome(genome, `${genome.seed} moved to the cultivation stage.`),
    undo: () => {
      set((state) => {
        const previous = state.past.at(-1)
        if (!previous) return state
        return {
          genome: cloneGenome(previous),
          past: state.past.slice(0, -1),
          future: [cloneGenome(state.genome), ...state.future].slice(0, HISTORY_LIMIT),
          announcement: 'Last DNA edit undone.',
        }
      })
    },
    redo: () => {
      set((state) => {
        const next = state.future[0]
        if (!next) return state
        return {
          genome: cloneGenome(next),
          past: [...state.past, cloneGenome(state.genome)].slice(-HISTORY_LIMIT),
          future: state.future.slice(1),
          announcement: 'DNA edit restored.',
        }
      })
    },
    announce: (announcement) => set({ announcement }),
  }
})
