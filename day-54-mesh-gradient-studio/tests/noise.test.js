import test from "node:test";
import assert from "node:assert/strict";

import { createSimplexNoise } from "../js/noise.js";
import { sampleMotion } from "../js/motion.js";
import { createDefaultScene } from "../js/scene.js";

test("simplex noise is deterministic for a seed and bounded", () => {
  const first = createSimplexNoise(54);
  const second = createSimplexNoise(54);
  const different = createSimplexNoise(55);
  const coordinates = Array.from({ length: 80 }, (_, index) => [index / 7, index / 13]);
  const firstValues = coordinates.map(([x, y]) => first.noise2D(x, y));
  const secondValues = coordinates.map(([x, y]) => second.noise2D(x, y));

  assert.deepEqual(firstValues, secondValues);
  assert.notEqual(first.noise2D(0.7, 1.3), different.noise2D(0.7, 1.3));
  firstValues.forEach((value) => assert.ok(value >= -1.1 && value <= 1.1));
});

test("motion sampling moves points while retaining normalized coordinates", () => {
  const scene = createDefaultScene();
  const noise = createSimplexNoise(54);
  const start = sampleMotion(scene, 0, noise);
  const later = sampleMotion(scene, 12, noise);

  assert.notDeepEqual(start, later);
  later.forEach((point) => {
    assert.ok(point.x >= 0 && point.x <= 1);
    assert.ok(point.y >= 0 && point.y <= 1);
    assert.ok(point.radius > 0);
  });
});
