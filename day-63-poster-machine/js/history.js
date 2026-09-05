// Reroll history — a pure, newest-first ring of the last eight posters.
export const HISTORY_CAP = 8;

/** Adds `entry` at the head, dropping an older entry with the same code. */
export function pushHistory(list, entry, cap = HISTORY_CAP) {
  const rest = list.filter((item) => item.code !== entry.code);
  return [entry, ...rest].slice(0, Math.max(1, cap));
}

export function findByCode(list, code) {
  return list.find((item) => item.code === code) || null;
}
