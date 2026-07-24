import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  ROUNDS,
  randomDelay,
} from "../js/reflexLogic.js";

test("randomDelay spans the 1-4s window", () => {
  assert.equal(randomDelay(() => 0), MIN_DELAY_MS);
  assert.equal(randomDelay(() => 1), MAX_DELAY_MS);
  assert.equal(randomDelay(() => 0.5), (MIN_DELAY_MS + MAX_DELAY_MS) / 2);
});

test("randomDelay stays inside bounds for many draws", () => {
  for (let i = 0; i < 50; i += 1) {
    const ms = randomDelay(() => i / 50);
    assert.ok(ms >= MIN_DELAY_MS && ms <= MAX_DELAY_MS);
  }
});

test("best-of is five rounds", () => {
  assert.equal(ROUNDS, 5);
});
