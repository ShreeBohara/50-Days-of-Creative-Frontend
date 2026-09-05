import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32, countingRng } from "../js/rng.js";
import {
  planSwiss, gridGeometry, gridlineX, gridlineY, cellRect, accentRect, ruleLine,
  COLUMN_OPTIONS, ROW_OPTIONS, SWISS_DRAWS, GUTTER,
} from "../js/systems/swissPlan.js";
import { swiss } from "../js/systems/swiss.js";

const approx = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("planSwiss is deterministic and always spends the same number of draws", () => {
  assert.deepEqual(planSwiss(mulberry32(11)), planSwiss(mulberry32(11)));
  for (const seed of [1, 2, 3, 99, 12345]) {
    const rng = countingRng(mulberry32(seed));
    planSwiss(rng);
    assert.equal(rng.count, SWISS_DRAWS);
  }
});

test("plans stay inside their option sets and grid bounds", () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const plan = planSwiss(mulberry32(seed));
    assert.ok(COLUMN_OPTIONS.includes(plan.cols));
    assert.ok(ROW_OPTIONS.includes(plan.rows));
    assert.ok(plan.lineCount >= 1 && plan.lineCount <= 3);
    assert.ok(plan.shifts.every((s) => s >= 0 && s <= 2));
    assert.ok(plan.labels.every((l) => l.col >= 0 && l.col <= plan.cols && l.row >= 0 && l.row <= plan.rows));
    assert.ok(plan.rule.thickness >= 2 && plan.rule.thickness <= 6);
  }
});

test("gridGeometry tiles the content box exactly", () => {
  const g = gridGeometry(8, 12);
  approx(g.cw * 8 + GUTTER * 7, g.contentW);
  approx(g.rh * 12 + GUTTER * 11, g.contentH);
  approx(gridlineX(g, 8), g.x0 + g.contentW);
  approx(gridlineY(g, 12), g.y0 + g.contentH);
  const full = cellRect(g, 0, 0, 7, 11);
  approx(full.w, g.contentW);
  approx(full.h, g.contentH);
});

test("accent rectangles sit inside the grid and rule 2 defers to draw", () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const plan = planSwiss(mulberry32(seed));
    const g = gridGeometry(plan.cols, plan.rows);
    const rect = accentRect(plan, g);
    if (plan.accentRule === 2) {
      assert.equal(rect, null);
      continue;
    }
    assert.ok(rect.x >= g.x0 - 1e-6 && rect.x + rect.w <= g.x0 + g.contentW + 1e-6);
    assert.ok(rect.y >= g.y0 - 1e-6 && rect.y + rect.h <= g.y0 + g.contentH + 1e-6);
    assert.ok(rect.w > 0 && rect.h > 0);
  }
});

test("the rule line spans the content box on a gutter", () => {
  for (let seed = 0; seed < 100; seed += 1) {
    const plan = planSwiss(mulberry32(seed));
    const g = gridGeometry(plan.cols, plan.rows);
    const line = ruleLine(plan, g);
    if (plan.rule.vertical) {
      assert.equal(line.x1, line.x2);
      assert.ok(line.x1 > g.x0 && line.x1 < g.x0 + g.contentW);
      approx(line.y2 - line.y1, g.contentH);
    } else {
      assert.equal(line.y1, line.y2);
      assert.ok(line.y1 > g.y0 && line.y1 < g.y0 + g.contentH);
      approx(line.x2 - line.x1, g.contentW);
    }
  }
});

test("the swiss system exposes the registry contract", () => {
  assert.equal(swiss.id, "swiss");
  assert.equal(swiss.code, "SWS");
  assert.equal(typeof swiss.plan, "function");
  assert.equal(typeof swiss.draw, "function");
});
