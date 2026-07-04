// Dithering algorithms, all implemented from scratch on raw ImageData.
// Every ditherer mutates img.data in place: each pixel ends up on an exact
// palette color, and the *pattern* of those colors is what fakes the missing
// shades.

import { nearestColor, quantizeNearest } from "./pipeline.js";

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

// ---- error diffusion ---------------------------------------------------------
// Quantize pixels in scan order; push each pixel's rounding error onto its
// unvisited neighbors so the average tone survives. The kernel decides who
// receives how much. Serpentine scanning alternates direction per row, which
// breaks up the diagonal "worm" artifacts.

function errorDiffuse(img, palette, kernel, opts = {}) {
  const w = img.width;
  const h = img.height;
  const d = img.data;

  // float working copy of RGB so accumulated error isn't clamped away
  const buf = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; j < buf.length; i += 4, j += 3) {
    buf[j] = d[i]; buf[j + 1] = d[i + 1]; buf[j + 2] = d[i + 2];
  }

  for (let y = 0; y < h; y++) {
    const reverse = opts.serpentine && (y & 1) === 1;
    for (let step = 0; step < w; step++) {
      const x = reverse ? w - 1 - step : step;
      const j = (y * w + x) * 3;

      const r = clamp255(buf[j]);
      const g = clamp255(buf[j + 1]);
      const b = clamp255(buf[j + 2]);
      const p = nearestColor(r, g, b, palette);

      const i4 = (y * w + x) * 4;
      d[i4] = p[0]; d[i4 + 1] = p[1]; d[i4 + 2] = p[2];

      const er = r - p[0];
      const eg = g - p[1];
      const eb = b - p[2];

      for (let k = 0; k < kernel.length; k++) {
        const [dx, dy, wt] = kernel[k];
        const nx = x + (reverse ? -dx : dx);
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny >= h) continue;
        const nj = (ny * w + nx) * 3;
        buf[nj] += er * wt;
        buf[nj + 1] += eg * wt;
        buf[nj + 2] += eb * wt;
      }
    }
  }
}

// Floyd–Steinberg (1976) — the classic. Full error spread over 4 neighbors.
const FLOYD_STEINBERG = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16],
  [0, 1, 5 / 16],
  [1, 1, 1 / 16],
];

export function floydSteinberg(img, palette, opts) {
  errorDiffuse(img, palette, FLOYD_STEINBERG, opts);
}

// Atkinson (Bill Atkinson, original Macintosh / MacPaint) — spreads only 6/8
// of the error, letting highlights blow out and shadows crush. That lost
// error is exactly what gives old Mac images their signature airy contrast.
const ATKINSON = [
  [1, 0, 1 / 8],
  [2, 0, 1 / 8],
  [-1, 1, 1 / 8],
  [0, 1, 1 / 8],
  [1, 1, 1 / 8],
  [0, 2, 1 / 8],
];

export function atkinson(img, palette, opts) {
  errorDiffuse(img, palette, ATKINSON, opts);
}

// ---- ordered (Bayer) dithering --------------------------------------------------
// No error travels anywhere: each pixel is nudged up or down by a fixed
// threshold from a tiled matrix, then quantized. Produces the crosshatch
// texture burned into everyone's memory of early PC graphics.

const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// The 8×8 matrix is generated from the 4×4 by the standard recursive rule:
// M2n = [[4M, 4M+2], [4M+3, 4M+1]]
const BAYER_8 = (() => {
  const m = [];
  for (let y = 0; y < 8; y++) {
    m.push([]);
    for (let x = 0; x < 8; x++) {
      const q = BAYER_4[y % 4][x % 4] * 4;
      m[y].push(q + (y < 4 ? (x < 4 ? 0 : 2) : x < 4 ? 3 : 1));
    }
  }
  return m;
})();

function orderedDither(img, palette, matrix) {
  const w = img.width;
  const h = img.height;
  const d = img.data;
  const n = matrix.length;
  const levels = n * n;
  // Strength scales with how far apart the palette shades sit, roughly the
  // spacing of a gray ramp with palette.length stops.
  const spread = 255 / Math.max(2, palette.length);
  for (let y = 0; y < h; y++) {
    const row = matrix[y % n];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const t = ((row[x % n] + 0.5) / levels - 0.5) * spread;
      const p = nearestColor(
        clamp255(d[i] + t),
        clamp255(d[i + 1] + t),
        clamp255(d[i + 2] + t),
        palette
      );
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
    }
  }
}

export function bayer4(img, palette) {
  orderedDither(img, palette, BAYER_4);
}

export function bayer8(img, palette) {
  orderedDither(img, palette, BAYER_8);
}

// ---- registry ------------------------------------------------------------------
// label: ticket/UI text · diffusion: true → serpentine toggle applies

export const DITHERERS = {
  "floyd-steinberg": { label: "floyd–steinberg", fn: floydSteinberg, diffusion: true },
  atkinson: { label: "atkinson", fn: atkinson, diffusion: true },
  "bayer-4": { label: "bayer 4×4", fn: bayer4, diffusion: false },
  "bayer-8": { label: "bayer 8×8", fn: bayer8, diffusion: false },
  none: { label: "no dither", fn: quantizeNearest, diffusion: false },
};
