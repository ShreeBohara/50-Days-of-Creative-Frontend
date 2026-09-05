import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32 } from "../js/rng.js";
import {
  ALPHABET, encodeBase32, decodeBase32, normalizeCode, encodeCode, decodeCode, isValidCode,
} from "../js/seedCode.js";
import { createInitialState, restore, setPalette, LAYOUT_BITS, PALETTE_BITS } from "../js/state.js";
import { SYSTEMS } from "../js/systems/index.js";
import { CURATED_PALETTES } from "../js/palettes.js";

const base = createInitialState(() => 0.25);

test("the alphabet is Crockford base32 without I, L, O, U", () => {
  assert.equal(ALPHABET.length, 32);
  for (const bad of "ILOU") assert.equal(ALPHABET.includes(bad), false);
});

test("base32 fields encode MSB-first and decode with confusables mapped", () => {
  assert.equal(encodeBase32(0, 4), "0000");
  assert.equal(encodeBase32(2 ** 20 - 1, 4), "ZZZZ");
  assert.equal(decodeBase32("ZZZZ"), 2 ** 20 - 1);
  assert.equal(decodeBase32("0O1I1L"), decodeBase32("001111"));
  assert.equal(decodeBase32("U"), null);
});

test("curated and seeded codes have the documented shapes", () => {
  const curated = { ...base, system: "swiss", layoutSeed: 0x7ABCD, palette: { mode: "curated", id: "ink-bone" } };
  assert.match(encodeCode(curated), /^SWS-[0-9A-Z]{4}-C$/);
  const seeded = { ...base, system: "terrain", layoutSeed: 5, palette: { mode: "seeded", seed: 12345 } };
  assert.match(encodeCode(seeded), /^TER-[0-9A-Z]{4}-X[0-9A-Z]{3}$/);
});

test("round-trips over 500 random states", () => {
  const rng = mulberry32(2026);
  for (let i = 0; i < 500; i += 1) {
    const system = SYSTEMS[Math.floor(rng() * SYSTEMS.length)].id;
    const layoutSeed = Math.floor(rng() * 2 ** LAYOUT_BITS);
    const palette = rng() < 0.5
      ? { mode: "curated", id: CURATED_PALETTES[Math.floor(rng() * CURATED_PALETTES.length)].id }
      : { mode: "seeded", seed: Math.floor(rng() * 2 ** PALETTE_BITS) };
    const state = { ...base, system, layoutSeed, palette };
    const code = encodeCode(state);
    const decoded = decodeCode(code);
    assert.equal(decoded.ok, true, code);
    assert.equal(decoded.system, system);
    assert.equal(decoded.layoutSeed, layoutSeed);
    assert.deepEqual(decoded.palette, palette);
    const restored = restore(base, decoded);
    assert.equal(encodeCode(restored), code);
  }
});

test("decoding is case-insensitive and ignores dashes, spaces and confusables", () => {
  const code = encodeCode({ ...base, system: "flow", layoutSeed: 1234, palette: { mode: "curated", id: "riso" } });
  const loose = ` ${code.toLowerCase().replace(/-/g, " ")} `;
  assert.deepEqual(decodeCode(loose), decodeCode(code));
  assert.equal(normalizeCode("flw-00o1-e"), "FLW00O1E");
  assert.deepEqual(decodeCode("FLW-00O1-E"), decodeCode("FLW-0001-E"));
});

test("structural errors are rejected with a reason", () => {
  assert.deepEqual(decodeCode("SWS-7K2Q"), { ok: false, reason: "length" });
  assert.deepEqual(decodeCode("SWS-7K2Q-XX"), { ok: false, reason: "length" });
  assert.deepEqual(decodeCode("ZZZ-7K2Q-A"), { ok: false, reason: "system" });
  assert.deepEqual(decodeCode("SWS-7KUQ-A"), { ok: false, reason: "layout" });
  assert.deepEqual(decodeCode("SWS-7K2Q-J"), { ok: false, reason: "palette" });
  assert.deepEqual(decodeCode("SWS-7K2Q-Y9ZZ"), { ok: false, reason: "palette" });
  assert.equal(isValidCode(""), false);
  assert.equal(isValidCode("GLT-0000-XZZZ"), true);
});

test("every system has a unique three-letter code", () => {
  const codes = SYSTEMS.map((s) => s.code);
  assert.equal(new Set(codes).size, SYSTEMS.length);
  for (const code of codes) assert.equal(decodeCode(`${code}-0000-A`).ok, true);
});

test("restore from a decoded code keeps text, finish and locks", () => {
  const state = setPalette({ ...base, text: { headline: "KEEP", subline: "", date: "" } }, { mode: "seeded", seed: 3 });
  const decoded = decodeCode("BAU-000Z-B");
  const next = restore(state, decoded);
  assert.equal(next.system, "bauhaus");
  assert.equal(next.layoutSeed, 31);
  assert.deepEqual(next.palette, { mode: "curated", id: CURATED_PALETTES[1].id });
  assert.equal(next.text.headline, "KEEP");
  assert.deepEqual(next.locks, state.locks);
});
