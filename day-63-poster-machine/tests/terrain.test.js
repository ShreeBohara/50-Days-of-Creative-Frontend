import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32, countingRng } from "../js/rng.js";
import { createSimplexNoise } from "../js/noise.js";
import {
  planTerrain, ridgeProfile, ridgeBase, horizontalEnvelope, depthEnvelope, depthColor,
  rampColor, densestRegion, SAMPLES, TERRAIN_DRAWS,
} from "../js/systems/terrainLogic.js";
import { terrain } from "../js/systems/terrain.js";

const palette = { bg: "#f2eee6", ink: "#151412", accent: "#e23a2b", colors: ["#e23a2b", "#151412", "#2f4fa2", "#f0c02f", "#8c8a84"] };

test("planTerrain is deterministic with a fixed draw budget", () => {
  assert.deepEqual(planTerrain(mulberry32(4)), planTerrain(mulberry32(4)));
  const rng = countingRng(mulberry32(5));
  const plan = planTerrain(rng);
  assert.equal(rng.count, TERRAIN_DRAWS);
  assert.ok(plan.ridgeCount >= 40 && plan.ridgeCount <= 72);
  assert.ok(plan.band.y0 < plan.band.y1);
});

test("ridge profiles are sampled left to right, never below their base", () => {
  const plan = planTerrain(mulberry32(9));
  const noise = createSimplexNoise(63);
  for (const i of [0, Math.floor(plan.ridgeCount / 2), plan.ridgeCount - 1]) {
    const points = ridgeProfile(plan, i, noise.noise2D);
    const base = ridgeBase(plan, i);
    assert.equal(points.length, SAMPLES + 1);
    for (let k = 1; k < points.length; k += 1) assert.ok(points[k].x > points[k - 1].x);
    assert.ok(points.every((p) => p.y <= base + 1e-9 && p.y >= base - plan.amplitude * 1600 - 1e-9));
    assert.equal(points[0].x, 72);
    assert.equal(points[points.length - 1].x, 1200 - 72);
  }
});

test("envelopes peak where the plan says and decay away", () => {
  const plan = planTerrain(mulberry32(12));
  assert.ok(Math.abs(horizontalEnvelope(plan, plan.peak.cx) - 1) < 1e-9);
  assert.ok(horizontalEnvelope(plan, plan.peak.cx + 0.4) < 0.4);
  const peakIndex = Math.round(plan.depthPeak * (plan.ridgeCount - 1));
  assert.ok(depthEnvelope(plan, peakIndex) > 0.95);
  assert.ok(depthEnvelope(plan, 0) < depthEnvelope(plan, peakIndex));
});

test("densestRegion sits inside the ridge band", () => {
  for (let seed = 0; seed < 50; seed += 1) {
    const plan = planTerrain(mulberry32(seed));
    const r = densestRegion(plan);
    assert.equal(r.cx, 0.5);
    assert.ok(r.cy > plan.band.y0 + (plan.band.y1 - plan.band.y0) * plan.depthPeak, "in front of the peak");
    assert.ok(r.cy > plan.band.y0 && r.cy < plan.band.y1);
  }
});

test("depth colours interpolate between the right endpoints", () => {
  assert.equal(rampColor(palette.colors, 0), palette.colors[0]);
  assert.equal(rampColor(palette.colors, 1), palette.colors[4]);
  const plan = { ...planTerrain(mulberry32(1)), gradientMode: 1 };
  assert.equal(depthColor(plan, palette, 0), palette.accent);
  assert.equal(depthColor(plan, palette, plan.ridgeCount - 1), palette.ink);
  const mono = { ...plan, gradientMode: 2 };
  assert.match(depthColor(mono, palette, 0), /^rgba\(/);
});

test("the terrain system exposes the registry contract", () => {
  assert.equal(terrain.id, "terrain");
  assert.equal(terrain.code, "TER");
});
