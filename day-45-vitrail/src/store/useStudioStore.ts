import { create } from 'zustand'
import {
  clampGenome,
  defaultGenome,
  mutateGenome,
  randomGenome,
  type WindowGenome,
} from '../domain/genome'
import { createRng, makeSeedToken } from '../domain/random'

const HISTORY_LIMIT = 60
const COALESCE_MS = 700

/** Numeric genes the sliders drive (no reveal replay). */
export type NumericGene = 'rings' | 'density' | 'leadWidth' | 'jitter'

export interface StudioState {
  genome: WindowGenome
  drawKey: number
  activePresetId: string | null

  past: WindowGenome[]
  future: WindowGenome[]
  lastTag: string | null
  lastTs: number

  // live edits — glass updates in place
  setGene: (key: NumericGene, value: number, tag?: string) => void
  // categorical swaps — replay the illumination
  setChoice: (patch: Partial<WindowGenome>) => void

  setSeed: (seed: string) => void
  loadGenome: (next: WindowGenome, presetId?: string) => void
  reseed: () => void
  randomize: () => void
  mutateCurrent: (amount?: number) => void
  reset: () => void
  replay: () => void

  undo: () => void
  redo: () => void
}

interface Commit {
  genome: WindowGenome
  past: WindowGenome[]
  future: WindowGenome[]
  lastTag: string | null
  lastTs: number
}

/** Push the previous window onto the undo stack, coalescing rapid same-tag edits. */
function commit(state: StudioState, next: WindowGenome, tag?: string): Commit {
  const now = Date.now()
  const coalesce = tag != null && tag === state.lastTag && now - state.lastTs < COALESCE_MS
  const past = coalesce ? state.past : [...state.past, state.genome].slice(-HISTORY_LIMIT)
  return { genome: next, past, future: [], lastTag: tag ?? null, lastTs: now }
}

export const useStudioStore = create<StudioState>((set) => ({
  genome: defaultGenome(),
  drawKey: 0,
  activePresetId: null,
  past: [],
  future: [],
  lastTag: null,
  lastTs: 0,

  setGene: (key, value, tag) =>
    set((state) => ({
      ...commit(state, clampGenome({ ...state.genome, [key]: value }), tag),
      activePresetId: null,
    })),

  setChoice: (patch) =>
    set((state) => ({
      // per-field tag: scrubbing one dropdown coalesces, switching fields doesn't
      ...commit(state, clampGenome({ ...state.genome, ...patch }), `choice:${Object.keys(patch).join(',')}`),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  setSeed: (seed) =>
    set((state) => {
      const trimmed = seed.trim()
      if (!trimmed || trimmed === state.genome.seed) return state
      return {
        ...commit(state, clampGenome({ ...state.genome, seed: trimmed })),
        drawKey: state.drawKey + 1,
        activePresetId: null,
      }
    }),

  loadGenome: (next, presetId) =>
    set((state) => ({
      ...commit(state, clampGenome(next)),
      drawKey: state.drawKey + 1,
      activePresetId: presetId ?? null,
    })),

  reseed: () =>
    set((state) => ({
      ...commit(state, { ...state.genome, seed: makeSeedToken() }),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  randomize: () =>
    set((state) => ({
      ...commit(state, randomGenome(createRng(makeSeedToken()))),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  mutateCurrent: (amount = 0.55) =>
    set((state) => ({
      ...commit(state, mutateGenome(state.genome, amount, makeSeedToken())),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  reset: () =>
    set((state) => ({
      ...commit(state, defaultGenome()),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  replay: () => set((state) => ({ drawKey: state.drawKey + 1 })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state
      const past = state.past.slice(0, -1)
      const previous = state.past[state.past.length - 1]
      return {
        genome: previous,
        past,
        future: [state.genome, ...state.future].slice(0, HISTORY_LIMIT),
        lastTag: null,
        lastTs: 0,
        drawKey: state.drawKey + 1,
        activePresetId: null,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state
      const [next, ...future] = state.future
      return {
        genome: next,
        past: [...state.past, state.genome].slice(-HISTORY_LIMIT),
        future,
        lastTag: null,
        lastTs: 0,
        drawKey: state.drawKey + 1,
        activePresetId: null,
      }
    }),
}))
