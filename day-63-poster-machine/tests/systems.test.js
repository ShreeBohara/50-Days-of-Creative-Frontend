import test from "node:test";
import assert from "node:assert/strict";
import { SYSTEMS, SYSTEM_IDS, DEFAULT_SYSTEM, getSystem } from "../js/systems/index.js";
import { mulberry32, countingRng } from "../js/rng.js";

test("five systems with unique ids, three-letter codes and salts", () => {
  assert.deepEqual(SYSTEM_IDS, ["swiss", "flow", "bauhaus", "terrain", "glitch"]);
  assert.equal(DEFAULT_SYSTEM, "swiss");
  assert.equal(new Set(SYSTEMS.map((s) => s.code)).size, 5);
  assert.equal(new Set(SYSTEMS.map((s) => s.salt)).size, 5);
  for (const system of SYSTEMS) {
    assert.match(system.code, /^[A-Z]{3}$/);
    assert.equal(typeof system.plan, "function");
    assert.equal(typeof system.draw, "function");
    assert.equal(typeof system.name, "string");
  }
  assert.equal(getSystem("nope").id, "swiss");
});

test("every plan() ignores the text and spends a constant draw budget", () => {
  for (const system of SYSTEMS) {
    const a = countingRng(mulberry32(5));
    const b = countingRng(mulberry32(5));
    const planA = system.plan(a, { headline: "VOLTAGE", subline: "", date: "" });
    const planB = system.plan(b, { headline: "A much longer headline here", subline: "x", date: "y" });
    assert.equal(a.count, b.count, system.id);
    assert.deepEqual(planA, planB, system.id);
  }
});
