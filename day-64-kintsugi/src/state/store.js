// A tiny external store for the coarse, React-visible state (phase, stage
// word, tool in hand, progress numbers). Anything that changes every frame —
// body poses, seam fills, particle positions — lives in the mutable `rt`
// runtime object instead and never triggers a render.

import { useSyncExternalStore } from 'react'
import { transition } from '../logic/stateMachine.js'
import { addToShelf, loadShelf, recordFor } from './shelf.js'

function createStore(initial) {
  let state = initial
  const subs = new Set()
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch
      if (!next) return
      let changed = false
      for (const k in next) {
        if (state[k] !== next[k]) {
          changed = true
          break
        }
      }
      if (!changed) return
      state = { ...state, ...next }
      subs.forEach((fn) => fn())
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

export const store = createStore({
  phase: 'veiled',
  severity: null,
  variant: null, // e.g. 'Z2_drop'
  tool: null, // null | 'brush' | 'jar' | 'burnisher'
  pieces: 0,
  placed: 0,
  progress: 0, // 0..1 for the current craft stage (lacquer / gild / burnish)
  hint: null, // short secondary line under the stage word
  loaded: false,
  physicsReady: false,
  announce: '', // aria-live text
  keepRecord: null, // the shelf record once kept
  shelf: loadShelf(),
  run: 0, // bumped by "begin again" — the whole stage remounts fresh
})

// Select a primitive (or a stable reference) — never build objects in `sel`.
export function useStore(sel) {
  return useSyncExternalStore(store.subscribe, () => sel(store.get()))
}

// Phase changes go through the pure state machine so illegal jumps are no-ops.
export function dispatch(event) {
  const s = store.get()
  const next = transition({ phase: s.phase, severity: s.severity }, event)
  if (next.phase === s.phase && next.severity === s.severity) return false
  store.set({ phase: next.phase, severity: next.severity ?? s.severity })
  return true
}

export function announce(text) {
  // re-announce identical strings by toggling a zero-width suffix
  const prev = store.get().announce
  store.set({ announce: text === prev.replace(/\u200b$/, '') ? text + '\u200b' : text })
}

/** Keep: record the mended bowl, put it on the shelf. */
export function keepBowl() {
  const s = store.get()
  const hairline = s.severity === 'hairline'
  const seams = rt.craft?.seams ?? []
  const goldMm = seams.reduce((a, x) => a + x.length, 0) * 1000
  try {
    const entry = recordFor({
      variant: s.variant,
      order: rt.fit?.order ?? [],
      pieces: hairline ? 1 : s.pieces,
      goldMm,
      hairline,
    })
    store.set({ keepRecord: entry, shelf: addToShelf(entry) })
  } catch (err) {
    console.warn('could not keep this bowl', err)
  }
}

/** Begin again: fresh store state and a remounted stage (new physics world). */
export function beginAgain() {
  rt.clock.scale = 1
  rt.variant = null
  rt.activeSeams = null
  rt.shardBodies = null
  rt.shardMeshes = null
  rt.seams = null
  rt.lastImpact = null
  store.set((s) => ({
    phase: 'veiled',
    severity: null,
    variant: null,
    tool: null,
    pieces: 0,
    placed: 0,
    progress: 0,
    hint: null,
    keepRecord: null,
    run: s.run + 1,
  }))
}

// The mutable runtime shared by scene components (never read during render).
export const rt = {
  clock: { scale: 1 }, // physics time scale (bullet time)
  bowl: null, // { body, mesh, group }
  held: null, // pointer-hold state for the intact bowl or a shard
  lastVel: [0, 0, 0],
  variant: null, // loaded seam json + prepared seams
  shards: new Map(), // id -> { body, object, home, placed }
  anchor: null, // THREE.Group the mended bowl is assembled in
  seamState: null, // Float32Array per-seam [fill, gold, polish, wet]
  camera: null,
  pointer: { x: 0, y: 0, down: false },
  debug: {},
}
