// Reflex Duel pure rules.

export const MIN_DELAY_MS = 1000;
export const MAX_DELAY_MS = 4000;
export const ROUNDS = 5;

// Random arm delay in [1s, 4s].
export function randomDelay(rand = Math.random) {
  return Math.round(MIN_DELAY_MS + rand() * (MAX_DELAY_MS - MIN_DELAY_MS));
}
