/* textureRecipes.js — pure data: the six procedural "photographs".
 *
 * Each recipe is a list of drawing ops in NORMALIZED coordinates
 * (0..1 on both axes, origin top-left). textures.js interprets the
 * ops onto an offscreen 1024x1024 canvas. Keeping the specs as pure
 * data means they can be unit-tested with plain `node --test` —
 * no DOM, no canvas.
 *
 * Op vocabulary (OP_TYPES):
 *   solid    {color}
 *   linear   {from:[x,y], to:[x,y], stops:[{at,color,alpha?}], region?:[x,y,w,h]}
 *   radial   {center:[x,y], radius, stops:[{at,color,alpha?}]}
 *   poly     {points:[[x,y]..], color, alpha?}
 *   circle   {center:[x,y], r, color, alpha?}
 *   ellipse  {center:[x,y], rx, ry, rot, color, alpha?}   (rot in radians)
 *   path     {start:[x,y], curves:[[c1x,c1y,c2x,c2y,x,y]..], color, alpha?}
 *   strokes  {lines:[[[x,y]..]..], color, width, alpha?}
 *   waves    {count, y0, gap, amp, freq, color, width, alpha?}
 *   dots     {count, seed, region:[x,y,w,h], rMin, rMax, color, alphaMin, alphaMax}
 *   grain    {amount, seed}
 *   vignette {strength}
 *
 * Every recipe ends with grain + vignette so the set reads as one
 * photographic series rather than six clip-arts.
 */

export const TEXTURE_SIZE = 1024;

export const OP_TYPES = [
  "solid", "linear", "radial", "poly", "circle", "ellipse",
  "path", "strokes", "waves", "dots", "grain", "vignette",
];

/* Deterministic PRNG (mulberry32) — dots/grain must render identically
 * on every load so the "photos" never change between visits. */
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatCaption(index, title) {
  return `${String(index + 1).padStart(2, "0")} — ${title}`;
}

/* semicircle bezier constant: kappa * r offsets the control points */
const K = 0.5523;

