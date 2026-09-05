import test from "node:test";
import assert from "node:assert/strict";
import { mulberry32, hashSeed, randomBits, countingRng, pick, rangeInt, shuffle } from "../js/rng.js";

const take = (rng, n) => Array.from({ length: n }, () => rng());

test("mulberry32 is deterministic per seed and stays in [0, 1)", () => {
  const a = take(mulberry32(63), 64);
  const b = take(mulberry32(63), 64);
  assert.deepEqual(a, b);
  assert.ok(a.every((v) => v >= 0 && v < 1));
});

test("different seeds give different streams", () => {
  assert.notDeepEqual(take(mulberry32(1), 8), take(mulberry32(2), 8));
});

test("hashSeed is stable and separates seeds and salts", () => {
  assert.equal(hashSeed(5, 1), hashSeed(5, 1));
  assert.notEqual(hashSeed(5, 1), hashSeed(5, 2));
  assert.notEqual(hashSeed(5, 1), hashSeed(6, 1));
  const h = hashSeed(0, 0);
  assert.ok(Number.isInteger(h) && h >= 0 && h < 2 ** 32);
});

test("randomBits honours the bit width at both ends", () => {
  assert.equal(randomBits(() => 0, 20), 0);
  assert.equal(randomBits(() => 0.9999999, 20), 2 ** 20 - 1);
  assert.equal(randomBits(() => 0.5, 15), 2 ** 14);
});

test("countingRng counts draws", () => {
  const rng = countingRng(mulberry32(9));
  rng(); rng(); rng();
  assert.equal(rng.count, 3);
});

test("pick and rangeInt are inclusive of their last option", () => {
  assert.equal(pick(() => 0.9999999, ["a", "b", "c"]), "c");
  assert.equal(pick(() => 0, ["a", "b", "c"]), "a");
  assert.equal(rangeInt(() => 0, 3, 7), 3);
  assert.equal(rangeInt(() => 0.9999999, 3, 7), 7);
});

test("shuffle is a seeded permutation that leaves the input alone", () => {
  const input = [1, 2, 3, 4, 5, 6];
  const out = shuffle(mulberry32(4), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual([...out].sort(), input);
  assert.deepEqual(out, shuffle(mulberry32(4), input));
});
