// Readable seed codes: SYS-LLLL-P
//   SYS   three-letter system mnemonic (SWS, FLW, BAU, TER, GLT)
//   LLLL  20-bit layout seed in Crockford base32 (no I, L, O, U)
//   P     curated palette letter A–H, or X + 3 base32 chars (15-bit seed)
// Text and finish are deliberately not encoded: the code is the poster's
// generative identity, not the session's settings.
import { SYSTEMS } from "./systems/index.js";
import { CURATED_PALETTES, curatedIndex } from "./palettes.js";
import { LAYOUT_BITS, PALETTE_BITS } from "./state.js";

export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CONFUSABLES = { O: "0", I: "1", L: "1" };

export function encodeBase32(value, width) {
  let n = Math.max(0, Math.floor(value));
  let out = "";
  for (let i = 0; i < width; i += 1) {
    out = ALPHABET[n & 31] + out;
    n = Math.floor(n / 32);
  }
  return out;
}

/** Decodes a base32 field (confusables mapped); null on any bad character. */
export function decodeBase32(str) {
  let n = 0;
  for (const raw of str) {
    const ch = CONFUSABLES[raw] ?? raw;
    const index = ALPHABET.indexOf(ch);
    if (index < 0) return null;
    n = n * 32 + index;
  }
  return n;
}

/** Uppercases and strips everything that is not a letter or digit. */
export function normalizeCode(input) {
  return String(input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function encodeCode(state) {
  const system = SYSTEMS.find((s) => s.id === state.system) || SYSTEMS[0];
  const layout = encodeBase32(state.layoutSeed, 4);
  const palette = state.palette.mode === "seeded"
    ? `X${encodeBase32(state.palette.seed, 3)}`
    : String.fromCharCode(65 + curatedIndex(state.palette.id));
  return `${system.code}-${layout}-${palette}`;
}

/** Parses a code; returns { ok, system, layoutSeed, palette } or { ok: false, reason }. */
export function decodeCode(input) {
  const code = normalizeCode(input);
  if (code.length !== 8 && code.length !== 11) return { ok: false, reason: "length" };
  const system = SYSTEMS.find((s) => s.code === code.slice(0, 3));
  if (!system) return { ok: false, reason: "system" };
  const layoutSeed = decodeBase32(code.slice(3, 7));
  if (layoutSeed == null || layoutSeed >= 2 ** LAYOUT_BITS) return { ok: false, reason: "layout" };
  const group = code.slice(7);
  let palette;
  if (group.length === 1) {
    const index = group.charCodeAt(0) - 65;
    if (index < 0 || index >= CURATED_PALETTES.length) return { ok: false, reason: "palette" };
    palette = { mode: "curated", id: CURATED_PALETTES[index].id };
  } else {
    if (group[0] !== "X") return { ok: false, reason: "palette" };
    const seed = decodeBase32(group.slice(1));
    if (seed == null || seed >= 2 ** PALETTE_BITS) return { ok: false, reason: "palette" };
    palette = { mode: "seeded", seed };
  }
  return { ok: true, system: system.id, layoutSeed, palette };
}

export function isValidCode(input) {
  return decodeCode(input).ok;
}
