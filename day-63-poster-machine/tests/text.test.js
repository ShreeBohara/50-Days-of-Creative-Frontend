import test from "node:test";
import assert from "node:assert/strict";
import { breakHeadline, fitFontSize, slugify, measureTracked } from "../js/text.js";

/* A canvas-free context stub: every glyph is 0.6em wide. */
function fakeContext() {
  const ctx = { font: "" };
  ctx.measureText = (str) => {
    const size = Number.parseFloat(ctx.font.match(/(\d+(?:\.\d+)?)px/)[1]);
    return { width: str.length * size * 0.6 };
  };
  return ctx;
}

test("breakHeadline keeps a one-line request whole", () => {
  assert.deepEqual(breakHeadline("VOLTAGE", 1), ["VOLTAGE"]);
  assert.deepEqual(breakHeadline("HELLO WORLD", 1), ["HELLO WORLD"]);
});

test("breakHeadline splits a single word to reach the line count", () => {
  assert.deepEqual(breakHeadline("VOLTAGE", 2), ["VOLT", "AGE"]);
  assert.deepEqual(breakHeadline("VOLTAGE", 3), ["VOLT", "AGE"]);
  assert.deepEqual(breakHeadline("ORCHESTRA", 2), ["ORCHE", "STRA"]);
  assert.deepEqual(breakHeadline("Night Shift", 3), ["Night", "Shift"]);
});

test("breakHeadline balances words across lines", () => {
  assert.deepEqual(breakHeadline("HELLO WORLD", 2), ["HELLO", "WORLD"]);
  assert.deepEqual(breakHeadline("NIGHT SHIFT ORCHESTRA", 2), ["NIGHT SHIFT", "ORCHESTRA"]);
});

test("breakHeadline never splits tiny words and handles empties", () => {
  assert.deepEqual(breakHeadline("GO", 2), ["GO"]);
  assert.deepEqual(breakHeadline("   ", 2), []);
  assert.deepEqual(breakHeadline("", 1), []);
});

test("fitFontSize scales linearly from one measurement and clamps", () => {
  const ctx = fakeContext();
  const size = fitFontSize(ctx, "VOLTAGE", { maxWidth: 1056 });
  assert.ok(Math.abs(size - 1056 / (7 * 0.6)) < 1e-9);
  assert.equal(fitFontSize(ctx, "VOLTAGE", { maxWidth: 100000 }), 520);
  assert.equal(fitFontSize(ctx, "VOLTAGE", { maxWidth: 1 }), 24);
  assert.equal(fitFontSize(ctx, "", { maxWidth: 1000 }), 24);
});

test("tracking widens the measured line", () => {
  const ctx = fakeContext();
  ctx.font = "800 100px x";
  assert.equal(measureTracked(ctx, "AB", 10), 130);
});

test("slugify makes filename-safe names", () => {
  assert.equal(slugify("Night Shift 2026!"), "night-shift-2026");
  assert.equal(slugify("   "), "poster");
});
