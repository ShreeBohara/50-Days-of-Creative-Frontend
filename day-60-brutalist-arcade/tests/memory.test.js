import test from "node:test";
import assert from "node:assert/strict";
import {
  CARD_COUNT,
  ICONS,
  createDeck,
  createGame,
  flipCard,
  settle,
} from "../js/memoryLogic.js";

function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test("deck has 16 cards, two of each icon", () => {
  const deck = createDeck(seededRand(7));
  assert.equal(deck.length, CARD_COUNT);
  for (const icon of ICONS) {
    assert.equal(deck.filter((c) => c === icon).length, 2, icon);
  }
});

test("deck shuffle is deterministic per seed and varies across seeds", () => {
  const a = createDeck(seededRand(1));
  const b = createDeck(seededRand(1));
  const c = createDeck(seededRand(2));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("first flip goes up without counting a move", () => {
  const game = createGame(["bolt", "star", "bolt", "star"]);
  const { game: next, result } = flipCard(game, 0);
  assert.equal(result, "up");
  assert.deepEqual(next.up, [0]);
  assert.equal(next.moves, 0);
});

test("matching pair resolves and counts one move", () => {
  let game = createGame(["bolt", "star", "bolt", "star"]);
  game = flipCard(game, 0).game;
  const { game: next, result } = flipCard(game, 2);
  assert.equal(result, "match");
  assert.deepEqual(next.matched, [0, 2]);
  assert.deepEqual(next.up, []);
  assert.equal(next.moves, 1);
});

test("mismatch stays up until settle", () => {
  let game = createGame(["bolt", "star", "bolt", "star"]);
  game = flipCard(game, 0).game;
  const { game: next, result } = flipCard(game, 1);
  assert.equal(result, "mismatch");
  assert.deepEqual(next.up, [0, 1]);
  assert.equal(next.moves, 1);
  const settled = settle(next);
  assert.deepEqual(settled.up, []);
  assert.deepEqual(settled.matched, []);
});

test("ignores: same card, matched card, third card, out of range", () => {
  let game = createGame(["bolt", "star", "bolt", "star"]);
  game = flipCard(game, 0).game;
  assert.equal(flipCard(game, 0).result, "ignore");
  assert.equal(flipCard(game, -1).result, "ignore");
  assert.equal(flipCard(game, 99).result, "ignore");

  game = flipCard(game, 2).game; // bolts 0/2 now matched
  assert.equal(flipCard(game, 0).result, "ignore");

  game = flipCard(game, 1).game;
  const last = flipCard(game, 3); // stars 1/3 close out the deck
  assert.equal(last.result, "win");
});

test("clearing all pairs wins", () => {
  let game = createGame(["bolt", "bolt", "star", "star"]);
  game = flipCard(game, 0).game;
  const m1 = flipCard(game, 1);
  assert.equal(m1.result, "match");
  game = flipCard(m1.game, 2).game;
  const m2 = flipCard(game, 3);
  assert.equal(m2.result, "win");
  assert.equal(m2.game.done, true);
  assert.equal(m2.game.moves, 2);
});

test("flips after win are ignored", () => {
  let game = createGame(["bolt", "bolt"]);
  game = flipCard(game, 0).game;
  game = flipCard(game, 1).game;
  assert.equal(game.done, true);
  assert.equal(flipCard(game, 0).result, "ignore");
});
