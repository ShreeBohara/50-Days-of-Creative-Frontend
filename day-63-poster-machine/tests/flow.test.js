import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32, countingRng } from "../js/rng.js";
import { planFlow, firstLetter, keepStroke, tracePath, STROKE_COUNT, FLOW_DRAWS } from "../js/systems/flowPlan.js";
import { createMask, sampleMask } from "../js/letterMask.js";
import { flow } from "../js/systems/flow.js";

test("planFlow is deterministic and spends a fixed number of draws", () => {
  assert.deepEqual(planFlow(mulberry32(5)), planFlow(mulberry32(5)));
  const rng = countingRng(mulberry32(8));
  planFlow(rng);
  assert.equal(rng.count, FLOW_DRAWS);
});

test("every candidate stroke starts inside the page", () => {
  const plan = planFlow(mulberry32(21));
  assert.equal(plan.strokes.length, STROKE_COUNT);
  assert.ok(plan.strokes.every((s) => s.x >= 0 && s.x < 1 && s.y >= 0 && s.y < 1 && s.colorIdx >= 0 && s.colorIdx < 5));
});

test("firstLetter picks the first visible character, uppercased", () => {
  assert.equal(firstLetter("  night shift"), "N");
  assert.equal(firstLetter("42 hz"), "4");
  assert.equal(firstLetter(""), "A");
  assert.equal(firstLetter(null), "A");
});

test("keepStroke keeps everything inside the letter and thins outside", () => {
  assert.ok(keepStroke(1, 0.99, 0.1));
  assert.ok(!keepStroke(0, 0.5, 0.1));
  assert.ok(keepStroke(0, 0.05, 0.1));
});

test("sampleMask interpolates bilinearly and clamps", () => {
  const mask = createMask(Float32Array.from([0, 1, 0, 1]), 2, 2);
  assert.equal(sampleMask(mask, 0, 0), 0);
  assert.equal(sampleMask(mask, 1, 0), 1);
  assert.ok(Math.abs(sampleMask(mask, 0.5, 0.5) - 0.5) < 1e-6);
  assert.equal(sampleMask(mask, -3, 9), 0);
});

test("tracePath returns steps + 1 points spaced by the step length", () => {
  const plan = planFlow(mulberry32(3));
  const points = tracePath({ x: 0.5, y: 0.5 }, plan, () => 0);
  assert.equal(points.length, plan.steps + 1);
  const d = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  assert.ok(Math.abs(d - plan.stepLength) < 1e-9);
});

test("the flow system exposes the registry contract", () => {
  assert.equal(flow.id, "flow");
  assert.equal(flow.code, "FLW");
});
