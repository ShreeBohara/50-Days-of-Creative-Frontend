import test from "node:test";
import assert from "node:assert/strict";

import { createSimplexNoise } from "../js/noise.js";
import { sampleMotion } from "../js/motion.js";
import { randomizeScene, shuffleSceneMotion } from "../js/randomize.js";
import { createDefaultScene } from "../js/scene.js";

function sequenceRandom() {
  let value = 0;
  return () => {
    value = (value + 0.173) % 1;
    return value;
  };
}

test("randomize chooses a different preset and normalized point geometry", () => {
  const scene = createDefaultScene();
  const palette = randomizeScene(scene, sequenceRandom());
  assert.notEqual(palette.id, "aurora");
  assert.equal(scene.presetId, palette.id);
  scene.points.forEach((point) => {
    assert.ok(point.x >= 0.12 && point.x <= 0.88);
    assert.ok(point.y >= 0.12 && point.y <= 0.88);
    assert.ok(point.radius >= 0.5 && point.radius <= 0.64);
  });
});

test("motion shuffle preserves the visible frame and every point color", () => {
  const scene = createDefaultScene();
  const noise = createSimplexNoise(54);
  const visible = sampleMotion(scene, 9, noise);
  const colors = scene.points.map((point) => point.color);
  shuffleSceneMotion(scene, visible, sequenceRandom());
  const reseededStart = sampleMotion(scene, 0, noise);

  assert.deepEqual(reseededStart.map(({ x, y, radius }) => ({ x, y, radius })), visible.map(({ x, y, radius }) => ({ x, y, radius })));
  assert.deepEqual(scene.points.map((point) => point.color), colors);
});
