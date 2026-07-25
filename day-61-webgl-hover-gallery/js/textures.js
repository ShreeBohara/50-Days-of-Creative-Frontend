/* textures.js — interprets the pure recipe op-lists from
 * textureRecipes.js onto offscreen 1024x1024 2D canvases.
 * These canvases are the gallery's "photographs": commit-1 mounts
 * them straight into the DOM, and the GL layer later uploads the
 * very same canvases as textures.
 */

import { RECIPES, TEXTURE_SIZE, createRng } from "./textureRecipes.js";

const S = TEXTURE_SIZE;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return alpha === undefined ? hex : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function addStops(gradient, stops) {
  for (const s of stops) gradient.addColorStop(s.at, rgba(s.color, s.alpha));
}

/* Grain: a small seeded noise tile repeated as a pattern — crisp film
 * grain without touching a megapixel of ImageData per texture. */
function makeGrainTile(seed) {
  const T = 128;
  const tile = document.createElement("canvas");
  tile.width = tile.height = T;
  const tctx = tile.getContext("2d");
  const img = tctx.createImageData(T, T);
  const rng = createRng(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rng() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  return tile;
}

const OP_PAINTERS = {
  solid(ctx, op) {
    ctx.fillStyle = op.color;
    ctx.fillRect(0, 0, S, S);
  },

  linear(ctx, op) {
    const g = ctx.createLinearGradient(op.from[0] * S, op.from[1] * S, op.to[0] * S, op.to[1] * S);
    addStops(g, op.stops);
    ctx.fillStyle = g;
    const r = op.region ?? [0, 0, 1, 1];
    ctx.fillRect(r[0] * S, r[1] * S, r[2] * S, r[3] * S);
  },

  radial(ctx, op) {
    const [cx, cy] = op.center;
    const g = ctx.createRadialGradient(cx * S, cy * S, 0, cx * S, cy * S, op.radius * S);
    addStops(g, op.stops);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },

  poly(ctx, op) {
    ctx.fillStyle = rgba(op.color, op.alpha);
    ctx.beginPath();
    op.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * S, y * S) : ctx.lineTo(x * S, y * S)));
    ctx.closePath();
    ctx.fill();
  },

  circle(ctx, op) {
    ctx.fillStyle = rgba(op.color, op.alpha);
    ctx.beginPath();
    ctx.arc(op.center[0] * S, op.center[1] * S, op.r * S, 0, Math.PI * 2);
    ctx.fill();
  },

  ellipse(ctx, op) {
    ctx.fillStyle = rgba(op.color, op.alpha);
    ctx.beginPath();
    ctx.ellipse(op.center[0] * S, op.center[1] * S, op.rx * S, op.ry * S, op.rot, 0, Math.PI * 2);
    ctx.fill();
  },

  path(ctx, op) {
    ctx.fillStyle = rgba(op.color, op.alpha);
    ctx.beginPath();
    ctx.moveTo(op.start[0] * S, op.start[1] * S);
    for (const [c1x, c1y, c2x, c2y, x, y] of op.curves) {
      ctx.bezierCurveTo(c1x * S, c1y * S, c2x * S, c2y * S, x * S, y * S);
    }
    ctx.closePath();
    ctx.fill();
  },

  strokes(ctx, op) {
    ctx.strokeStyle = rgba(op.color, op.alpha);
    ctx.lineWidth = op.width * S;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const line of op.lines) {
      ctx.beginPath();
      line.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * S, y * S) : ctx.lineTo(x * S, y * S)));
      ctx.stroke();
    }
  },

  waves(ctx, op) {
    ctx.strokeStyle = rgba(op.color, op.alpha);
    ctx.lineWidth = op.width * S;
    for (let w = 0; w < op.count; w++) {
      const y = (op.y0 + w * op.gap) * S;
      ctx.beginPath();
      for (let x = 0; x <= S; x += 8) {
        const yy = y + Math.sin((x / S) * Math.PI * 2 * op.freq + w * 1.3) * op.amp * S;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  },

  dots(ctx, op) {
    const rng = createRng(op.seed);
    const [rx, ry, rw, rh] = op.region;
    for (let i = 0; i < op.count; i++) {
      const x = (rx + rng() * rw) * S;
      const y = (ry + rng() * rh) * S;
      const r = (op.rMin + rng() * (op.rMax - op.rMin)) * S;
      const a = op.alphaMin + rng() * (op.alphaMax - op.alphaMin);
      ctx.fillStyle = rgba(op.color, a);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  grain(ctx, op) {
    const pattern = ctx.createPattern(makeGrainTile(op.seed), "repeat");
    ctx.save();
    ctx.globalAlpha = op.amount;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  },

  vignette(ctx, op) {
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.35, S / 2, S / 2, S * 0.74);
    g.addColorStop(0, "rgba(26, 24, 21, 0)");
    g.addColorStop(1, `rgba(26, 24, 21, ${op.strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  },
};

export function renderRecipe(recipe) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  for (const op of recipe.ops) OP_PAINTERS[op.type](ctx, op);
  return canvas;
}

/* Renders all six recipes once at boot; returns [{recipe, canvas}]. */
export function buildTextures() {
  return RECIPES.map((recipe) => ({ recipe, canvas: renderRecipe(recipe) }));
}
