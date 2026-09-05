// Poster Machine — seeded randomness.
// Every poster is a pure function of its seeds, so the generator has to be
// tiny, fast and bit-exact in every browser and in node (for the tests).

/** mulberry32: 32-bit state, returns floats in [0, 1). */
export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mixes a seed with a salt (murmur3-style finalizer) so one layout seed can
 * feed several independent streams — system geometry, noise, colour roles —
 * without those streams being correlated with each other.
 */
export function hashSeed(seed, salt = 0) {
  let h = ((seed >>> 0) + 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (salt >>> 0), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Draws an integer with `bits` random bits from a [0, 1) source. */
export function randomBits(random, bits) {
  return Math.floor(random() * 2 ** bits);
}

/* Small helpers every system's plan() uses. All take the rng explicitly so a
   plan never reaches for Math.random by accident. */
export const pick = (rng, list) => list[Math.floor(rng() * list.length)];
export const range = (rng, min, max) => min + rng() * (max - min);
export const rangeInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
export const chance = (rng, probability) => rng() < probability;

/** Shuffles a copy of `list` (Fisher–Yates) with the given rng. */
export function shuffle(rng, list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Test helper: wraps an rng and counts how many draws it served. */
export function countingRng(rng) {
  const counter = () => {
    counter.count += 1;
    return rng();
  };
  counter.count = 0;
  return counter;
}
