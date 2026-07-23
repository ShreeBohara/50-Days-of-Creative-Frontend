import test from "node:test";
import assert from "node:assert/strict";
import {
  PASTELS,
  ICONS,
  MAX_ENTRIES,
  NAME_MAX,
  MESSAGE_MAX,
  sanitizeEntry,
  createEntry,
  addEntry,
  loadEntries,
  SEED_ENTRIES,
} from "../js/guestbook.js";
import { createStore } from "../js/storage.js";

function fakeArea() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
  };
}

test("sanitizeEntry trims, caps and defaults the name", () => {
  const long = "z".repeat(500);
  const entry = sanitizeEntry({ name: `   ${long}   `, message: `  hi there  ${long}` });
  assert.equal(entry.name.length, NAME_MAX);
  assert.equal(entry.message.length, MESSAGE_MAX);
  assert.equal(sanitizeEntry({ name: "   ", message: "yo" }).name, "anonymous");
});

test("createEntry derives a stable color and icon from the id", () => {
  const a = createEntry({ name: "a", message: "m" }, 0, "fixed-id");
  const b = createEntry({ name: "b", message: "n" }, 99, "fixed-id");
  assert.equal(a.colorIndex, b.colorIndex);
  assert.equal(a.iconIndex, b.iconIndex);
  assert.ok(a.colorIndex >= 0 && a.colorIndex < PASTELS.length);
  assert.ok(a.iconIndex >= 0 && a.iconIndex < ICONS.length);
});

test("the guestbook seeds exactly three starter entries, once", () => {
  const store = createStore(fakeArea());
  assert.equal(SEED_ENTRIES.length, 3);
  assert.deepEqual(loadEntries(store), SEED_ENTRIES);
  // Emptying the book must NOT re-seed on the next load.
  store.setJSON("guestbook", []);
  assert.deepEqual(loadEntries(store), []);
});

test("addEntry prepends and drops the oldest past the cap", () => {
  let entries = [];
  for (let i = 0; i < MAX_ENTRIES + 5; i += 1) {
    entries = addEntry(entries, createEntry({ name: `n${i}`, message: "m" }, i, `id-${i}`));
  }
  assert.equal(entries.length, MAX_ENTRIES);
  assert.equal(entries[0].id, `id-${MAX_ENTRIES + 4}`);
  assert.equal(entries.at(-1).id, "id-5");
});
