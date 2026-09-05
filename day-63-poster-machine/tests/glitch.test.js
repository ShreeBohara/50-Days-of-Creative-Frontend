import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32, countingRng } from "../js/rng.js";
import { createSimplexNoise } from "../js/noise.js";
import {
  planGlitch, resolveSlices, sliceSourceRect, fieldValues, GLITCH_DRAWS, FIELD_W, FIELD_H,
} from "../js/systems/glitchLogic.js";
import { glitch } from "../js/systems/glitch.js";

test("planGlitch is deterministic with a fixed draw budget", () => {
  assert.deepEqual(planGlitch(mulberry32(6)), planGlitch(mulberry32(6)));
  const rng = countingRng(mulberry32(7));
  planGlitch(rng);
  assert.equal(rng.count, GLITCH_DRAWS);
});

test("resolved slices are sorted, disjoint and inside the page", () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const plan = planGlitch(mulberry32(seed));
    const slices = resolveSlices(plan);
    assert.ok(slices.length <= plan.sliceCount && slices.length > 0);
    for (let i = 0; i < slices.length; i += 1) {
      const s = slices[i];
      assert.ok(s.y0 >= 0 && s.y0 + s.h <= 1600);
      if (i > 0) assert.ok(s.y0 >= slices[i - 1].y0 + slices[i - 1].h - 1e-9, "disjoint");
      assert.ok(Math.abs(s.dx) <= 0.12 * 1200 + 1e-9);
    }
  }
});

test("sliceSourceRect lands on whole device pixels at any scale", () => {
  const slice = { y0: 123.456, h: 31.9, dx: 20 };
  for (const scale of [0.745, 1, 2]) {
    const r = sliceSourceRect(slice, scale);
    assert.ok(Number.isInteger(r.sy) && Number.isInteger(r.sh) && Number.isInteger(r.sw));
    assert.ok(Math.abs(r.dy * scale - r.sy) < 1e-9);
    assert.ok(Math.abs(r.dh * scale - r.sh) < 1e-9);
    assert.ok(r.sh >= 1);
  }
});

test("field values are deterministic and normalised", () => {
  const plan = planGlitch(mulberry32(3));
  const noise = createSimplexNoise(63);
  const a = fieldValues(plan, noise.fbm2D);
  const b = fieldValues(plan, noise.fbm2D);
  assert.equal(a.length, FIELD_W * FIELD_H);
  assert.deepEqual(Array.from(a), Array.from(b));
  assert.ok(a.every((v) => v >= 0 && v <= 1));
  assert.ok(Math.max(...a) - Math.min(...a) > 0.2);
});

test("the glitch system exposes the registry contract", () => {
  assert.equal(glitch.id, "glitch");
  assert.equal(glitch.code, "GLT");
});
