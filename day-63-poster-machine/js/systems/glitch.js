// Glitch Stripes — the headline typeset huge on its own layer over a soft
// duotone field, then torn by seeded horizontal slice displacement (with
// wraparound), channel-shifted tinted copies, scanlines and dark bands.
import {
  planGlitch, resolveSlices, sliceSourceRect, fieldValues, FIELD_W, FIELD_H,
} from "./glitchLogic.js";
import { font, fitFontSize, breakHeadline } from "../text.js";
import { hexToRgb, mixHex, withAlpha, isDark } from "../color.js";

/** Colourises the field values into a tiny canvas (browser only). */
function buildField(plan, noise, dark, light) {
  const values = fieldValues(plan, noise.fbm2D);
  const canvas = document.createElement("canvas");
  canvas.width = FIELD_W;
  canvas.height = FIELD_H;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(FIELD_W, FIELD_H);
  const a = hexToRgb(dark);
  const b = hexToRgb(light);
  for (let i = 0; i < values.length; i += 1) {
    const t = values[i];
    image.data[i * 4] = a[0] + (b[0] - a[0]) * t;
    image.data[i * 4 + 1] = a[1] + (b[1] - a[1]) * t;
    image.data[i * 4 + 2] = a[2] + (b[2] - a[2]) * t;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** A short scratch canvas tall enough for the largest slice. */
function createStrip(scale, W, heightUnits) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(W * scale));
  canvas.height = Math.max(1, Math.ceil(heightUnits * scale) + 2);
  return canvas;
}

function typesetHeadline(layer, plan, frame) {
  const { W, H, M, palette, text, fonts } = frame;
  const lines = breakHeadline(text.headline.toUpperCase(), plan.headlineLines);
  if (!lines.length) return;
  const ctx = layer.ctx;
  let size = 420;
  for (const line of lines) {
    size = Math.min(size, fitFontSize(ctx, line, {
      weight: plan.weight, family: fonts.display, maxWidth: W - M * 2, maxSize: 420,
    }));
  }
  const lineHeight = size * 0.88;
  const blockH = size * 0.74 + (lines.length - 1) * lineHeight;
  const capTop = H * 0.46 - blockH / 2;
  ctx.font = font(plan.weight, size, fonts.display);
  ctx.fillStyle = palette.ink;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = plan.align;
  const x = plan.align === "center" ? W / 2 : M;
  lines.forEach((line, i) => ctx.fillText(line, x, capTop + size * 0.74 + i * lineHeight));
}

export const glitch = {
  id: "glitch",
  code: "GLT",
  name: "Glitch Stripes",
  salt: 0x474c,
  plan: (rng) => planGlitch(rng),
  draw(ctx, frame, plan) {
    const { W, H, M, palette, text, fonts, noise, scale } = frame;
    const dark = isDark(palette.bg);

    /* 1. Duotone field. */
    const field = buildField(plan, noise, mixHex(palette.bg, palette.colors[2], 0.42), palette.bg);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(field, 0, 0, W, H);

    /* 2. Headline on a transparent layer, drawn whole first. */
    const layer = frame.createLayer();
    if (!layer) return;
    typesetHeadline(layer, plan, frame);
    ctx.drawImage(layer.canvas, 0, 0, W, H);

    /* 3. Slice displacement: re-cover each band from the field, then copy
       the headline band shifted, with wraparound so nothing goes missing. */
    const slices = resolveSlices(plan, W, H);
    const maxH = slices.reduce((m, s) => Math.max(m, s.h), 1);
    const strip = createStrip(scale, W, maxH);
    const stripCtx = strip.getContext("2d");
    const blend = dark ? "screen" : "multiply";

    for (const slice of slices) {
      const r = sliceSourceRect(slice, scale, W);
      const fieldY = (r.dy / H) * FIELD_H;
      const fieldH = (r.dh / H) * FIELD_H;
      ctx.drawImage(field, 0, fieldY, FIELD_W, fieldH, 0, r.dy, W, r.dh);

      if (slice.channel) {
        stripCtx.clearRect(0, 0, strip.width, strip.height);
        stripCtx.globalCompositeOperation = "source-over";
        stripCtx.drawImage(layer.canvas, r.sx, r.sy, r.sw, r.sh, 0, 0, r.sw, r.sh);
        stripCtx.globalCompositeOperation = "source-in";
        const [left, right] = slice.tone < 0.5
          ? [palette.accent, palette.colors[3]]
          : [palette.colors[3], palette.accent];
        ctx.save();
        ctx.globalCompositeOperation = blend;
        ctx.globalAlpha = 0.9;
        stripCtx.fillStyle = left;
        stripCtx.fillRect(0, 0, r.sw, r.sh);
        ctx.drawImage(strip, 0, 0, r.sw, r.sh, slice.dx - plan.shift, r.dy, r.dw, r.dh);
        stripCtx.fillStyle = right;
        stripCtx.fillRect(0, 0, r.sw, r.sh);
        ctx.drawImage(strip, 0, 0, r.sw, r.sh, slice.dx + plan.shift, r.dy, r.dw, r.dh);
        ctx.restore();
      }

      ctx.drawImage(layer.canvas, r.sx, r.sy, r.sw, r.sh, slice.dx, r.dy, r.dw, r.dh);
      const wrap = slice.dx > 0 ? slice.dx - W : slice.dx + W;
      ctx.drawImage(layer.canvas, r.sx, r.sy, r.sw, r.sh, wrap, r.dy, r.dw, r.dh);
    }
    layer.release();
    strip.width = 0;

    /* 4. Scanlines and dark bands. */
    ctx.fillStyle = withAlpha(dark ? "#ffffff" : "#000000", 0.07);
    for (let y = 0; y < H; y += plan.scanPitch) ctx.fillRect(0, y, W, 1);
    const bandInk = dark ? "#ffffff" : palette.ink;
    for (const band of plan.bands.slice(0, plan.bandCount)) {
      ctx.fillStyle = withAlpha(bandInk, band.alpha * (dark ? 0.6 : 1));
      ctx.fillRect(0, band.y * H, W, band.h * H);
    }

    /* 5. Labels with a jittered accent duplicate. */
    ctx.font = font(500, 20, fonts.mono);
    ctx.textBaseline = "alphabetic";
    const labels = [];
    if (text.subline) labels.push({ value: text.subline, x: M, align: "left" });
    labels.push({ value: text.date || text.code || "", x: W - M, align: "right" });
    for (const label of labels) {
      if (!label.value) continue;
      ctx.textAlign = label.align;
      ctx.fillStyle = palette.accent;
      ctx.fillText(label.value, label.x + plan.labelJitter, H - M);
      ctx.fillStyle = palette.ink;
      ctx.fillText(label.value, label.x, H - M);
    }
  },
};
