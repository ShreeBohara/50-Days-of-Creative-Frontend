import test from "node:test";
import assert from "node:assert/strict";

import {
  diffBoardFrames,
  flattenBoardLines,
  getColumnsForWidth,
  normalizeBoardLines,
  normalizeColumnCount,
} from "../js/board.js";

test("responsive column boundaries are exact", () => {
  assert.equal(getColumnsForWidth(0), 12);
  assert.equal(getColumnsForWidth(599), 12);
  assert.equal(getColumnsForWidth(600), 16);
  assert.equal(getColumnsForWidth(899), 16);
  assert.equal(getColumnsForWidth(900), 22);
  assert.equal(getColumnsForWidth(1440), 22);
  assert.equal(normalizeColumnCount(15), 16);
});

test("board frames always contain six padded rows and supported characters", () => {
  const lines = normalizeBoardLines(["AB?", "123"], { rows: 6, columns: 12 });
  assert.equal(lines.length, 6);
  assert.equal(lines[0], "AB          ");
  assert.equal(lines[1], "123         ");
  lines.forEach((line) => assert.equal(line.length, 12));
});

test("frame diffing schedules only requested changes", () => {
  const previous = flattenBoardLines(normalizeBoardLines(["ALPHA"], { rows: 6, columns: 12 }));
  const identical = flattenBoardLines(normalizeBoardLines(["ALPHA"], { rows: 6, columns: 12 }));
  const changed = flattenBoardLines(normalizeBoardLines(["ALPXA"], { rows: 6, columns: 12 }));
  assert.deepEqual(diffBoardFrames(previous, identical), []);
  assert.deepEqual(diffBoardFrames(previous, changed), [3]);
});
