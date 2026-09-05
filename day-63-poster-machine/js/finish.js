// Print finish: film grain and paper texture, drawn last in poster units so
// the export gets exactly what the screen shows. Tiles are seeded with
// constants — finish is a studio setting, not part of a poster's identity.
import { mulberry32 } from "./rng.js";
import { createSimplexNoise } from "./noise.js";

export const GRAIN_SIZE = 256;
export const GRAIN_SEED = 6363;
export const PAPER_W = 128;
export const PAPER_H = 171;
export const PAPER_SEED = 6364;

/** Mono grain values (0–255), centred on mid-grey so overlay is neutral on average. */
export function grainValues(size = GRAIN_SIZE, seed = GRAIN_SEED) {
  const rng = mulberry32(seed);
  const values = new Uint8ClampedArray(size * size);
  for (let i = 0; i < values.length; i += 1) {
    // Sum of two uniforms → triangular distribution, soft rather than salt-and-pepper.
    values[i] = Math.round(((rng() + rng()) / 2) * 255);
  }
  return values;
}

/** Overlay alpha for a grain amount in [0, 1]. */
export function grainAlpha(amount) {
  return Math.min(1, Math.max(0, Number(amount) || 0)) * 0.35;
}

/** Paper brightness values in [0, 1]: two-octave noise plus faint laid lines. */
export function paperValues(w = PAPER_W, h = PAPER_H, seed = PAPER_SEED) {
  const noise = createSimplexNoise(seed);
  const values = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const fibres = noise.fbm2D(x * 0.14, y * 0.14, 2) * 0.5;
      const laid = Math.sin(y * 1.9) * 0.035;
      values[y * w + x] = Math.min(1, Math.max(0, 0.86 + fibres * 0.16 + laid));
    }
  }
  return values;
}

let grainTile = null;
let paperTile = null;

function grayCanvas(values, w, h, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(w, h);
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i] * scale;
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function getGrainTile() {
  if (!grainTile) grainTile = grayCanvas(grainValues(), GRAIN_SIZE, GRAIN_SIZE);
  return grainTile;
}

function getPaperTile() {
  if (!paperTile) paperTile = grayCanvas(paperValues(), PAPER_W, PAPER_H, 255);
  return paperTile;
}

/** Applies paper (multiply + vignette) and grain (overlay) to a rendered poster. */
export function applyFinish(ctx, frame, finish = {}) {
  const { W, H } = frame;
  if (finish.paper) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.42;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(getPaperTile(), 0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.38, W / 2, H / 2, H * 0.9);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.12)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const alpha = grainAlpha(finish.grain);
  if (alpha > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;
    const tile = getGrainTile();
    for (let y = 0; y < H; y += GRAIN_SIZE) {
      for (let x = 0; x < W; x += GRAIN_SIZE) ctx.drawImage(tile, x, y, GRAIN_SIZE, GRAIN_SIZE);
    }
    ctx.restore();
  }
}
