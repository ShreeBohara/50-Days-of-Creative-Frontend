// ============================================================
// Phase machine — the whole ritual as one reducer.
//
//   veiled → intact ⇄ held → cracking → broken → fitting
//          → lacquer → gild → burnish → keep → (again) veiled
//
// A hairline crack skips the fitting: the bowl is still whole,
// so it goes straight from cracking to lacquer. LOAD_SHELF
// (opening a shared #bowl= link) jumps anywhere → keep.
//
// Illegal events return the *same* state object, so React's
// useReducer bails out of the re-render for free.
// ============================================================

import { SEVERITY } from './severity.js'

export const PHASES = Object.freeze([
  'veiled',
  'intact',
  'held',
  'cracking',
  'broken',
  'fitting',
  'lacquer',
  'gild',
  'burnish',
  'keep',
])

// The single word on screen for each phase.
export const STAGE_WORD = Object.freeze({
  veiled: '',
  intact: 'Hold.',
  held: 'Hold.',
  cracking: '',
  broken: 'Mend.',
  fitting: 'Mend.',
  lacquer: 'Lacquer.',
  gild: 'Gild.',
  burnish: 'Burnish.',
  keep: 'Keep.',
})

export function createInitialState() {
  return { phase: 'veiled', severity: null, fromShelf: false }
}

// Simple one-step edges: [phase, event] → next phase.
const EDGES = {
  veiled: { UNVEIL: 'intact' },
  intact: { LIFT: 'held' },
  held: { SET_DOWN: 'intact' },
  broken: { BEGIN_FIT: 'fitting' },
  fitting: { ALL_PLACED: 'lacquer' },
  lacquer: { LACQUER_DONE: 'gild' },
  gild: { GILD_DONE: 'burnish' },
  burnish: { BURNISH_DONE: 'keep' },
}

const BREAKING = new Set([SEVERITY.HAIRLINE, SEVERITY.DROP, SEVERITY.FLING])

export function transition(state, event) {
  const type = event?.type
  if (!state || !type) return state
  const { phase } = state

  if (type === 'LOAD_SHELF') {
    // A shelf bowl was broken by definition; ignore a bogus severity.
    const severity = BREAKING.has(event.severity) ? event.severity : state.severity
    return { ...state, phase: 'keep', fromShelf: true, severity }
  }

  if (type === 'IMPACT') {
    if (phase !== 'held' && phase !== 'intact') return state
    const sev = event.severity
    if (sev === SEVERITY.SET) return phase === 'intact' ? state : { ...state, phase: 'intact' }
    if (!BREAKING.has(sev)) return state
    return { ...state, phase: 'cracking', severity: sev }
  }

  if (type === 'CRACK_DONE') {
    if (phase !== 'cracking') return state
    return { ...state, phase: state.severity === SEVERITY.HAIRLINE ? 'lacquer' : 'broken' }
  }

  if (type === 'BEGIN_AGAIN') {
    return phase === 'keep' ? createInitialState() : state
  }

  // Own keys only: an event named 'toString' or 'constructor' must
  // not find Object.prototype and turn into a phase.
  const edges = Object.hasOwn(EDGES, phase) ? EDGES[phase] : null
  const next = edges && Object.hasOwn(edges, type) ? edges[type] : null
  return next ? { ...state, phase: next } : state
}
