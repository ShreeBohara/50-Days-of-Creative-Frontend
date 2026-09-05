import test from "node:test";
import assert from "node:assert/strict";
import { pushHistory, findByCode, HISTORY_CAP } from "../js/history.js";

const entry = (code) => ({ code, snapshot: { code } });

test("pushHistory keeps newest first and caps at eight", () => {
  let list = [];
  for (let i = 0; i < 12; i += 1) list = pushHistory(list, entry(`C${i}`));
  assert.equal(list.length, HISTORY_CAP);
  assert.equal(list[0].code, "C11");
  assert.equal(list[HISTORY_CAP - 1].code, "C4");
});

test("pushHistory de-duplicates by code, moving it to the head", () => {
  let list = [entry("A"), entry("B"), entry("C")];
  list = pushHistory(list, entry("C"));
  assert.deepEqual(list.map((e) => e.code), ["C", "A", "B"]);
});

test("pushHistory never mutates its input", () => {
  const list = [entry("A")];
  pushHistory(list, entry("B"));
  assert.deepEqual(list.map((e) => e.code), ["A"]);
});

test("findByCode", () => {
  const list = [entry("A"), entry("B")];
  assert.equal(findByCode(list, "B").code, "B");
  assert.equal(findByCode(list, "Z"), null);
});
