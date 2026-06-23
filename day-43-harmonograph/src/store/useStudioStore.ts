import { create } from 'zustand'
import type { Preset } from '../data/presets'
import { createDefaultParams } from '../domain/defaults'
import type { HarmonographParams, Pendulum } from '../domain/harmonograph'
import { mutate, randomFigure } from '../domain/mutate'
import { makeSeedToken } from '../domain/random'
import { DEFAULT_PALETTE } from '../domain/palettes'

export type Axis = 'x' | 'y'

const HISTORY_LIMIT = 60
const COALESCE_MS = 700

export interface StudioState {
  params: HarmonographParams
  paletteId: string
  lineWidth: number
  glow: number
  drawKey: number
  activePresetId: string | null

  past: HarmonographParams[]
  future: HarmonographParams[]
  lastTag: string | null
  lastTs: number

  // figure geometry — live edits (no draw replay)
  setPendulum: (axis: Axis, index: number, patch: Partial<Pendulum>, tag?: string) => void
  setTiming: (patch: Partial<Pick<HarmonographParams, 'duration' | 'steps'>>, tag?: string) => void
  // whole-figure swaps — replay the draw
  loadParams: (next: HarmonographParams) => void
  loadPreset: (preset: Preset) => void
  randomize: () => void
  mutateCurrent: (amount?: number) => void
  reset: () => void

  // render-only (not part of the figure / history)
  setPaletteId: (id: string) => void
  setLineWidth: (v: number) => void
  setGlow: (v: number) => void

  replay: () => void
  undo: () => void
  redo: () => void
}

interface Commit {
  params: HarmonographParams
  past: HarmonographParams[]
  future: HarmonographParams[]
  lastTag: string | null
  lastTs: number
}

/** Push the previous figure onto the undo stack, coalescing rapid same-tag edits. */
function commit(state: StudioState, next: HarmonographParams, tag?: string): Commit {
  const now = Date.now()
  const coalesce = tag != null && tag === state.lastTag && now - state.lastTs < COALESCE_MS
  const past = coalesce ? state.past : [...state.past, state.params].slice(-HISTORY_LIMIT)
  return { params: next, past, future: [], lastTag: tag ?? null, lastTs: now }
}

export const useStudioStore = create<StudioState>((set) => ({
  params: createDefaultParams(),
  paletteId: DEFAULT_PALETTE.id,
  lineWidth: 2.4,
  glow: 1,
  drawKey: 0,
  activePresetId: null,
  past: [],
  future: [],
  lastTag: null,
  lastTs: 0,

  setPendulum: (axis, index, patch, tag) =>
    set((state) => {
      const arr = state.params[axis].map((p, i) => (i === index ? { ...p, ...patch } : p))
      const next = { ...state.params, [axis]: arr }
      return { ...commit(state, next, tag), activePresetId: null }
    }),

  setTiming: (patch, tag) =>
    set((state) => ({
      ...commit(state, { ...state.params, ...patch }, tag),
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
      paletteId: preset.paletteId,
      drawKey: state.drawKey + 1,
      activePresetId: preset.id,
    })),

  randomize: () =>
    set((state) => ({
      ...commit(state, randomFigure(makeSeedToken())),
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

  setPaletteId: (id) => set({ paletteId: id }),
  setLineWidth: (v) => set({ lineWidth: v }),
  setGlow: (v) => set({ glow: v }),

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
