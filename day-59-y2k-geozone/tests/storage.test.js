import test from "node:test";
import assert from "node:assert/strict";
import { NS, createStore } from "../js/storage.js";

function fakeArea(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    keys: () => [...map.keys()],
  };
}

function throwingArea() {
  return {
    getItem: () => {
      throw new Error("private mode");
    },
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };
}

test("JSON values round-trip through the backing area", () => {
  const store = createStore(fakeArea());
  store.setJSON("stickers", { smiley: { xPct: 12.5, yPct: 40 } });
  assert.deepEqual(store.getJSON("stickers", null), { smiley: { xPct: 12.5, yPct: 40 } });
});

test("every key is namespaced with the day59 prefix", () => {
  const area = fakeArea();
  const store = createStore(area);
  store.setJSON("hits", 42);
  assert.deepEqual(area.keys(), [`${NS}hits`]);
});

test("corrupt JSON returns the fallback instead of throwing", () => {
  const store = createStore(fakeArea({ [`${NS}guestbook`]: "{not json" }));
  assert.deepEqual(store.getJSON("guestbook", []), []);
});

test("a throwing backing area falls back to memory without erroring", () => {
  const store = createStore(throwingArea());
  store.setJSON("hits", 7);
  assert.equal(store.getJSON("hits", 0), 7);
});

test("has() distinguishes absent keys from stored empty values", () => {
  const store = createStore(fakeArea());
  assert.equal(store.has("guestbook"), false);
  store.setJSON("guestbook", []);
  assert.equal(store.has("guestbook"), true);
});
