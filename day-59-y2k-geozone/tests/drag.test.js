import test from "node:test";
import assert from "node:assert/strict";
import { clampPosition } from "../js/drag.js";

test("far-negative coords keep a peek of the element visible", () => {
  const pos = clampPosition(-500, -500, 60, 60, 800, 600, { peek: 24 });
  assert.deepEqual(pos, { x: -36, y: -36 });
});

test("overflow past the right/bottom edges is pinned to the peek margin", () => {
  const pos = clampPosition(5000, 5000, 60, 60, 800, 600, { peek: 24 });
  assert.deepEqual(pos, { x: 776, y: 576 });
});

test("in-range positions pass through unchanged", () => {
  const pos = clampPosition(120, 260, 60, 60, 800, 600);
  assert.deepEqual(pos, { x: 120, y: 260 });
});

test("an element wider than the bounds still has a valid range", () => {
  const pos = clampPosition(0, 10, 1000, 60, 800, 600, { peek: 24 });
  assert.deepEqual(pos, { x: 0, y: 10 });
});

test("peek option is honored on every edge", () => {
  const tight = clampPosition(-500, 5000, 100, 100, 800, 600, { peek: 4 });
  assert.deepEqual(tight, { x: -96, y: 596 });
});
