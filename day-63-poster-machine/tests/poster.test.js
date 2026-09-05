import test from "node:test";
import assert from "node:assert/strict";
import { fitPoster, backingSize, POSTER_W, POSTER_H, planPoster } from "../js/poster.js";
import { createInitialState } from "../js/state.js";

test("fitPoster keeps 3:4 and respects padding", () => {
  const { cssW, cssH } = fitPoster(1000, 1000, 32);
  assert.ok(cssH <= 1000 - 64);
  assert.ok(Math.abs(cssW / cssH - 0.75) < 0.01);
  const wide = fitPoster(3000, 800, 0);
  assert.equal(wide.cssH, 800);
  assert.equal(fitPoster(10, 10, 32).cssW, 0);
});

test("backingSize caps dpr at 2 and honours the pixel budget", () => {
  const hi = backingSize(600, 800, 3);
  assert.equal(hi.width, 1200);
  assert.equal(hi.scale, hi.width / POSTER_W);
  const capped = backingSize(600, 800, 2, 480000);
  assert.ok(capped.width * capped.height <= 480000 + 2000);
  assert.ok(Math.abs(capped.width / capped.height - POSTER_W / POSTER_H) < 0.01);
});

test("planPoster is a pure function of the layout seed", () => {
  const state = createInitialState(() => 0.42);
  assert.deepEqual(planPoster(state).plan, planPoster({ ...state, text: { headline: "OTHER" } }).plan);
  assert.notDeepEqual(planPoster(state).plan, planPoster({ ...state, layoutSeed: state.layoutSeed + 1 }).plan);
});
