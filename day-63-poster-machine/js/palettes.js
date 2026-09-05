// Poster palettes. Every palette has the same shape so systems can be written
// once: { id, name, bg, ink, accent, colors[5] }. Curated palettes are
// addressed by their index letter (A–H) in seed codes; seeded palettes are
// generated from a 15-bit seed (see seededPalette, added with the palette
// commit).

export const CURATED_PALETTES = [
  {
    id: "swiss-red",
    name: "Swiss Red",
    bg: "#f2eee6",
    ink: "#151412",
    accent: "#e23a2b",
    colors: ["#e23a2b", "#151412", "#2f4fa2", "#f0c02f", "#8c8a84"],
  },
  {
    id: "night-voltage",
    name: "Night Voltage",
    bg: "#101114",
    ink: "#f2f1ec",
    accent: "#d6ff3d",
    colors: ["#d6ff3d", "#ff4b1f", "#4f7cff", "#f2f1ec", "#7a7d86"],
  },
];

export function curatedIndex(id) {
  return Math.max(0, CURATED_PALETTES.findIndex((palette) => palette.id === id));
}

export function curatedLetter(id) {
  return String.fromCharCode(65 + curatedIndex(id));
}

export function findCurated(id) {
  return CURATED_PALETTES[curatedIndex(id)];
}

/** Resolves a state palette reference ({mode, id|seed}) to a palette object. */
export function resolvePalette(ref) {
  if (!ref || ref.mode !== "seeded") return findCurated(ref && ref.id);
  return findCurated(CURATED_PALETTES[0].id);
}

/** Picks a curated palette id that differs from `currentId`. */
export function chooseDifferentPalette(currentId, random = Math.random) {
  const others = CURATED_PALETTES.filter((palette) => palette.id !== currentId);
  const pool = others.length ? others : CURATED_PALETTES;
  return pool[Math.floor(random() * pool.length)].id;
}
