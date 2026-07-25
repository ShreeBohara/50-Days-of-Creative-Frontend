import test from "node:test";
import assert from "node:assert/strict";
import {
  rectToClip, viewportRect, coverUV, lerp, lerpRect,
  localMouseUV, hitTest, inflateRect,
} from "../js/rectLogic.js";

const approx = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test("full-viewport rect maps to the full clip square", () => {
  const c = rectToClip({ x: 0, y: 0, w: 1280, h: 800 }, 1280, 800);
  approx(c.x, -1); approx(c.y, -1); approx(c.w, 2); approx(c.h, 2);
});

test("top-left quarter rect lands in the top-left clip quadrant", () => {
  const c = rectToClip({ x: 0, y: 0, w: 640, h: 400 }, 1280, 800);
  approx(c.x, -1);
  approx(c.y, 0);       // bottom edge of the plane sits at clip center
  approx(c.w, 1); approx(c.h, 1);
  approx(c.y + c.h, 1); // top edge at the top of clip space — y flipped
});

test("centered rect stays centered through the flip", () => {
  const c = rectToClip({ x: 320, y: 200, w: 640, h: 400 }, 1280, 800);
  approx(c.x + c.w / 2, 0);
  approx(c.y + c.h / 2, 0);
});

test("viewportRect subtracts scroll offsets from document space", () => {
  const v = viewportRect({ x: 100, y: 1000, w: 50, h: 40 }, 0, 900);
  assert.deepEqual(v, { x: 100, y: 100, w: 50, h: 40 });
});

test("coverUV crops rows for a wide plane", () => {
  const { scale, offset } = coverUV(200, 100); // 2:1 plane, square texture
  approx(scale[0], 1); approx(scale[1], 0.5);
  approx(offset[0], 0); approx(offset[1], 0.25);
});

test("coverUV crops columns for a tall plane", () => {
  const { scale, offset } = coverUV(100, 200);
  approx(scale[0], 0.5); approx(scale[1], 1);
  approx(offset[0], 0.25); approx(offset[1], 0);
});

test("coverUV is the identity for a matching aspect", () => {
  const { scale, offset } = coverUV(300, 300);
  approx(scale[0], 1); approx(scale[1], 1);
  approx(offset[0], 0); approx(offset[1], 0);
});

test("coverUV window always stays inside the texture", () => {
  for (const [w, h] of [[500, 100], [100, 500], [16, 9], [9, 16]]) {
    const { scale, offset } = coverUV(w, h);
    assert.ok(offset[0] >= 0 && offset[0] + scale[0] <= 1 + 1e-9);
    assert.ok(offset[1] >= 0 && offset[1] + scale[1] <= 1 + 1e-9);
  }
});

test("lerp and lerpRect hit their endpoints and midpoint", () => {
  approx(lerp(2, 10, 0), 2);
  approx(lerp(2, 10, 1), 10);
  const a = { x: 0, y: 0, w: 100, h: 50 };
  const b = { x: 200, y: 100, w: 300, h: 250 };
  assert.deepEqual(lerpRect(a, b, 0), a);
  assert.deepEqual(lerpRect(a, b, 1), b);
  const mid = lerpRect(a, b, 0.5);
  approx(mid.x, 100); approx(mid.y, 50); approx(mid.w, 200); approx(mid.h, 150);
});

test("localMouseUV maps the rect interior and clamps outside", () => {
  const rect = { x: 100, y: 200, w: 200, h: 100 };
  const inside = localMouseUV(200, 250, rect);
  approx(inside.u, 0.5); approx(inside.v, 0.5);
  const out = localMouseUV(0, 1000, rect);
  approx(out.u, 0); approx(out.v, 1);
});

test("hitTest is inclusive on every edge", () => {
  const rect = { x: 10, y: 10, w: 100, h: 50 };
  assert.ok(hitTest(10, 10, rect));
  assert.ok(hitTest(110, 60, rect));
  assert.ok(!hitTest(9.99, 10, rect));
  assert.ok(!hitTest(110.01, 60, rect));
});

test("inflateRect grows about the center and 1.0 is identity", () => {
  const rect = { x: 100, y: 100, w: 200, h: 100 };
  const grown = inflateRect(rect, 1.1);
  approx(grown.w, 220); approx(grown.h, 110);
  approx(grown.x + grown.w / 2, 200);
  approx(grown.y + grown.h / 2, 150);
  assert.deepEqual(inflateRect(rect, 1), rect);
});
