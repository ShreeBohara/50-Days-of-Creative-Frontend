import test from "node:test";
import assert from "node:assert/strict";
import { hexToRgb, rgbToHex, luminance, contrast, withAlpha, mixHex, hslToHex, isDark } from "../js/color.js";

test("hex parsing handles short and long forms", () => {
  assert.deepEqual(hexToRgb("#fff"), [255, 255, 255]);
  assert.deepEqual(hexToRgb("#e23a2b"), [226, 58, 43]);
  assert.deepEqual(hexToRgb("garbage"), [0, 0, 0]);
  assert.equal(rgbToHex(226, 58, 43), "#e23a2b");
});

test("luminance and contrast follow WCAG", () => {
  assert.ok(Math.abs(luminance("#ffffff") - 1) < 1e-9);
  assert.ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 1e-6);
  assert.ok(Math.abs(contrast("#ffffff", "#000000") - 21) < 1e-6);
  assert.ok(isDark("#101114"));
  assert.ok(!isDark("#f2eee6"));
});

test("withAlpha and mixHex", () => {
  assert.equal(withAlpha("#ff0000", 0.5), "rgba(255, 0, 0, 0.5)");
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "#808080");
  assert.equal(mixHex("#000000", "#ffffff", 2), "#ffffff");
});

test("hslToHex hits the primaries", () => {
  assert.equal(hslToHex(0, 1, 0.5), "#ff0000");
  assert.equal(hslToHex(120, 1, 0.25), "#008000");
  assert.equal(hslToHex(240, 1, 0.5), "#0000ff");
  assert.equal(hslToHex(400, 0, 0.5), "#808080");
});
