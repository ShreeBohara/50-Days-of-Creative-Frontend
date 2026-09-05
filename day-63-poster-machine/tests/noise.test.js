import test from "node:test";
import assert from "node:assert/strict";
import { createSimplexNoise } from "../js/noise.js";

function sampleGrid(noise, fn = "noise2D") {
  const values = [];
  for (let y = 0; y < 30; y += 1) {
    for (let x = 0; x < 30; x += 1) values.push(noise[fn](x * 0.137 + 0.3, y * 0.171 + 0.7));
  }
  return values;
}

test("noise is deterministic for a seed", () => {
  assert.deepEqual(sampleGrid(createSimplexNoise(63)), sampleGrid(createSimplexNoise(63)));
});

test("noise stays within [-1, 1] and actually varies", () => {
  const values = sampleGrid(createSimplexNoise(63));
  assert.ok(values.every((v) => v >= -1 && v <= 1));
  assert.ok(Math.max(...values) - Math.min(...values) > 0.5);
});

test("different seeds give different fields", () => {
  assert.notDeepEqual(sampleGrid(createSimplexNoise(1)), sampleGrid(createSimplexNoise(2)));
});

test("fbm2D is normalised to [-1, 1]", () => {
  const values = sampleGrid(createSimplexNoise(7), "fbm2D");
  assert.ok(values.every((v) => v >= -1 && v <= 1));
});
