import { create } from 'zustand'
import type { ViewOptions } from '../components/MapCanvas'
import type { Preset } from '../data/presets'
import {
  addWorld,
  createSavedWorld,
  loadCollection,
  removeWorld,
  renameWorld,
  saveCollection,
  type SavedWorld,
} from '../domain/collection'
import { createDefaultParams } from '../domain/defaults'
import { mutate, randomWorld } from '../domain/mutate'
import { makeSeedToken } from '../domain/random'
import type { WorldParams } from '../domain/world'

const HISTORY_LIMIT = 60
const COALESCE_MS = 700

/** Numeric genes that the sliders drive. */
export type GeneKey =
  | 'seaLevel'
  | 'relief'
  | 'octaves'
  | 'persistence'
  | 'mountainBias'
  | 'islandBias'
  | 'rivers'
  | 'labelDensity'

export interface StudioState {
  params: WorldParams
  view: ViewOptions
  drawKey: number
  activePresetId: string | null
  collection: SavedWorld[]

  past: WorldParams[]
  future: WorldParams[]
  lastTag: string | null
  lastTs: number

  // live genome edits (no draw replay)
  setGene: (key: GeneKey, value: number, tag?: string) => void
  setCategory: (patch: Partial<Pick<WorldParams, 'biomePaletteId' | 'languageId'>>) => void

  // whole-world swaps (replay the coastline draw)
  setSeed: (seed: string) => void
  loadParams: (next: WorldParams) => void
  loadPreset: (preset: Preset) => void
  reseed: () => void
  randomize: () => void
  mutateCurrent: (amount?: number) => void
  reset: () => void

  // saved collection (persisted)
  saveCurrent: (name?: string) => void
  loadSaved: (id: string) => void
  renameSaved: (id: string, name: string) => void
  deleteSaved: (id: string) => void

  // render-only
  setView: (patch: Partial<ViewOptions>) => void
  replay: () => void

  undo: () => void
  redo: () => void
}

interface Commit {
  params: WorldParams
  past: WorldParams[]
  future: WorldParams[]
  lastTag: string | null
  lastTs: number
}

/** Push the previous world onto the undo stack, coalescing rapid same-tag edits. */
function commit(state: StudioState, next: WorldParams, tag?: string): Commit {
  const now = Date.now()
  const coalesce = tag != null && tag === state.lastTag && now - state.lastTs < COALESCE_MS
  const past = coalesce ? state.past : [...state.past, state.params].slice(-HISTORY_LIMIT)
  return { params: next, past, future: [], lastTag: tag ?? null, lastTs: now }
}

export const DEFAULT_VIEW: ViewOptions = {
  contours: true,
  rivers: true,
  labels: true,
  graticule: true,
}

export const useStudioStore = create<StudioState>((set) => ({
  params: createDefaultParams(),
  view: { ...DEFAULT_VIEW },
  drawKey: 0,
  activePresetId: null,
  collection: loadCollection(),
  past: [],
  future: [],
  lastTag: null,
  lastTs: 0,

  setGene: (key, value, tag) =>
    set((state) => ({
      ...commit(state, { ...state.params, [key]: value }, tag),
      activePresetId: null,
    })),

  setCategory: (patch) =>
    set((state) => ({
      ...commit(state, { ...state.params, ...patch }, 'category'),
      activePresetId: null,
    })),

  setSeed: (seed) =>
    set((state) => ({
      ...commit(state, { ...state.params, seed }),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  loadParams: (next) =>
    set((state) => ({
      ...commit(state, next),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  loadPreset: (preset) =>
    set((state) => ({
      ...commit(state, structuredClone(preset.params)),
      drawKey: state.drawKey + 1,
      activePresetId: preset.id,
    })),

  reseed: () =>
    set((state) => ({
      ...commit(state, { ...state.params, seed: makeSeedToken() }),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  randomize: () =>
    set((state) => ({
      ...commit(state, randomWorld(makeSeedToken())),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  mutateCurrent: (amount) =>
    set((state) => ({
      ...commit(state, mutate(state.params, makeSeedToken(), amount)),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  reset: () =>
    set((state) => ({
      ...commit(state, createDefaultParams()),
      drawKey: state.drawKey + 1,
      activePresetId: null,
    })),

  saveCurrent: (name) =>
    set((state) => {
      const label = name?.trim() || state.params.seed
      const world = createSavedWorld(label, state.params)
      const collection = addWorld(state.collection, world)
      saveCollection(collection)
      return { collection }
    }),

  loadSaved: (id) =>
    set((state) => {
      const world = state.collection.find((w) => w.id === id)
      if (!world) return state
      return {
        ...commit(state, structuredClone(world.params)),
        drawKey: state.drawKey + 1,
        activePresetId: null,
      }
    }),

  renameSaved: (id, name) =>
    set((state) => {
      const collection = renameWorld(state.collection, id, name)
      saveCollection(collection)
      return { collection }
    }),

  deleteSaved: (id) =>
    set((state) => {
      const collection = removeWorld(state.collection, id)
      saveCollection(collection)
      return { collection }
    }),

  setView: (patch) => set((state) => ({ view: { ...state.view, ...patch } })),

  replay: () => set((state) => ({ drawKey: state.drawKey + 1 })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state
      const past = state.past.slice(0, -1)
      const previous = state.past[state.past.length - 1]
      return {
        params: previous,
        past,
        future: [state.params, ...state.future].slice(0, HISTORY_LIMIT),
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
        params: next,
        past: [...state.past, state.params].slice(-HISTORY_LIMIT),
        future,
        lastTag: null,
        lastTs: 0,
        drawKey: state.drawKey + 1,
        activePresetId: null,
      }
    }),
}))
