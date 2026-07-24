// Reflex Duel pure rules.

export const MIN_DELAY_MS = 1000;
export const MAX_DELAY_MS = 4000;
export const ROUNDS = 5;

// Random arm delay in [1s, 4s].
export function randomDelay(rand = Math.random) {
  return Math.round(MIN_DELAY_MS + rand() * (MAX_DELAY_MS - MIN_DELAY_MS));
}

// Rank ladder judged on the best-of-5 average. `max` is exclusive.
export const RANKS = [
  { max: 200, name: "VOLTAGE", tag: "ARE YOU EVEN HUMAN?" },
  { max: 300, name: "CAFFEINATED", tag: "THE CAN IS WORKING" },
  { max: 450, name: "HUMAN", tag: "ADEQUATE. DRINK MORE." },
  { max: Infinity, name: "SLOTH", tag: "DID YOU MAIL THAT CLICK?" },
];

export function average(times) {
  if (!Array.isArray(times) || times.length === 0) return 0;
  const sum = times.reduce((acc, t) => acc + t, 0);
  return Math.round(sum / times.length);
}

export function rankFor(avgMs) {
  return RANKS.find((rank) => avgMs < rank.max) ?? RANKS[RANKS.length - 1];
}
