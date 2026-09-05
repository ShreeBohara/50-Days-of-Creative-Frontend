// Poster palettes. Every palette has the same shape so systems are written
// once: { id, name, bg, ink, accent, colors[5] }. Curated palettes are
// addressed by their index letter (A–H) in seed codes; seeded palettes are
// generated from a 15-bit seed and repaired until they pass the same
// contrast guard the curated set is tested against.
import { mulberry32, hashSeed, pick, range } from "./rng.js";
import { hslToHex, contrast } from "./color.js";

export const CURATED_PALETTES = [
  { id: "swiss-red", name: "Swiss Red", bg: "#f2eee6", ink: "#151412", accent: "#e23a2b",
    colors: ["#e23a2b", "#151412", "#2f4fa2", "#e0a800", "#8c8a84"] },
  { id: "bauhaus", name: "Bauhaus Primary", bg: "#efe6d2", ink: "#1d1a17", accent: "#d7261e",
    colors: ["#d7261e", "#e8a900", "#1f4fa3", "#1d1a17", "#7a8a7e"] },
  { id: "ink-bone", name: "Ink & Bone", bg: "#e9e6df", ink: "#111111", accent: "#6e6e6a",
    colors: ["#111111", "#3a3a3a", "#6e6e6a", "#a3a29c", "#b5b3ac"] },
  { id: "night-voltage", name: "Night Voltage", bg: "#101114", ink: "#f2f1ec", accent: "#d6ff3d",
    colors: ["#d6ff3d", "#ff4b1f", "#4f7cff", "#f2f1ec", "#7a7d86"] },
  { id: "riso", name: "Riso Fluoro", bg: "#f7f3ea", ink: "#1c1b3a", accent: "#f0348f",
    colors: ["#0f5bd7", "#f0348f", "#f2b600", "#1c1b3a", "#3fb3a0"] },
  { id: "terracotta", name: "Terracotta", bg: "#e9d8c3", ink: "#2b1d16", accent: "#c4552d",
    colors: ["#c4552d", "#7a4a2b", "#5d6b3d", "#d99a45", "#2b1d16"] },
  { id: "glacier", name: "Glacier", bg: "#0b1a2b", ink: "#eaf2f7", accent: "#6fe3ff",
    colors: ["#6fe3ff", "#2b6cff", "#ffffff", "#9fb3c8", "#ff8a5b"] },
  { id: "acid", name: "Acid Terminal", bg: "#0d0f0a", ink: "#e8ffd0", accent: "#39ff14",
    colors: ["#39ff14", "#b6ff00", "#1f7a1f", "#e8ffd0", "#4d5c3f"] },
];

/* Contrast floors every palette (curated or seeded) must clear. */
export const GUARD = { ink: 7, accent: 2.5, color: 1.5 };
export const PALETTE_SALT = 0x50414c;

export function curatedIndex(id) {
  return Math.max(0, CURATED_PALETTES.findIndex((palette) => palette.id === id));
}

export function curatedLetter(id) {
  return String.fromCharCode(65 + curatedIndex(id));
}

export function findCurated(id) {
  return CURATED_PALETTES[curatedIndex(id)];
}

/** True when a palette clears the guard. */
export function passesGuard(palette) {
  return contrast(palette.ink, palette.bg) >= GUARD.ink
    && contrast(palette.accent, palette.bg) >= GUARD.accent
    && palette.colors.length === 5
    && palette.colors.every((c) => contrast(c, palette.bg) >= GUARD.color);
}

const SCHEMES = {
  analogous: [0, 30, -30, 60, -60],
  complementary: [0, 180, 150, 210, 30],
  split: [0, 150, 210, 30, -30],
  triadic: [0, 120, 240, 60, 180],
  mono: [0, 0, 0, 0, 0],
};

/* Nudges lightness away from the background until the floor is met. */
function repair(hsl, bg, floor, light) {
  let [h, s, l] = hsl;
  for (let i = 0; i < 12 && contrast(hslToHex(h, s, l), bg) < floor; i += 1) {
    l = light ? Math.max(0.02, l - 0.06) : Math.min(0.98, l + 0.06);
  }
  return hslToHex(h, s, l);
}

const seededCache = new Map();

/** Deterministic palette from a 15-bit seed (fixed 24 draws), guard-repaired. */
export function seededPalette(seed) {
  const key = seed >>> 0;
  if (seededCache.has(key)) return seededCache.get(key);
  const rng = mulberry32(hashSeed(key, PALETTE_SALT));
  const scheme = pick(rng, Object.keys(SCHEMES));
  const baseHue = rng() * 360;
  const light = rng() < 0.65;
  const bgSat = range(rng, 0.05, 0.25);
  const bgL = light ? range(rng, 0.9, 0.96) : range(rng, 0.07, 0.14);
  const accentSat = range(rng, 0.85, 1);
  const accentL = light ? range(rng, 0.42, 0.55) : range(rng, 0.55, 0.68);
  const hues = SCHEMES[scheme].map((offset) => baseHue + offset);
  const bg = hslToHex(baseHue, bgSat, bgL);
  const ink = repair([baseHue, 0.2, light ? 0.09 : 0.94], bg, GUARD.ink, light);
  const accent = repair([hues[1], accentSat, accentL], bg, GUARD.accent, light);
  const colors = [];
  for (let i = 0; i < 5; i += 1) {
    const jitter = range(rng, -8, 8);
    const sat = scheme === "mono" ? range(rng, 0.08, 0.3) : range(rng, 0.55, 0.95);
    const lig = light ? range(rng, 0.3, 0.6) : range(rng, 0.45, 0.78);
    colors.push(repair([hues[i] + jitter, sat, lig], bg, GUARD.color, light));
  }
  const palette = { id: "seeded", name: `Seeded ${scheme}`, bg, ink, accent, colors };
  if (seededCache.size > 128) seededCache.clear();
  seededCache.set(key, palette);
  return palette;
}

/** Resolves a state palette reference ({mode, id|seed}) to a palette object. */
export function resolvePalette(ref) {
  if (!ref || ref.mode !== "seeded") return findCurated(ref && ref.id);
  return seededPalette(ref.seed);
}

/** Picks a curated palette id that differs from `currentId`. */
export function chooseDifferentPalette(currentId, random = Math.random) {
  const others = CURATED_PALETTES.filter((palette) => palette.id !== currentId);
  const pool = others.length ? others : CURATED_PALETTES;
  return pool[Math.floor(random() * pool.length)].id;
}
