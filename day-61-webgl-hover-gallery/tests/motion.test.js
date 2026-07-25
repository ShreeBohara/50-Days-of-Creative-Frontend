import test from "node:test";
import assert from "node:assert/strict";
import {
  easeInOutQuart, easeOutCubic, expSmooth,
  createHoverState, createVelocityTracker,
} from "../js/motionLogic.js";

const approx = (a, b, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test("easings pin their endpoints", () => {
  for (const ease of [easeInOutQuart, easeOutCubic]) {
    approx(ease(0), 0);
    approx(ease(1), 1);
  }
});

test("easings are monotonic and stay within [0,1]", () => {
  for (const ease of [easeInOutQuart, easeOutCubic]) {
    let prev = 0;
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const v = ease(Math.min(t, 1));
      assert.ok(v >= prev - 1e-9, `${ease.name} not monotonic at ${t}`);
      assert.ok(v >= -1e-9 && v <= 1 + 1e-9);
      prev = v;
    }
  }
});

test("expSmooth converges to its target", () => {
  let v = 0;
  for (let i = 0; i < 300; i++) v = expSmooth(v, 1, 10, 1 / 60);
  approx(v, 1, 1e-3);
});

test("expSmooth is frame-rate independent", () => {
  // one 16ms step covers the same ground as two 8ms steps
  const one = expSmooth(0, 1, 10, 0.016);
  let two = expSmooth(0, 1, 10, 0.008);
  two = expSmooth(two, 1, 10, 0.008);
  approx(one, two, 1e-9);
});

test("hover attacks faster than it releases", () => {
  const h = createHoverState({ attack: 10, release: 4 });
  h.update(true, 0.1);
  const risen = h.value;
  // let it saturate, then release for the same interval
  for (let i = 0; i < 100; i++) h.update(true, 0.1);
  h.update(false, 0.1);
  const fallen = 1 - h.value;
  assert.ok(risen > fallen, `${risen} rise vs ${fallen} fall`);
});

test("hover value is clamped to [0,1]", () => {
  const h = createHoverState();
  for (let i = 0; i < 500; i++) h.update(true, 0.05);
  assert.ok(h.value <= 1);
  for (let i = 0; i < 500; i++) h.update(false, 0.05);
  assert.ok(h.value >= 0);
});

test("sinceEnter accumulates while inside and resets on re-entry", () => {
  const h = createHoverState();
  h.update(true, 0.5);
  h.update(true, 0.5);
  approx(h.sinceEnter, 1.0);
  h.update(false, 0.2);
  h.update(true, 0.25); // re-entry edge resets before accumulating
  approx(h.sinceEnter, 0.25);
});

test("pulse slams hover to 1 and release decay drains it", () => {
  const h = createHoverState();
  h.pulse();
  approx(h.value, 1);
  approx(h.sinceEnter, 0);
  h.update(false, 0.5);
  assert.ok(h.value < 1 && h.value > 0);
});

test("velocity sits at zero when the pointer never moves", () => {
  const v = createVelocityTracker();
  for (let i = 0; i < 60; i++) v.update(1 / 60);
  approx(v.value, 0, 1e-6);
});

test("velocity spikes are clamped to 1", () => {
  const v = createVelocityTracker();
  v.sample(10000, 0, 1); // absurd flick
  for (let i = 0; i < 5; i++) v.update(1 / 60);
  assert.ok(v.value <= 1);
});

test("consecutive fast samples build velocity, idling drains it", () => {
  const v = createVelocityTracker();
  for (let i = 0; i < 30; i++) {
    v.sample(30, 0, 16);
    v.update(1 / 60);
  }
  const busy = v.value;
  assert.ok(busy > 0.3, `${busy} should be well off the floor`);
  for (let i = 0; i < 240; i++) v.update(1 / 60);
  assert.ok(v.value < 0.05, `${v.value} should have drained`);
});

test("zero or negative sample dt is ignored instead of exploding", () => {
  const v = createVelocityTracker();
  v.sample(100, 100, 0);
  v.update(1 / 60);
  assert.ok(Number.isFinite(v.value));
  approx(v.value, 0, 1e-6);
});

test("spike() feeds the same channel as pointer samples", () => {
  const v = createVelocityTracker();
  v.spike(1);
  v.update(1 / 60);
  assert.ok(v.value > 0.05);
});
