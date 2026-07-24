import test from "node:test";
import assert from "node:assert/strict";
import {
  ROUND_MS,
  START_POP_MS,
  END_POP_MS,
  START_GAP_MS,
  END_GAP_MS,
  comboMultiplier,
  scoreForHit,
  popDuration,
  popGap,
  pickCell,
} from "../js/whackLogic.js";

test("comboMultiplier thresholds", () => {
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(2), 1);
  assert.equal(comboMultiplier(3), 2);
  assert.equal(comboMultiplier(5), 2);
  assert.equal(comboMultiplier(6), 3);
  assert.equal(comboMultiplier(8), 3);
  assert.equal(comboMultiplier(9), 4);
  assert.equal(comboMultiplier(40), 4);
});

test("scoreForHit multiplies base points", () => {
  assert.equal(scoreForHit(1), 10);
  assert.equal(scoreForHit(3), 20);
  assert.equal(scoreForHit(6), 30);
  assert.equal(scoreForHit(9), 40);
});

test("popDuration ramps 600 → 300 across the round", () => {
  assert.equal(popDuration(0), START_POP_MS);
  assert.equal(popDuration(ROUND_MS / 2), (START_POP_MS + END_POP_MS) / 2);
  assert.equal(popDuration(ROUND_MS), END_POP_MS);
});

test("popDuration clamps outside the round", () => {
  assert.equal(popDuration(-500), START_POP_MS);
  assert.equal(popDuration(ROUND_MS * 4), END_POP_MS);
  assert.equal(popDuration(Number.NaN), END_POP_MS);
});

test("popGap ramps 420 → 200 and clamps", () => {
  assert.equal(popGap(0), START_GAP_MS);
  assert.equal(popGap(ROUND_MS), END_GAP_MS);
  assert.equal(popGap(ROUND_MS * 9), END_GAP_MS);
});

test("pickCell never repeats the previous cell", () => {
  for (let step = 0; step < 100; step += 1) {
    const rand = () => step / 100;
    const idx = pickCell(9, 4, rand);
    assert.notEqual(idx, 4);
    assert.ok(idx >= 0 && idx < 9);
  }
});

test("pickCell covers every non-previous cell", () => {
  const seen = new Set();
  for (let step = 0; step < 8; step += 1) {
    seen.add(pickCell(9, 0, () => step / 8));
  }
  assert.deepEqual([...seen].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("pickCell with no previous uses the full range", () => {
  assert.equal(pickCell(9, null, () => 0), 0);
  assert.equal(pickCell(9, null, () => 0.999), 8);
});

test("pickCell degenerate single cell", () => {
  assert.equal(pickCell(1, 0, () => 0.5), 0);
});
