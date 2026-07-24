// Memory Pairs pure rules: deck building and a small flip reducer.

export const ICONS = [
  "bolt",
  "skull",
  "star",
  "eye",
  "flame",
  "diamond",
  "moon",
  "target",
];

export const CARD_COUNT = ICONS.length * 2;

// Fisher–Yates over two of each icon.
export function createDeck(rand = Math.random) {
  const deck = [...ICONS, ...ICONS];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createGame(deck) {
  return {
    deck,
    up: [], // indices currently face-up and unresolved (0..2)
    matched: [], // resolved indices
    moves: 0, // a move = two cards flipped
    done: false,
  };
}

// Flip card at `index`. Returns { game, result } where result is one of
// 'ignore' | 'up' | 'match' | 'mismatch' | 'win'. After a mismatch the UI
// shows both cards briefly, then calls settle() to flip them back.
export function flipCard(game, index) {
  if (
    game.done ||
    index < 0 ||
    index >= game.deck.length ||
    game.up.length >= 2 ||
    game.up.includes(index) ||
    game.matched.includes(index)
  ) {
    return { game, result: "ignore" };
  }

  const up = [...game.up, index];
  if (up.length < 2) {
    return { game: { ...game, up }, result: "up" };
  }

  const [a, b] = up;
  const moves = game.moves + 1;
  if (game.deck[a] === game.deck[b]) {
    const matched = [...game.matched, a, b];
    const done = matched.length === game.deck.length;
    return {
      game: { ...game, up: [], matched, moves, done },
      result: done ? "win" : "match",
    };
  }
  return { game: { ...game, up, moves }, result: "mismatch" };
}

// Clear an unresolved pair after a mismatch.
export function settle(game) {
  return { ...game, up: [] };
}
