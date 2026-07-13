import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_POINTS,
  MIN_POINTS,
  clampPointCount,
  createDefaultScene,
  setPointCount,
} from "../js/scene.js";
import { getSurfaceDimensions } from "../js/renderer.js";
import { setNumericSetting } from "../js/settings.js";

test("the default scene contains six reusable points and exposes five", () => {
  const scene = createDefaultScene();
  assert.equal(scene.points.length, MAX_POINTS);
  assert.equal(scene.pointCount, 5);
  assert.equal(scene.settings.playing, true);
  scene.points.forEach((point) => {
    assert.ok(point.x >= 0 && point.x <= 1);
    assert.ok(point.y >= 0 && point.y <= 1);
  });
});

test("point counts clamp to the supported three-to-six range", () => {
  assert.equal(clampPointCount(1), MIN_POINTS);
  assert.equal(clampPointCount(4), 4);
  assert.equal(clampPointCount(9), MAX_POINTS);
  assert.equal(clampPointCount("not-a-number"), 5);
});

test("reduced motion starts paused and setPointCount mutates safely", () => {
  const scene = createDefaultScene({ reducedMotion: true });
  assert.equal(scene.settings.playing, false);
  assert.equal(setPointCount(scene, 99), MAX_POINTS);
  assert.equal(scene.pointCount, MAX_POINTS);
});

test("render surfaces cap DPR and keep an eighth-size work canvas", () => {
  const surface = getSurfaceDimensions(1920, 1080, 3);
  assert.deepEqual(surface, {
    cssWidth: 1920,
    cssHeight: 1080,
    displayWidth: 3840,
    displayHeight: 2160,
    workWidth: 240,
    workHeight: 135,
    dpr: 2,
  });
});

test("numeric settings clamp to the documented control ranges", () => {
  const scene = createDefaultScene();
  assert.equal(setNumericSetting(scene, "speed", 4), 2);
  assert.equal(setNumericSetting(scene, "size", 0.1), 0.7);
  assert.equal(setNumericSetting(scene, "grain", 0.12), 0.12);
  assert.throws(() => setNumericSetting(scene, "unknown", 1));
});
