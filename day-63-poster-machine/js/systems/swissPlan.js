// Swiss Grid — the pure half. planSwiss() makes every random decision (a
// fixed 25 draws), and the geometry helpers turn a plan into rectangles in
// poster units. No canvas, no text measurement: fully unit-testable.
import { pick, rangeInt, range, chance } from "../rng.js";

export const GUTTER = 16;
export const COLUMN_OPTIONS = [4, 6, 6, 8, 8, 12];
export const ROW_OPTIONS = [8, 12, 16];
export const SWISS_DRAWS = 25;

export function planSwiss(rng) {
  const cols = pick(rng, COLUMN_OPTIONS);
  const rows = pick(rng, ROW_OPTIONS);
  const lineCount = pick(rng, [1, 2, 2, 3, 3]);
  const shifts = [rangeInt(rng, 0, 2), rangeInt(rng, 0, 2), rangeInt(rng, 0, 2)];
  const weight = pick(rng, [700, 800, 900]);
  const caps = chance(rng, 0.6);
  const anchor = pick(rng, ["top", "middle", "bottom"]);
  const accentRule = rangeInt(rng, 0, 2);
  const accentSize = { k: rangeInt(rng, 1, 2), m: rangeInt(rng, 1, 3) };
  const labels = [];
  for (let i = 0; i < 3; i += 1) {
    labels.push({ col: rangeInt(rng, 0, cols), row: rangeInt(rng, 0, rows), rotated: chance(rng, 0.5) });
  }
  const rule = { vertical: chance(rng, 0.4), at: rng(), thickness: range(rng, 2, 6) };
  const showGrid = chance(rng, 0.7);
  return {
    cols, rows, lineCount, shifts, weight, caps, anchor, accentRule, accentSize, labels, rule, showGrid,
  };
}

/** Modular grid inside the margins: column width, row height, origin. */
export function gridGeometry(cols, rows, W = 1200, H = 1600, M = 72) {
  const contentW = W - M * 2;
  const contentH = H - M * 2;
  return {
    cols,
    rows,
    x0: M,
    y0: M,
    contentW,
    contentH,
    gutter: GUTTER,
    cw: (contentW - GUTTER * (cols - 1)) / cols,
    rh: (contentH - GUTTER * (rows - 1)) / rows,
  };
}

/** Left edge of column `col` (col === cols → right edge of the grid). */
export function gridlineX(g, col) {
  return col >= g.cols ? g.x0 + g.contentW : g.x0 + col * (g.cw + g.gutter);
}

/** Top edge of row `row` (row === rows → bottom edge of the grid). */
export function gridlineY(g, row) {
  return row >= g.rows ? g.y0 + g.contentH : g.y0 + row * (g.rh + g.gutter);
}

/** Rectangle covering columns c1..c2 and rows r1..r2 (inclusive). */
export function cellRect(g, c1, r1, c2 = c1, r2 = r1) {
  const x = gridlineX(g, c1);
  const y = gridlineY(g, r1);
  const x2 = gridlineX(g, c2) + g.cw;
  const y2 = gridlineY(g, r2) + g.rh;
  return { x, y, w: x2 - x, h: y2 - y };
}

/**
 * Accent block by placement rule: 0 = top-right, 1 = bottom-left,
 * 2 = behind a headline line (text-dependent, so resolved in draw → null).
 */
export function accentRect(plan, g) {
  const unitCols = Math.max(1, Math.round(g.cols / 4));
  const unitRows = Math.max(1, Math.round(g.rows / 8));
  const spanCols = Math.min(g.cols - 1, unitCols * plan.accentSize.k);
  const spanRows = Math.min(g.rows - 1, unitRows * plan.accentSize.m);
  if (plan.accentRule === 0) {
    return cellRect(g, g.cols - spanCols, 0, g.cols - 1, spanRows - 1);
  }
  if (plan.accentRule === 1) {
    const r2 = g.rows - 2;
    const r1 = Math.max(0, r2 - spanRows + 1);
    return cellRect(g, 0, r1, spanCols - 1, r2);
  }
  return null;
}

/** The single rule line, centred in a gutter, spanning the content box. */
export function ruleLine(plan, g) {
  const thickness = plan.rule.thickness;
  if (plan.rule.vertical) {
    const col = 1 + Math.floor(plan.rule.at * (g.cols - 1));
    const x = gridlineX(g, col) - g.gutter / 2;
    return { x1: x, y1: g.y0, x2: x, y2: g.y0 + g.contentH, thickness };
  }
  const row = 1 + Math.floor(plan.rule.at * (g.rows - 1));
  const y = gridlineY(g, row) - g.gutter / 2;
  return { x1: g.x0, y1: y, x2: g.x0 + g.contentW, y2: y, thickness };
}
