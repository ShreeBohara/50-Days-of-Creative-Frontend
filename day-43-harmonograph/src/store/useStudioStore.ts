import { create } from 'zustand'
import { createDefaultParams } from '../domain/defaults'
import type { HarmonographParams, Pendulum } from '../domain/harmonograph'
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

  past: HarmonographParams[]
  future: HarmonographParams[]
  lastTag: string | null
  lastTs: number

  // figure geometry — live edits (no draw replay)
  setPendulum: (axis: Axis, index: number, patch: Partial<Pendulum>, tag?: string) => void
  setTiming: (patch: Partial<Pick<HarmonographParams, 'duration' | 'steps'>>, tag?: string) => void
  // whole-figure swaps — replay the draw
  loadParams: (next: HarmonographParams) => void
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
  past: [],
  future: [],
  lastTag: null,
  lastTs: 0,

  setPendulum: (axis, index, patch, tag) =>
    set((state) => {
      const arr = state.params[axis].map((p, i) => (i === index ? { ...p, ...patch } : p))
      const next = { ...state.params, [axis]: arr }
      return commit(state, next, tag)
    }),

  setTiming: (patch, tag) =>
    set((state) => commit(state, { ...state.params, ...patch }, tag)),

  loadParams: (next) =>
    set((state) => ({
      ...commit(state, next),
      drawKey: state.drawKey + 1,
    })),

  reset: () =>
    set((state) => ({
      ...commit(state, createDefaultParams()),
      drawKey: state.drawKey + 1,
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
      }
    }),
}))
