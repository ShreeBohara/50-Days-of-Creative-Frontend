import test from "node:test";
import assert from "node:assert/strict";
import { digitsFor } from "../js/odometer.js";

test("small values are zero-padded to the minimum width", () => {
  assert.deepEqual(digitsFor(42, 6), [0, 0, 0, 0, 4, 2]);
});

test("values wider than the minimum grow extra leading digits", () => {
  assert.deepEqual(digitsFor(1000000, 6), [1, 0, 0, 0, 0, 0, 0]);
});

test("digits come back most-significant first", () => {
  assert.deepEqual(digitsFor(123456, 6), [1, 2, 3, 4, 5, 6]);
});

test("negative, fractional and non-finite values clamp safely", () => {
  assert.deepEqual(digitsFor(-5, 4), [0, 0, 0, 0]);
  assert.deepEqual(digitsFor(12.9, 4), [0, 0, 1, 2]);
  assert.deepEqual(digitsFor(Number.NaN, 4), [0, 0, 0, 0]);
  assert.deepEqual(digitsFor(Infinity, 4), [0, 0, 0, 0]);
});
