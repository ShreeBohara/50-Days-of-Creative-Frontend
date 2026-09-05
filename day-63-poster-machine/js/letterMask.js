// A letterform rasterised once at a fixed, tiny resolution and sampled in
// fraction space. Because the mask never depends on the output size, the
// flow field's density is identical on screen, in the minis and at export.
import { font } from "./text.js";

export const MASK_W = 192;
export const MASK_H = 256;
const CAP = 0.74;
const cache = new Map();

export function createMask(data, w = MASK_W, h = MASK_H) {
  return { data, w, h };
}

/** Bilinear sample at fraction coordinates (fx, fy) in [0, 1]. */
export function sampleMask(mask, fx, fy) {
  const { data, w, h } = mask;
  const x = Math.min(w - 1, Math.max(0, fx * (w - 1)));
  const y = Math.min(h - 1, Math.max(0, fy * (h - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const top = data[y0 * w + x0] * (1 - tx) + data[y0 * w + x1] * tx;
  const bottom = data[y1 * w + x0] * (1 - tx) + data[y1 * w + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Rasterises `letter` (browser only); cached per letter + placement + font readiness. */
export function letterMask(letter, { scale = 0.85, offsetX = 0, offsetY = 0, weight = 900, family } = {}) {
  const fontsReady = typeof document !== "undefined" && document.fonts
    ? document.fonts.check(`${weight} 100px ${family}`)
    : false;
  const key = [letter, scale.toFixed(3), offsetX.toFixed(3), offsetY.toFixed(3), weight, fontsReady].join("|");
  if (cache.has(key)) return cache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = MASK_W;
  canvas.height = MASK_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, MASK_W, MASK_H);
  let size = (scale * MASK_H) / CAP;
  ctx.font = font(weight, size, family);
  const width = ctx.measureText(letter).width;
  if (width > MASK_W * 0.96) {
    size *= (MASK_W * 0.96) / width;
    ctx.font = font(weight, size, family);
  }
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(letter, MASK_W / 2 + offsetX * MASK_W, MASK_H / 2 + (size * CAP) / 2 + offsetY * MASK_H);

  const pixels = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
  const data = new Float32Array(MASK_W * MASK_H);
  for (let i = 0; i < data.length; i += 1) data[i] = pixels[i * 4] / 255;
  const mask = createMask(data);
  cache.set(key, mask);
  canvas.width = 0;
  return mask;
}