export const RECIPES = [
  {
    id: "dusk-ridge",
    title: "DUSK RIDGE",
    subtitle: "gradient atmospherics over three hand-set ridgelines",
    ops: [
      { type: "linear", from: [0, 0], to: [0, 1], stops: [
        { at: 0.0, color: "#ecd0a9" },
        { at: 0.42, color: "#d98e5f" },
        { at: 0.68, color: "#a05064" },
        { at: 1.0, color: "#2f2440" },
      ] },
      { type: "circle", center: [0.62, 0.34], r: 0.055, color: "#f6e3c2", alpha: 0.9 },
      { type: "poly", color: "#8a5570", alpha: 0.85, points: [
        [0, 0.60], [0.12, 0.52], [0.22, 0.56], [0.34, 0.47], [0.45, 0.54],
        [0.58, 0.45], [0.70, 0.52], [0.82, 0.46], [1, 0.55], [1, 1], [0, 1],
      ] },
      { type: "poly", color: "#5c3a5a", alpha: 0.92, points: [
        [0, 0.72], [0.15, 0.64], [0.28, 0.69], [0.40, 0.60], [0.55, 0.68],
        [0.68, 0.59], [0.80, 0.66], [1, 0.62], [1, 1], [0, 1],
      ] },
      { type: "poly", color: "#2b2138", points: [
        [0, 0.88], [0.18, 0.78], [0.33, 0.84], [0.50, 0.74], [0.66, 0.82],
        [0.85, 0.75], [1, 0.80], [1, 1], [0, 1],
      ] },
      { type: "grain", amount: 0.07, seed: 611 },
      { type: "vignette", strength: 0.34 },
    ],
  },

  {
    id: "sea-level",
    title: "SEA LEVEL",
    subtitle: "a pale horizon, five sine tides, one low sun",
    ops: [
      { type: "linear", from: [0, 0], to: [0, 1], stops: [
        { at: 0.0, color: "#dfe5e9" },
        { at: 0.62, color: "#f2efe9" },
        { at: 1.0, color: "#f2efe9" },
      ] },
      { type: "radial", center: [0.28, 0.52], radius: 0.30, stops: [
        { at: 0.0, color: "#e8a87c", alpha: 0.55 },
        { at: 1.0, color: "#e8a87c", alpha: 0.0 },
      ] },
      { type: "circle", center: [0.28, 0.52], r: 0.065, color: "#e8a87c" },
      { type: "poly", color: "#6c7d86", points: [
        [0, 0.62], [1, 0.62], [1, 1], [0, 1],
      ] },
      { type: "waves", count: 5, y0: 0.68, gap: 0.062, amp: 0.006,
        freq: 9, color: "#dfe8ec", width: 0.0035, alpha: 0.85 },
      { type: "grain", amount: 0.05, seed: 612 },
      { type: "vignette", strength: 0.26 },
    ],
  },

  {
    id: "figure-i",
    title: "FIGURE I",
    subtitle: "duotone bust on a split ground",
    ops: [
      { type: "poly", color: "#efe6d8", points: [[0, 0], [0.5, 0], [0.5, 1], [0, 1]] },
      { type: "poly", color: "#c65f3d", points: [[0.5, 0], [1, 0], [1, 1], [0.5, 1]] },
      /* head + shoulders silhouette, one closed bezier path */
      { type: "path", color: "#1a1815", start: [0.28, 1.0], curves: [
        [0.29, 0.82, 0.35, 0.72, 0.43, 0.66],   // left shoulder rise
        [0.46, 0.64, 0.45, 0.60, 0.44, 0.55],   // neck pinch left
        [0.38, 0.50, 0.38, 0.38, 0.44, 0.31],   // skull back-left
        [0.50, 0.24, 0.60, 0.26, 0.63, 0.34],   // crown to brow
        [0.66, 0.42, 0.63, 0.50, 0.58, 0.55],   // face slope
        [0.57, 0.60, 0.58, 0.64, 0.62, 0.67],   // neck pinch right
        [0.70, 0.72, 0.74, 0.84, 0.75, 1.0],    // right shoulder fall
      ] },
      { type: "dots", count: 110, seed: 613, region: [0, 0, 1, 1],
        rMin: 0.0015, rMax: 0.004, color: "#efe6d8", alphaMin: 0.05, alphaMax: 0.16 },
      { type: "grain", amount: 0.06, seed: 614 },
      { type: "vignette", strength: 0.22 },
    ],
  },

  {
    id: "analog-grid",
    title: "ANALOG GRID",
    subtitle: "bauhaus print — rule grid, half-disc, slate block",
    ops: [
      { type: "solid", color: "#f1ece2" },
      { type: "strokes", color: "#1a1815", width: 0.0018, alpha: 0.18, lines: [
        [[0.125, 0], [0.125, 1]], [[0.25, 0], [0.25, 1]], [[0.375, 0], [0.375, 1]],
        [[0.5, 0], [0.5, 1]], [[0.625, 0], [0.625, 1]], [[0.75, 0], [0.75, 1]],
        [[0.875, 0], [0.875, 1]],
        [[0, 0.125], [1, 0.125]], [[0, 0.25], [1, 0.25]], [[0, 0.375], [1, 0.375]],
        [[0, 0.5], [1, 0.5]], [[0, 0.625], [1, 0.625]], [[0, 0.75], [1, 0.75]],
        [[0, 0.875], [1, 0.875]],
      ] },
      /* half-disc, flat side down: two kappa arcs from left to right */
      { type: "path", color: "#c65f3d", start: [0.14, 0.52], curves: [
        [0.14, 0.3654, 0.2654, 0.24, 0.42, 0.24],
        [0.5746, 0.24, 0.70, 0.3654, 0.70, 0.52],
      ] },
      { type: "poly", color: "#41506b", alpha: 0.92, points: [
        [0.52, 0.42], [0.82, 0.42], [0.82, 0.76], [0.52, 0.76],
      ] },
      { type: "circle", center: [0.30, 0.70], r: 0.045, color: "#1a1815" },
      { type: "grain", amount: 0.04, seed: 615 },
      { type: "vignette", strength: 0.18 },
    ],
  },

  {
    id: "night-signal",
    title: "NIGHT SIGNAL",
    subtitle: "starfield, one beam, a waning crescent",
    ops: [
      { type: "radial", center: [0.5, 0.35], radius: 1.0, stops: [
        { at: 0.0, color: "#232447" },
        { at: 0.55, color: "#14152e" },
        { at: 1.0, color: "#0a0a18" },
      ] },
      { type: "dots", count: 130, seed: 616, region: [0, 0, 1, 1],
        rMin: 0.0012, rMax: 0.004, color: "#e8ecf4", alphaMin: 0.25, alphaMax: 0.95 },
      { type: "linear", from: [0.44, 0], to: [0.56, 0], region: [0.44, 0, 0.12, 1], stops: [
        { at: 0.0, color: "#cdd6ff", alpha: 0.0 },
        { at: 0.5, color: "#cdd6ff", alpha: 0.28 },
        { at: 1.0, color: "#cdd6ff", alpha: 0.0 },
      ] },
      { type: "circle", center: [0.72, 0.22], r: 0.085, color: "#e9e4d5" },
      { type: "circle", center: [0.755, 0.205], r: 0.075, color: "#14152e" },
      { type: "grain", amount: 0.09, seed: 617 },
      { type: "vignette", strength: 0.42 },
    ],
  },

  {
    id: "botanic-shadow",
    title: "BOTANIC SHADOW",
    subtitle: "sun through leaves, cast on warm paper",
    ops: [
      { type: "solid", color: "#ece4d4" },
      { type: "strokes", color: "#2f4a35", width: 0.004, alpha: 0.22, lines: [
        [[0.18, 1.0], [0.34, 0.52], [0.42, 0.18]],
        [[0.55, 1.0], [0.62, 0.6], [0.78, 0.24]],
      ] },
      { type: "ellipse", center: [0.30, 0.42], rx: 0.14, ry: 0.055, rot: -0.6, color: "#2f4a35", alpha: 0.20 },
      { type: "ellipse", center: [0.42, 0.28], rx: 0.12, ry: 0.048, rot: -0.9, color: "#2f4a35", alpha: 0.16 },
      { type: "ellipse", center: [0.36, 0.60], rx: 0.16, ry: 0.06, rot: -0.35, color: "#2f4a35", alpha: 0.24 },
      { type: "ellipse", center: [0.24, 0.78], rx: 0.13, ry: 0.05, rot: -0.7, color: "#2f4a35", alpha: 0.18 },
      { type: "ellipse", center: [0.62, 0.46], rx: 0.15, ry: 0.058, rot: 0.55, color: "#2f4a35", alpha: 0.22 },
      { type: "ellipse", center: [0.72, 0.32], rx: 0.12, ry: 0.046, rot: 0.85, color: "#2f4a35", alpha: 0.16 },
      { type: "ellipse", center: [0.68, 0.66], rx: 0.17, ry: 0.062, rot: 0.3, color: "#2f4a35", alpha: 0.26 },
      { type: "ellipse", center: [0.82, 0.55], rx: 0.11, ry: 0.045, rot: 0.75, color: "#2f4a35", alpha: 0.15 },
      { type: "ellipse", center: [0.50, 0.82], rx: 0.15, ry: 0.055, rot: 0.15, color: "#2f4a35", alpha: 0.20 },
      { type: "grain", amount: 0.05, seed: 618 },
      { type: "vignette", strength: 0.28 },
    ],
  },
];
