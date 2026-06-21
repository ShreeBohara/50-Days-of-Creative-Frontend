import { create } from 'zustand'
import {
  cloneGenome,
  DEFAULT_GENOME,
  genomeFromSearch,
  normalizeGenome,
  type PlantGenomeV1,
} from '../domain/genome'

const HISTORY_LIMIT = 50

interface FloraState {
  genome: PlantGenomeV1
  past: PlantGenomeV1[]
  future: PlantGenomeV1[]
  announcement: string
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
