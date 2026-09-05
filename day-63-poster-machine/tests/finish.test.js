import test from "node:test";
import assert from "node:assert/strict";
import { grainValues, grainAlpha, paperValues, GRAIN_SIZE, PAPER_W, PAPER_H } from "../js/finish.js";

test("grain values are deterministic, mid-grey on average and full-range", () => {
  const a = grainValues();
  const b = grainValues();
  assert.equal(a.length, GRAIN_SIZE * GRAIN_SIZE);
  assert.deepEqual(Array.from(a.slice(0, 64)), Array.from(b.slice(0, 64)));
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  assert.ok(Math.abs(mean - 127.5) < 3, `mean ${mean}`);
  assert.ok(Math.min(...a) < 20 && Math.max(...a) > 235);
});

test("grainAlpha clamps to [0, 0.35]", () => {
  assert.equal(grainAlpha(0), 0);
  assert.equal(grainAlpha(1), 0.35);
  assert.equal(grainAlpha(3), 0.35);
  assert.equal(grainAlpha(-1), 0);
  assert.equal(grainAlpha("nope"), 0);
});

test("paper values stay bright and inside [0, 1]", () => {
  const values = paperValues();
  assert.equal(values.length, PAPER_W * PAPER_H);
  assert.ok(values.every((v) => v >= 0 && v <= 1));
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  assert.ok(mean > 0.8 && mean < 0.92, `mean ${mean}`);
});
