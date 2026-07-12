import test from "node:test";
import assert from "node:assert/strict";

import { createGrainValues } from "../js/effects.js";

test("the film grain field is static, deterministic, and full-range", () => {
  const first = createGrainValues(4096, 5406);
  const second = createGrainValues(4096, 5406);
  const different = createGrainValues(4096, 5407);
  const average = first.reduce((sum, value) => sum + value, 0) / first.length;

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.ok(Math.min(...first) < 5);
  assert.ok(Math.max(...first) > 250);
  assert.ok(average > 120 && average < 135);
});
