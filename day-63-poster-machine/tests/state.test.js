import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState, reroll, canReroll, setSystem, setPalette, setText, setFinish,
  toggleLock, restore, snapshotOf, LAYOUT_BITS, HEADLINE_MAX,
} from "../js/state.js";
import { CURATED_PALETTES } from "../js/palettes.js";
import { SYSTEM_IDS } from "../js/systems/index.js";

/* Scripted random source: returns the given values in order, then repeats. */
const scripted = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test("initial state has the documented shape", () => {
  const state = createInitialState(scripted(0.5));
  assert.ok(SYSTEM_IDS.includes(state.system));
  assert.equal(state.layoutSeed, 2 ** (LAYOUT_BITS - 1));
  assert.deepEqual(state.palette, { mode: "curated", id: CURATED_PALETTES[0].id });
  assert.equal(state.text.headline, "VOLTAGE");
  assert.deepEqual(state.locks, { palette: false, layout: false });
});

test("reroll changes layout seed and picks a different curated palette", () => {
  const state = createInitialState(scripted(0.1));
  const next = reroll(state, scripted(0.9, 0));
  assert.notEqual(next.layoutSeed, state.layoutSeed);
  assert.equal(next.palette.mode, "curated");
  assert.notEqual(next.palette.id, state.palette.id);
  assert.equal(next.system, state.system);
  assert.deepEqual(next.text, state.text);
});

test("lock layout keeps the layout seed; lock palette keeps the palette", () => {
  let state = createInitialState(scripted(0.1));
  state = toggleLock(state, "layout");
  let next = reroll(state, scripted(0.9, 0));
  assert.equal(next.layoutSeed, state.layoutSeed);
  assert.notEqual(next.palette.id, state.palette.id);

  state = toggleLock(toggleLock(state, "layout"), "palette");
  next = reroll(state, scripted(0.9, 0));
  assert.notEqual(next.layoutSeed, state.layoutSeed);
  assert.deepEqual(next.palette, state.palette);
});

test("both locks on: reroll is a no-op and canReroll is false", () => {
  let state = createInitialState(scripted(0.1));
  state = toggleLock(toggleLock(state, "layout"), "palette");
  assert.equal(canReroll(state), false);
  assert.equal(reroll(state, scripted(0.9)), state);
});

test("seeded palette mode rerolls its seed but keeps the mode", () => {
  let state = setPalette(createInitialState(scripted(0.1)), { mode: "seeded", seed: 5 });
  state = reroll(state, scripted(0.2, 0.75));
  assert.equal(state.palette.mode, "seeded");
  assert.equal(state.palette.seed, Math.floor(0.75 * 2 ** 15));
});

test("setPalette validates its input", () => {
  const state = createInitialState(scripted(0.1));
  assert.equal(setPalette(state, { mode: "seeded", seed: -1 }), state);
  assert.equal(setPalette(state, { mode: "nope" }), state);
  assert.equal(setPalette(state, { mode: "curated", id: "unknown" }).palette.id, CURATED_PALETTES[0].id);
});

test("setText clamps lengths and setFinish clamps ranges", () => {
  const state = createInitialState(scripted(0.1));
  const long = "X".repeat(HEADLINE_MAX + 20);
  assert.equal(setText(state, { headline: long }).text.headline.length, HEADLINE_MAX);
  assert.equal(setText(state, { subline: null }).text.subline, "");
  assert.equal(setFinish(state, { grain: 4 }).finish.grain, 1);
  assert.equal(setFinish(state, { grain: -1 }).finish.grain, 0);
  assert.equal(setFinish(state, { paper: 0 }).finish.paper, false);
});

test("setSystem rejects unknown ids and no-ops on the same id", () => {
  const state = createInitialState(scripted(0.1));
  assert.equal(setSystem(state, "not-a-system"), state);
  assert.equal(setSystem(state, state.system), state);
});

test("restore replaces the poster identity but keeps the locks", () => {
  let state = toggleLock(createInitialState(scripted(0.1)), "palette");
  const other = setText(reroll(createInitialState(scripted(0.6)), scripted(0.3, 0.9)), { headline: "OTHER" });
  state = restore(state, snapshotOf(other));
  assert.equal(state.layoutSeed, other.layoutSeed);
  assert.deepEqual(state.palette, other.palette);
  assert.equal(state.text.headline, "OTHER");
  assert.deepEqual(state.locks, { palette: true, layout: false });
});

test("snapshotOf copies rather than shares nested objects", () => {
  const state = createInitialState(scripted(0.1));
  const snap = snapshotOf(state);
  snap.text.headline = "MUTATED";
  assert.equal(state.text.headline, "VOLTAGE");
});
