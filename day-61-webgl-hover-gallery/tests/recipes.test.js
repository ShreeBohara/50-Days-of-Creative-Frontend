import test from "node:test";
import assert from "node:assert/strict";
import {
  RECIPES, OP_TYPES, TEXTURE_SIZE, createRng, formatCaption,
} from "../js/textureRecipes.js";

const HEX = /^#[0-9a-f]{6}$/i;

/* walk an op collecting every color + normalized coordinate it uses */
function opColors(op) {
  const colors = [];
  if (op.color) colors.push(op.color);
  if (op.stops) for (const s of op.stops) colors.push(s.color);
  return colors;
}

function opCoords(op) {
  const flat = [];
  const push = (pair) => flat.push(...pair);
  if (op.from) push(op.from);
  if (op.to) push(op.to);
  if (op.center) push(op.center);
  if (op.start) push(op.start);
  if (op.region) flat.push(...op.region);
  if (op.points) op.points.forEach(push);
  if (op.lines) op.lines.forEach((line) => line.forEach(push));
  if (op.curves) op.curves.forEach((c) => flat.push(...c));
  return flat;
}

test("exactly six recipes with unique ids and titles", () => {
  assert.equal(RECIPES.length, 6);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, 6);
  assert.equal(new Set(RECIPES.map((r) => r.title)).size, 6);
});

test("every recipe has an uppercase title and a subtitle", () => {
  for (const r of RECIPES) {
    assert.equal(r.title, r.title.toUpperCase(), r.id);
    assert.ok(r.subtitle.length > 4, r.id);
  }
});

test("formatCaption pads the index and joins with an em dash", () => {
  assert.equal(formatCaption(0, "DUSK RIDGE"), "01 — DUSK RIDGE");
  assert.equal(formatCaption(5, "BOTANIC SHADOW"), "06 — BOTANIC SHADOW");
});

test("every op type is in the allowed vocabulary", () => {
  for (const r of RECIPES) {
    for (const op of r.ops) {
      assert.ok(OP_TYPES.includes(op.type), `${r.id}: ${op.type}`);
    }
  }
});

test("all colors are 6-digit hex; stop/op alphas sit in [0,1]", () => {
  for (const r of RECIPES) {
    for (const op of r.ops) {
      for (const c of opColors(op)) assert.match(c, HEX, r.id);
      if (op.alpha !== undefined) assert.ok(op.alpha >= 0 && op.alpha <= 1, r.id);
      if (op.stops) {
        for (const s of op.stops) {
          if (s.alpha !== undefined) assert.ok(s.alpha >= 0 && s.alpha <= 1, r.id);
        }
      }
    }
  }
});

test("all coordinates are normalized to [0,1]", () => {
  for (const r of RECIPES) {
    for (const op of r.ops) {
      for (const v of opCoords(op)) {
        assert.ok(v >= 0 && v <= 1, `${r.id}/${op.type}: ${v}`);
      }
    }
  }
});

test("every recipe finishes with grain then vignette", () => {
  for (const r of RECIPES) {
    const tail = r.ops.slice(-2).map((op) => op.type);
    assert.deepEqual(tail, ["grain", "vignette"], r.id);
  }
});

test("gradients carry at least two stops, sorted by position", () => {
  for (const r of RECIPES) {
    for (const op of r.ops) {
      if (!op.stops) continue;
      assert.ok(op.stops.length >= 2, r.id);
      for (let i = 1; i < op.stops.length; i++) {
        assert.ok(op.stops[i].at >= op.stops[i - 1].at, r.id);
      }
    }
  }
});

test("texture size is a power of two", () => {
  assert.ok(Number.isInteger(Math.log2(TEXTURE_SIZE)));
});

test("createRng is deterministic per seed and emits [0,1)", () => {
  const a = createRng(61);
  const b = createRng(61);
  const c = createRng(62);
  const seqA = Array.from({ length: 5 }, () => a());
  const seqB = Array.from({ length: 5 }, () => b());
  const seqC = Array.from({ length: 5 }, () => c());
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  for (const v of seqA) assert.ok(v >= 0 && v < 1);
});
