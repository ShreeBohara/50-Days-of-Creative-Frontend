import test from "node:test";
import assert from "node:assert/strict";

import { PALETTES, applyPalette, getPalette } from "../js/palettes.js";
import { createDefaultScene } from "../js/scene.js";

test("all eight named palettes provide one base and six valid colors", () => {
  assert.equal(PALETTES.length, 8);
  assert.equal(new Set(PALETTES.map((palette) => palette.id)).size, 8);
  PALETTES.forEach((palette) => {
    assert.match(palette.baseColor, /^#[0-9A-F]{6}$/);
    assert.equal(palette.colors.length, 6);
    palette.colors.forEach((color) => assert.match(color, /^#[0-9A-F]{6}$/));
  });
});

test("applying a palette updates the complete reusable point set", () => {
  const scene = createDefaultScene();
  const candy = applyPalette(scene, "candy");
  assert.equal(scene.presetId, "candy");
  assert.equal(scene.baseColor, candy.baseColor);
  assert.deepEqual(scene.points.map((point) => point.color), candy.colors);
  assert.equal(getPalette("missing").id, "sunset");
});
