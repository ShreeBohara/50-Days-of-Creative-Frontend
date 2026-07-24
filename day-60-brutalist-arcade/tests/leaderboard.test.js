import test from "node:test";
import assert from "node:assert/strict";
import {
  GAMES,
  cycleLetter,
  fmtValue,
  isNewBest,
  sanitizeInitials,
} from "../js/leaderboardLogic.js";

test("sanitizeInitials strips junk, uppercases, pads to three", () => {
  assert.equal(sanitizeInitials("sh!x9y"), "SHX");
  assert.equal(sanitizeInitials("ab"), "ABA");
  assert.equal(sanitizeInitials(""), "AAA");
  assert.equal(sanitizeInitials(null), "AAA");
  assert.equal(sanitizeInitials("zzzzzz"), "ZZZ");
  assert.equal(sanitizeInitials("1<script>2"), "SCR");
});

test("whack: higher score wins, ties lose", () => {
  assert.equal(isNewBest("whack", 100, null), true);
  assert.equal(isNewBest("whack", 100, { value: 90 }), true);
  assert.equal(isNewBest("whack", 90, { value: 90 }), false);
  assert.equal(isNewBest("whack", 80, { value: 90 }), false);
});

test("reflex and memory: lower wins", () => {
  assert.equal(isNewBest("reflex", 250, { value: 300 }), true);
  assert.equal(isNewBest("reflex", 300, { value: 250 }), false);
  assert.equal(isNewBest("memory", 12, { value: 14 }), true);
  assert.equal(isNewBest("memory", 14, { value: 12 }), false);
});

test("garbage values never count", () => {
  assert.equal(isNewBest("whack", 0, null), false);
  assert.equal(isNewBest("whack", -5, null), false);
  assert.equal(isNewBest("whack", Number.NaN, null), false);
  assert.equal(isNewBest("nope", 100, null), false);
});

test("corrupt saved entry is replaced", () => {
  assert.equal(isNewBest("whack", 10, { value: "lol" }), true);
});

test("fmtValue renders per-game units and em-dashes when empty", () => {
  assert.equal(fmtValue("whack", { value: 340 }), "340 PTS");
  assert.equal(fmtValue("reflex", { value: 231 }), "231 MS AVG");
  assert.equal(fmtValue("memory", { value: 14 }), "14 MOVES");
  assert.equal(fmtValue("whack", null), "———");
});

test("cycleLetter wraps both ways", () => {
  assert.equal(cycleLetter("A", 1), "B");
  assert.equal(cycleLetter("Z", 1), "A");
  assert.equal(cycleLetter("A", -1), "Z");
  assert.equal(cycleLetter("M", -1), "L");
  assert.equal(cycleLetter("?", 1), "B"); // sanitized to A first
});

test("all three games are configured", () => {
  assert.deepEqual(
    GAMES.map((g) => g.key),
    ["whack", "reflex", "memory"],
  );
});
