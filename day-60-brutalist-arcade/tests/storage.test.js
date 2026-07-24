import test from "node:test";
import assert from "node:assert/strict";
import { createStore, getScores, DEFAULT_SCORES } from "../js/storage.js";

function fakeBackend() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test("get returns fallback when key missing", () => {
  const s = createStore(fakeBackend());
  assert.equal(s.get("nope", 42), 42);
});

test("set/get round-trips JSON values", () => {
  const s = createStore(fakeBackend());
  const value = { a: 1, b: ["x", "y"], c: { nested: true } };
  assert.equal(s.set("thing", value), true);
  assert.deepEqual(s.get("thing", null), value);
});

test("keys are namespaced", () => {
  const backend = fakeBackend();
  const s = createStore(backend);
  s.set("muted", true);
  assert.deepEqual([...backend.map.keys()], ["voltage-60:muted"]);
});

test("null backend is inert", () => {
  const s = createStore(null);
  assert.equal(s.set("x", 1), false);
  assert.equal(s.get("x", "fb"), "fb");
});

test("throwing backend falls back", () => {
  const s = createStore({
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("quota");
    },
  });
  assert.equal(s.set("x", 1), false);
  assert.equal(s.get("x", "fb"), "fb");
});

test("corrupt JSON falls back", () => {
  const backend = fakeBackend();
  backend.map.set("voltage-60:scores", "{not json");
  const s = createStore(backend);
  assert.equal(s.get("scores", "fb"), "fb");
});

test("getScores merges saved partials over defaults", () => {
  const backend = fakeBackend();
  const s = createStore(backend);
  s.set("scores", { whack: { value: 120, initials: "SHR" } });
  const scores = getScores(s);
  assert.deepEqual(scores.whack, { value: 120, initials: "SHR" });
  assert.equal(scores.reflex, null);
  assert.equal(scores.memory, null);
});

test("getScores survives non-object garbage", () => {
  const backend = fakeBackend();
  backend.map.set("voltage-60:scores", JSON.stringify("lol"));
  const scores = getScores(createStore(backend));
  assert.deepEqual(scores, DEFAULT_SCORES);
});
