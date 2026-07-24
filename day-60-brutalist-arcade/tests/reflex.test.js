import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_DELAY_MS,
  MAX_DELAY_MS,
  RANKS,
  ROUNDS,
  average,
  randomDelay,
  rankFor,
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

test("average rounds to whole ms", () => {
  assert.equal(average([100, 101]), 101);
  assert.equal(average([250]), 250);
  assert.equal(average([200, 300, 400, 100, 150]), 230);
});

test("average of nothing is 0", () => {
  assert.equal(average([]), 0);
  assert.equal(average(null), 0);
});

test("rank boundaries", () => {
  assert.equal(rankFor(120).name, "VOLTAGE");
  assert.equal(rankFor(199).name, "VOLTAGE");
  assert.equal(rankFor(200).name, "CAFFEINATED");
  assert.equal(rankFor(299).name, "CAFFEINATED");
  assert.equal(rankFor(300).name, "HUMAN");
  assert.equal(rankFor(449).name, "HUMAN");
  assert.equal(rankFor(450).name, "SLOTH");
  assert.equal(rankFor(5000).name, "SLOTH");
});

test("ranks are ordered fastest to slowest", () => {
  const maxes = RANKS.map((r) => r.max);
  const sorted = [...maxes].sort((a, b) => a - b);
  assert.deepEqual(maxes, sorted);
  assert.equal(maxes.at(-1), Infinity);
});
