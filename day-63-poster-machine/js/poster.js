// Poster rendering core. Every poster is drawn in a fixed virtual space of
// 1200×1600 units under one ctx.scale(), so the display canvas, the picker
// minis and the 2400×3200 export all run the exact same code path.
import { mulberry32, hashSeed } from "./rng.js";
import { createSimplexNoise } from "./noise.js";
import { resolvePalette } from "./palettes.js";
import { getSystem } from "./systems/index.js";
import { DISPLAY_FAMILY, MONO_FAMILY } from "./text.js";
import { applyFinish } from "./finish.js";

export const POSTER_W = 1200;
export const POSTER_H = 1600;
export const MARGIN = 72;
export const NOISE_SALT = 0x4e4f;

/** Fits a 3:4 poster inside a stage box (CSS px), honouring padding. */
export function fitPoster(stageW, stageH, pad = 0) {
  const availableW = Math.max(0, stageW - pad * 2);
  const availableH = Math.max(0, stageH - pad * 2);
  const ratio = Math.min(availableW / POSTER_W, availableH / POSTER_H);
  return {
    cssW: Math.max(0, Math.floor(POSTER_W * ratio)),
    cssH: Math.max(0, Math.floor(POSTER_H * ratio)),
  };
}

/** Backing-store size for a display canvas: CSS × dpr (≤ 2), capped by a pixel budget. */
export function backingSize(cssW, cssH, dpr = 1, maxPixels = Infinity) {
  let ratio = Math.min(Math.max(dpr || 1, 1), 2);
  if (cssW * cssH * ratio * ratio > maxPixels) ratio = Math.sqrt(maxPixels / (cssW * cssH));
  const width = Math.max(1, Math.round(cssW * ratio));
  const height = Math.max(1, Math.round(cssH * ratio));
  return { width, height, scale: width / POSTER_W };
}

/** A scratch canvas covering the poster at the frame's scale (browser only). */
export function createDomLayer(scale) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(POSTER_W * scale));
  canvas.height = Math.max(1, Math.round(POSTER_H * scale));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return {
    canvas,
    ctx,
    release() {
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

/** Builds the frame object a system's draw() receives. */
export function createFrame(state, { scale = 1, code = "", layerFactory } = {}) {
  const factory = layerFactory
    || (typeof document !== "undefined" ? createDomLayer : () => null);
  return {
    W: POSTER_W,
    H: POSTER_H,
    M: MARGIN,
    scale,
    // Thinnest line that still covers a device pixel, in poster units.
    hairline: Math.max(1, 1 / scale),
    palette: resolvePalette(state.palette),
    text: { ...state.text, code },
    fonts: { display: DISPLAY_FAMILY, mono: MONO_FAMILY },
    noise: createSimplexNoise(hashSeed(state.layoutSeed, NOISE_SALT)),
    createLayer: () => factory(scale),
  };
}

/** Runs the active system's plan() with a fresh rng derived from the layout seed. */
export function planPoster(state) {
  const system = getSystem(state.system);
  const rng = mulberry32(hashSeed(state.layoutSeed, system.salt));
  return { system, plan: system.plan(rng, state.text) };
}

/**
 * Renders `state` into `ctx` at `scale` (device px per poster unit).
 * Fills the whole canvas with the palette background first, then draws the
 * poster clipped to the page. `finish: false` skips grain/paper (minis).
 */
export function renderPoster(ctx, state, options = {}) {
  const { scale = 1, code = "", finish = true, layerFactory } = options;
  const frame = createFrame(state, { scale, code, layerFactory });
  const { system, plan } = planPoster(state);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = frame.palette.bg;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.beginPath();
  ctx.rect(0, 0, POSTER_W, POSTER_H);
  ctx.clip();
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  system.draw(ctx, frame, plan);
  if (finish) applyFinish(ctx, frame, state.finish);
  ctx.restore();
  return { frame, plan, system };
}
