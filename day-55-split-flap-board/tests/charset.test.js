import test from "node:test";
import assert from "node:assert/strict";

import {
  FLAP_CHARSET,
  getCellVariance,
  getForwardDistance,
  getForwardSequence,
  getStaggerDelay,
  nextFlapCharacter,
  toFlapCharacter,
} from "../js/charset.js";

test("the mechanical drum exposes the exact forty-character sequence", () => {
  assert.equal(FLAP_CHARSET, " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:•→");
  assert.equal(Array.from(FLAP_CHARSET).length, 40);
  assert.equal(nextFlapCharacter(" "), "A");
  assert.equal(nextFlapCharacter("→"), " ");
  assert.equal(toFlapCharacter("?"), " ");
});

test("forward paths never reverse and wrap through the final flap", () => {
  assert.equal(getForwardDistance("A", "D"), 3);
  assert.deepEqual(getForwardSequence("A", "D"), ["B", "C", "D"]);
  assert.deepEqual(getForwardSequence("→", "A"), [" ", "A"]);
  assert.deepEqual(getForwardSequence("7", "7"), []);
});

test("cell variance is stable, non-uniform, and bounded to plus or minus ten percent", () => {
  const values = Array.from({ length: 132 }, (_, index) => getCellVariance(index));
  values.forEach((value, index) => {
    assert.equal(value, getCellVariance(index));
    assert.ok(value >= 0.9 && value <= 1.1);
  });
  assert.ok(new Set(values.map((value) => value.toFixed(5))).size > 100);
});

test("stagger timing follows the approved column-major wave", () => {
  assert.equal(getStaggerDelay(0, 0, true), 0);
  assert.equal(getStaggerDelay(5, 21, true), 545);
  assert.equal(getStaggerDelay(5, 21, false), 0);
});
