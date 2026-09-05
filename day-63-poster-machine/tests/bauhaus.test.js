import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32, countingRng } from "../js/rng.js";
import {
  RULES, RULE_COUNT, SLOT_COUNT, BAUHAUS_DRAWS, planBauhaus, resolveShapes, blendForBg,
} from "../js/systems/bauhausRules.js";
import { bauhaus } from "../js/systems/bauhaus.js";

const KINDS = new Set(["circle", "semi", "quarter", "arc", "ring", "tri", "bar"]);

test("there are twelve rules of at most eight known shapes in fraction space", () => {
  assert.equal(RULE_COUNT, 12);
  for (const rule of RULES) {
    assert.ok(rule.shapes.length >= 3 && rule.shapes.length <= SLOT_COUNT, rule.name);
    for (const shape of rule.shapes) {
      assert.ok(KINDS.has(shape.kind), `${rule.name}: ${shape.kind}`);
      assert.ok(shape.cx >= 0 && shape.cx <= 1 && shape.cy >= 0 && shape.cy <= 1, rule.name);
      assert.ok((shape.r || 0) <= 0.6 && (shape.w || 0) <= 1.7 && (shape.h || 0) <= 1.2, rule.name);
    }
  }
});

test("planBauhaus is deterministic with a fixed draw budget", () => {
  assert.deepEqual(planBauhaus(mulberry32(2)), planBauhaus(mulberry32(2)));
  const rng = countingRng(mulberry32(77));
  planBauhaus(rng);
  assert.equal(rng.count, BAUHAUS_DRAWS);
});

test("resolveShapes produces concrete poster-unit shapes with valid colour roles", () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const plan = planBauhaus(mulberry32(seed));
    const shapes = resolveShapes(plan);
    const expected = RULES[plan.rule].shapes.length + (plan.overlay ? RULES[plan.overlayRule].shapes.length : 0);
    assert.equal(shapes.length, expected);
    for (const s of shapes) {
      assert.ok(s.colorIdx >= 0 && s.colorIdx <= 4);
      assert.ok(s.x > -200 && s.x < 1400 && s.y > -200 && s.y < 1800);
      assert.ok(Number.isFinite(s.r) && Number.isFinite(s.rot));
    }
  }
});

test("overlay shapes are drawn smaller about the centre", () => {
  const plan = { ...planBauhaus(mulberry32(1)), overlay: true };
  const main = resolveShapes({ ...plan, overlay: false });
  const withOverlay = resolveShapes(plan);
  const extra = withOverlay.slice(main.length);
  const ruleShapes = RULES[plan.overlayRule].shapes;
  extra.forEach((s, i) => {
    assert.ok(s.r <= ruleShapes[i].r * 1200 * 0.5 * 1.15 + 1e-9);
  });
});

test("blendForBg multiplies on paper and screens on dark", () => {
  assert.equal(blendForBg("#f2eee6"), "multiply");
  assert.equal(blendForBg("#101114"), "screen");
});

test("the bauhaus system exposes the registry contract", () => {
  assert.equal(bauhaus.id, "bauhaus");
  assert.equal(bauhaus.code, "BAU");
});
