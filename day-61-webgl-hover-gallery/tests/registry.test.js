import test from "node:test";
import assert from "node:assert/strict";
import { EFFECTS, DEFAULT_EFFECT, resolveEffect } from "../js/effectRegistry.js";
import { FRAGMENTS, VERTEX_SHADER } from "../js/shaders.js";

test("registry lists the effects in display order", () => {
  assert.deepEqual(EFFECTS.map((e) => e.id), ["ripple", "flow-rgb", "pixelate"]);
});

test("only pixelate exposes the invert toggle", () => {
  assert.deepEqual(
    EFFECTS.filter((e) => e.hasInvert).map((e) => e.id),
    ["pixelate"],
  );
});

test("ids and labels are unique", () => {
  assert.equal(new Set(EFFECTS.map((e) => e.id)).size, EFFECTS.length);
  assert.equal(new Set(EFFECTS.map((e) => e.label)).size, EFFECTS.length);
});

test("every fragKey resolves to a real fragment shader source", () => {
  for (const e of EFFECTS) {
    const src = FRAGMENTS[e.fragKey];
    assert.equal(typeof src, "string", e.id);
    assert.ok(src.includes("void main"), e.id);
    assert.ok(src.includes("u_hover"), `${e.id} must gate on hover`);
  }
});

test("the passthrough program exists alongside the effects", () => {
  assert.ok(FRAGMENTS.passthrough.includes("void main"));
});

test("vertex shader carries the shared plane-placement contract", () => {
  assert.ok(VERTEX_SHADER.includes("a_position"));
  assert.ok(VERTEX_SHADER.includes("u_rect"));
  assert.ok(VERTEX_SHADER.includes("1.0 - a_position.y"), "v_uv.y must point down");
});

test("resolveEffect keeps known ids and falls back to the default", () => {
  assert.equal(resolveEffect("ripple"), "ripple");
  assert.equal(resolveEffect("no-such-effect"), DEFAULT_EFFECT);
  assert.equal(resolveEffect(undefined), DEFAULT_EFFECT);
});

test("the default effect is registered", () => {
  assert.ok(EFFECTS.some((e) => e.id === DEFAULT_EFFECT));
});
