import test from "node:test";
import assert from "node:assert/strict";

import { buildCssBackground } from "../js/exportCss.js";
import { createDefaultScene } from "../js/scene.js";

test("CSS export reflects active colors, positions, count, and blend mode", () => {
  const scene = createDefaultScene();
  scene.pointCount = 3;
  scene.settings.size = 1.2;
  const framePoints = scene.points.map((point, index) => ({
    ...point,
    x: 0.1 + index * 0.2,
    y: 0.2 + index * 0.1,
  }));
  const css = buildCssBackground(scene, framePoints);

  assert.match(css, /background-color: #061A24/);
  assert.match(css, /circle 67vmax at 10\.0% 20\.0%/);
  assert.match(css, /rgba\(0, 245, 212, 0\.98\)/);
  assert.equal((css.match(/radial-gradient/g) || []).length, 3);
  assert.match(css, /background-blend-mode: screen/);
});
