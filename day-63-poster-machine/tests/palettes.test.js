import test from "node:test";
import assert from "node:assert/strict";
import {
  CURATED_PALETTES, passesGuard, seededPalette, resolvePalette, chooseDifferentPalette,
  curatedLetter, curatedIndex, GUARD,
} from "../js/palettes.js";
import { contrast } from "../js/color.js";

const HEX = /^#[0-9a-f]{6}$/;

test("there are eight curated palettes with unique ids and letters A–H", () => {
  assert.equal(CURATED_PALETTES.length, 8);
  const ids = new Set(CURATED_PALETTES.map((p) => p.id));
  assert.equal(ids.size, 8);
  CURATED_PALETTES.forEach((p, i) => {
    assert.equal(curatedLetter(p.id), String.fromCharCode(65 + i));
    assert.equal(curatedIndex(p.id), i);
  });
  assert.equal(curatedIndex("unknown"), 0);
});

test("every curated palette clears the contrast guard", () => {
  for (const p of CURATED_PALETTES) {
    assert.ok(passesGuard(p), `${p.name}: ink ${contrast(p.ink, p.bg).toFixed(2)}, accent ${contrast(p.accent, p.bg).toFixed(2)}, colors ${p.colors.map((c) => contrast(c, p.bg).toFixed(2)).join("/")}`);
  }
});

test("seeded palettes are deterministic, well-formed and pass the guard (500 seeds)", () => {
  assert.deepEqual(seededPalette(42), seededPalette(42));
  assert.notDeepEqual(seededPalette(42), seededPalette(43));
  for (let seed = 0; seed < 500; seed += 1) {
    const p = seededPalette(seed * 61 + 7);
    assert.equal(p.id, "seeded");
    assert.equal(p.colors.length, 5);
    assert.ok([p.bg, p.ink, p.accent, ...p.colors].every((c) => HEX.test(c)), `seed ${seed}`);
    assert.ok(passesGuard(p), `seed ${seed}: ink ${contrast(p.ink, p.bg).toFixed(2)} accent ${contrast(p.accent, p.bg).toFixed(2)}`);
  }
});

test("resolvePalette maps references to palettes", () => {
  assert.equal(resolvePalette({ mode: "curated", id: "riso" }).name, "Riso Fluoro");
  assert.equal(resolvePalette(null).id, CURATED_PALETTES[0].id);
  assert.equal(resolvePalette({ mode: "seeded", seed: 9 }).id, "seeded");
});

test("chooseDifferentPalette never returns the current palette", () => {
  for (const p of CURATED_PALETTES) {
    for (const r of [0, 0.3, 0.6, 0.999]) assert.notEqual(chooseDifferentPalette(p.id, () => r), p.id);
  }
});

test("the guard floors are the documented ones", () => {
  assert.deepEqual(GUARD, { ink: 7, accent: 2.5, color: 1.5 });
});
