// A tiny external store for the coarse, React-visible state. Anything that
// changes every frame (leaf angles, mechanism values, poses) lives in the
// mutable `rt` runtime object and never triggers a render.

import { useSyncExternalStore } from 'react'

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
  ready: false, // first spread printed, the book can open
  spread: -1, // open spread (−1 = shut)
  bookplate: null, // day number whose card is open
  xray: false, // the paper engineer's view
  muted: false,
  hint: null, // a short line of guidance
  announce: '', // aria-live text
  cursor: 'default',
  drawing: false, // pencil on the blank last page
  strokes: 0, // strokes drawn there
  contents: false, // contents drawer open
})

// Select a primitive (or a stable reference) — never build objects in `sel`.
export function useStore(sel) {
  return useSyncExternalStore(store.subscribe, () => sel(store.get()))
}

/** Mutable per-frame runtime, shared by the scene and the input layer. */
export const rt = {
  tier: 'A',
  reduced: false,
  book: null, // book model (src/book/model.js)
  view: null, // three.js book (src/scene/bookView.js)
  ctl: null, // controller (src/book/controller.js)
  camera: null,
  gl: null,
  pointer: { x: 0, y: 0, inside: false },
}
