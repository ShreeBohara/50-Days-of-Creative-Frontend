// Poster state — a plain object and pure transition functions. Nothing here
// touches the DOM or Math.random directly (randomness is injected), so the
// reroll / lock semantics are unit-testable.
import { randomBits } from "./rng.js";
import { CURATED_PALETTES, chooseDifferentPalette, curatedIndex } from "./palettes.js";
import { DEFAULT_SYSTEM, SYSTEM_IDS } from "./systems/index.js";

export const LAYOUT_BITS = 20;
export const PALETTE_BITS = 15;
export const HEADLINE_MAX = 40;
export const LINE_MAX = 60;
export const DEFAULT_TEXT = Object.freeze({ headline: "VOLTAGE", subline: "", date: "" });

export function createInitialState(random = Math.random) {
  return {
    system: DEFAULT_SYSTEM,
    layoutSeed: randomBits(random, LAYOUT_BITS),
    palette: { mode: "curated", id: CURATED_PALETTES[0].id },
    text: { ...DEFAULT_TEXT },
    finish: { grain: 0.35, paper: true },
    locks: { palette: false, layout: false },
  };
}

export function canReroll(state) {
  return !(state.locks.palette && state.locks.layout);
}

/**
 * Reroll = new composition + new palette identity, each independently
 * freezable by its lock. Never changes system, text, finish or palette mode.
 * Draw order is fixed (layout first, then palette) so tests can inject a
 * scripted random source.
 */
export function reroll(state, random = Math.random) {
  if (!canReroll(state)) return state;
  const next = { ...state };
  if (!state.locks.layout) next.layoutSeed = randomBits(random, LAYOUT_BITS);
  if (!state.locks.palette) {
    next.palette = state.palette.mode === "seeded"
      ? { mode: "seeded", seed: randomBits(random, PALETTE_BITS) }
      : { mode: "curated", id: chooseDifferentPalette(state.palette.id, random) };
  }
  return next;
}

export function setSystem(state, system) {
  if (!SYSTEM_IDS.includes(system) || system === state.system) return state;
  return { ...state, system };
}

export function setLayoutSeed(state, layoutSeed) {
  const seed = Number(layoutSeed);
  if (!Number.isInteger(seed) || seed < 0 || seed >= 2 ** LAYOUT_BITS) return state;
  return { ...state, layoutSeed: seed };
}

export function setPalette(state, palette) {
  if (!palette) return state;
  if (palette.mode === "seeded") {
    const seed = Number(palette.seed);
    if (!Number.isInteger(seed) || seed < 0 || seed >= 2 ** PALETTE_BITS) return state;
    return { ...state, palette: { mode: "seeded", seed } };
  }
  if (palette.mode === "curated") {
    const id = CURATED_PALETTES[curatedIndex(palette.id)].id;
    return { ...state, palette: { mode: "curated", id } };
  }
  return state;
}

export function setText(state, patch = {}) {
  const text = { ...state.text };
  if ("headline" in patch) text.headline = String(patch.headline ?? "").slice(0, HEADLINE_MAX);
  if ("subline" in patch) text.subline = String(patch.subline ?? "").slice(0, LINE_MAX);
  if ("date" in patch) text.date = String(patch.date ?? "").slice(0, LINE_MAX);
  return { ...state, text };
}

export function setFinish(state, patch = {}) {
  const finish = { ...state.finish };
  if ("grain" in patch) finish.grain = Math.min(1, Math.max(0, Number(patch.grain) || 0));
  if ("paper" in patch) finish.paper = Boolean(patch.paper);
  return { ...state, finish };
}

export function toggleLock(state, which) {
  if (!(which in state.locks)) return state;
  return { ...state, locks: { ...state.locks, [which]: !state.locks[which] } };
}

/** The identity of a poster: everything except the (session-level) locks. */
export function snapshotOf(state) {
  return {
    system: state.system,
    layoutSeed: state.layoutSeed,
    palette: { ...state.palette },
    text: { ...state.text },
    finish: { ...state.finish },
  };
}

/** Restores a snapshot (gallery click, seed code) while keeping the locks. */
export function restore(state, snapshot) {
  let next = { ...state };
  if (snapshot.system != null) next = setSystem(next, snapshot.system);
  if (snapshot.layoutSeed != null) next = setLayoutSeed(next, snapshot.layoutSeed);
  if (snapshot.palette) next = setPalette(next, snapshot.palette);
  if (snapshot.text) next = setText(next, snapshot.text);
  if (snapshot.finish) next = setFinish(next, snapshot.finish);
  return next;
}
