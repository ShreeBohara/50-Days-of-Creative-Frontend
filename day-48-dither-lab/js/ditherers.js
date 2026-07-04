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

// ---- registry ------------------------------------------------------------------
// label: ticket/UI text · diffusion: true → serpentine toggle applies

export const DITHERERS = {
  "floyd-steinberg": { label: "floyd–steinberg", fn: floydSteinberg, diffusion: true },
  none: { label: "no dither", fn: quantizeNearest, diffusion: false },
};
