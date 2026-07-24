// Whack-a-Div pure rules. No DOM here so node:test can chew on it.

export const ROUND_MS = 30000;
export const START_POP_MS = 600;
export const END_POP_MS = 300;
export const START_GAP_MS = 420;
export const END_GAP_MS = 200;
export const MAX_MISSES = 3;
export const BASE_POINTS = 10;
export const CELL_COUNT = 9;

function progress(elapsedMs) {
  if (!Number.isFinite(elapsedMs)) return 1;
  return Math.min(1, Math.max(0, elapsedMs / ROUND_MS));
}

// How long a div stays up: 600ms at t=0 shrinking linearly to 300ms at 30s.
export function popDuration(elapsedMs) {
  const t = progress(elapsedMs);
  return Math.round(START_POP_MS + (END_POP_MS - START_POP_MS) * t);
}

// Dead air between pops shrinks too, so late-round chaos compounds.
export function popGap(elapsedMs) {
  const t = progress(elapsedMs);
  return Math.round(START_GAP_MS + (END_GAP_MS - START_GAP_MS) * t);
}

// Streak thresholds: 3+ doubles, 6+ triples, 9+ quadruples.
export function comboMultiplier(streak) {
  if (streak >= 9) return 4;
  if (streak >= 6) return 3;
  if (streak >= 3) return 2;
  return 1;
}

// `streak` includes the hit being scored.
export function scoreForHit(streak) {
  return BASE_POINTS * comboMultiplier(streak);
}

// Next cell to pop; never repeats the previous cell.
export function pickCell(count, previous, rand = Math.random) {
  if (count <= 1) return 0;
  if (previous === null || previous === undefined || previous < 0 || previous >= count) {
    return Math.floor(rand() * count);
  }
  let idx = Math.floor(rand() * (count - 1));
  if (idx >= previous) idx += 1;
  return idx;
}
