// Leaderboard pure rules: per-game direction, initials hygiene, letter cycling.

export const GAMES = [
  { key: "whack", label: "WHACK-A-DIV", unit: "PTS", direction: "high" },
  { key: "reflex", label: "REFLEX DUEL", unit: "MS AVG", direction: "low" },
  { key: "memory", label: "MEMORY PAIRS", unit: "MOVES", direction: "low" },
];

// Exactly three A-Z letters, arcade rules. Garbage pads out to AAA.
export function sanitizeInitials(raw) {
  const clean = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);
  return clean.padEnd(3, "A");
}

export function isNewBest(gameKey, value, current) {
  const game = GAMES.find((g) => g.key === gameKey);
  if (!game) return false;
  if (!Number.isFinite(value) || value <= 0) return false;
  if (!current || !Number.isFinite(current.value)) return true;
  return game.direction === "high" ? value > current.value : value < current.value;
}

export function fmtValue(gameKey, entry) {
  if (!entry || !Number.isFinite(entry.value)) return "———";
  const game = GAMES.find((g) => g.key === gameKey);
  return game ? `${entry.value} ${game.unit}` : String(entry.value);
}

// Cycle one initial through A-Z in either direction, wrapping.
export function cycleLetter(letter, step) {
  const base = "A".charCodeAt(0);
  const code = sanitizeInitials(letter).charCodeAt(0) - base;
  const next = (code + step + 26 * 100) % 26;
  return String.fromCharCode(base + next);
}
