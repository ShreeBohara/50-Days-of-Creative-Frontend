// Glitch Stripes — the pure half: slice geometry, source-rect rounding and
// the duotone field values. Slices are drawn up front at the maximum count
// so the rng budget never depends on how many survive.
import { range, rangeInt, pick, chance } from "../rng.js";

export const MAX_SLICES = 26;
export const MAX_BANDS = 6;
export const FIELD_W = 96;
export const FIELD_H = 128;
export const GLITCH_DRAWS = 1 + MAX_SLICES * 5 + 1 + MAX_BANDS * 3 + 5 + 6;

export function planGlitch(rng) {
  const sliceCount = rangeInt(rng, 14, MAX_SLICES);
  const slices = [];
  for (let i = 0; i < MAX_SLICES; i += 1) {
    slices.push({
      y: rng(), h: range(rng, 0.008, 0.05), dx: range(rng, -0.12, 0.12),
      channel: chance(rng, 0.45), tone: rng(),
    });
  }
  const bandCount = rangeInt(rng, 3, MAX_BANDS);
  const bands = [];
  for (let i = 0; i < MAX_BANDS; i += 1) {
    bands.push({ y: rng(), h: range(rng, 0.02, 0.12), alpha: range(rng, 0.1, 0.3) });
  }
  const field = {
    angle: range(rng, 0, Math.PI), scale: range(rng, 1.2, 2.6),
    offsetX: rng() * 100, offsetY: rng() * 100, contrast: range(rng, 0.6, 1),
  };
  const headlineLines = pick(rng, [1, 2, 2]);
  const weight = pick(rng, [800, 900]);
  const shift = range(rng, 5, 14);
  const scanPitch = pick(rng, [4, 6, 8]);
  const labelJitter = range(rng, -7, 7);
  const align = pick(rng, ["left", "center"]);
  return {
    sliceCount, slices, bandCount, bands, field, headlineLines, weight, shift, scanPitch, labelJitter, align,
  };
}

/** The first `sliceCount` slices in poster units, sorted and made disjoint. */
export function resolveSlices(plan, W = 1200, H = 1600) {
  const picked = plan.slices.slice(0, plan.sliceCount)
    .map((s) => ({ y0: s.y * H, h: s.h * H, dx: s.dx * W, channel: s.channel, tone: s.tone }))
    .sort((a, b) => a.y0 - b.y0);
  const out = [];
  let cursor = 0;
  for (const slice of picked) {
    const y0 = Math.max(cursor, slice.y0);
    if (y0 + slice.h > H) continue;
    out.push({ ...slice, y0 });
    cursor = y0 + slice.h;
  }
  return out;
}

/**
 * Source rectangle in physical pixels for a slice of a layer rendered at
 * `scale`, plus the destination in poster units derived from the rounded
 * source so the copy lands on whole device pixels (no resampling seams).
 */
export function sliceSourceRect(slice, scale, W = 1200) {
  const sy = Math.round(slice.y0 * scale);
  const sh = Math.max(1, Math.round((slice.y0 + slice.h) * scale) - sy);
  const sw = Math.max(1, Math.round(W * scale));
  return { sx: 0, sy, sw, sh, dy: sy / scale, dh: sh / scale, dw: sw / scale };
}

/** Duotone field values in [0, 1], FIELD_W × FIELD_H, from the frame noise. */
export function fieldValues(plan, fbm2D, w = FIELD_W, h = FIELD_H) {
  const values = new Float32Array(w * h);
  const { angle, scale, offsetX, offsetY, contrast } = plan.field;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const u = x / w;
      const v = (y / h) * (4 / 3);
      const ru = u * cos - v * sin;
      const rv = u * sin + v * cos;
      const n = fbm2D(ru * scale + offsetX, rv * scale + offsetY, 3);
      values[y * w + x] = Math.min(1, Math.max(0, 0.5 + n * contrast));
    }
  }
  return values;
}
