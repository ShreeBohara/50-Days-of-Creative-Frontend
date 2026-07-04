// Curated retro palettes + the custom palette, plus the trick that makes the
// whole page feel alive: the UI accent color is pulled from whichever palette
// is active, so switching to Game Boy tints the chrome green, CGA goes neon.

export const PALETTES = {
  "1-bit": {
    label: "1-bit b/w",
    colors: [[23, 19, 11], [247, 243, 232]],
  },
  gameboy: {
    label: "game boy",
    colors: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
  },
  cga: {
    label: "cga neon",
    colors: [[10, 10, 10], [85, 255, 255], [255, 85, 255], [255, 255, 255]],
  },
  sepia: {
    label: "sepia print",
    colors: [[43, 30, 17], [112, 66, 20], [181, 136, 99], [233, 214, 183]],
  },
  amber: {
    label: "amber terminal",
    colors: [[26, 16, 4], [153, 102, 0], [255, 176, 0]],
  },
  custom: {
    label: "custom",
    colors: null, // resolved from state.customColors
  },
};

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]) {
  const p = (v) => v.toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`;
}

// Active palette as RGB triples, honoring the custom picker.
export function resolvePalette(state) {
  if (state.palette === "custom") {
    return state.customColors.map(hexToRgb);
  }
  return (PALETTES[state.palette] || PALETTES["1-bit"]).colors;
}

// ---- dynamic UI accent -----------------------------------------------------

const FALLBACK_ACCENT = "#9d3a1c"; // print-shop red, for neutral palettes

export function applyAccent(palette) {
  // most chromatic color wins; grayscale palettes fall back to print red
  let best = null;
  let bestChroma = 24; // anything flatter than this reads as neutral
  for (const c of palette) {
    const chroma = Math.max(...c) - Math.min(...c);
    if (chroma > bestChroma) { bestChroma = chroma; best = c; }
  }

  const root = document.documentElement.style;
  if (!best) {
    root.setProperty("--accent", FALLBACK_ACCENT);
    root.setProperty("--accent-text", "#f7f3e8");
    return;
  }
  const luma = 0.299 * best[0] + 0.587 * best[1] + 0.114 * best[2];
  root.setProperty("--accent", rgbToHex(best));
  root.setProperty("--accent-text", luma > 140 ? "#17130b" : "#f7f3e8");
}
