import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMessageText, wrapMessage } from "../js/messageMode.js";

test("messages uppercase, remove diacritics, and map unsupported punctuation to spaces", () => {
  assert.equal(normalizeMessageText("Café — déjà vu!"), "CAFE   DEJA VU ");
  assert.equal(normalizeMessageText("gate 5: go →"), "GATE 5: GO →");
});

test("message wrapping prefers words and hard-wraps oversized tokens", () => {
  assert.deepEqual(
    wrapMessage("NEXT TRAIN HOME", { columns: 10, rows: 6 }).lines,
    ["NEXT TRAIN", "HOME"],
  );
  assert.deepEqual(
    wrapMessage("SUPERCALIFRAGILISTIC", { columns: 8, rows: 6 }).lines,
    ["SUPERCAL", "IFRAGILI", "STIC"],
  );
});

test("message overflow is deterministic at each board capacity", () => {
  const composition = wrapMessage("ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE", { columns: 8, rows: 2 });
  assert.equal(composition.capacity, 16);
  assert.equal(composition.truncated, true);
  assert.equal(composition.lines.length, 2);
  assert.ok(composition.allLines.length > composition.lines.length);
});
