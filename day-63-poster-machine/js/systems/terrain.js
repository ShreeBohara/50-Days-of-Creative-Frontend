// Terrain — stacked horizontal noise ridgelines with a palette gradient by
// depth, painted back to front so each line occludes the ones behind it,
// and the headline knocked out of the densest region in the paper colour.
import { planTerrain, ridgeProfile, depthColor, densestRegion } from "./terrainLogic.js";
import { font, fitFontSize, breakHeadline } from "../text.js";

export const terrain = {
  id: "terrain",
  code: "TER",
  name: "Terrain",
  salt: 0x5445,
  plan: (rng) => planTerrain(rng),
  draw(ctx, frame, plan) {
    const { W, H, M, palette, text, fonts, noise } = frame;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let i = 0; i < plan.ridgeCount; i += 1) {
      const points = ridgeProfile(plan, i, noise.noise2D, W, H, M);
      /* Occlusion: fill under the line in the paper colour. */
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let k = 1; k < points.length; k += 1) ctx.lineTo(points[k].x, points[k].y);
      ctx.lineTo(W - M, H);
      ctx.lineTo(M, H);
      ctx.closePath();
      ctx.fillStyle = palette.bg;
      ctx.fill();
      /* The ridge itself. */
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let k = 1; k < points.length; k += 1) ctx.lineTo(points[k].x, points[k].y);
      ctx.strokeStyle = depthColor(plan, palette, i);
      ctx.lineWidth = plan.strokeWidth;
      ctx.stroke();
    }

    /* Headline knocked out of the densest region. */
    const lines = breakHeadline(text.headline.toUpperCase(), plan.headlineLines);
    if (lines.length) {
      let size = 300;
      for (const line of lines) {
        size = Math.min(size, fitFontSize(ctx, line, {
          weight: plan.headlineWeight, family: fonts.display, maxWidth: W * 0.72, maxSize: 300,
        }));
      }
      const region = densestRegion(plan);
      const lineHeight = size * 0.92;
      ctx.font = font(plan.headlineWeight, size, fonts.display);
      ctx.fillStyle = palette.bg;
      ctx.strokeStyle = palette.bg;
      ctx.lineWidth = Math.max(6, size * 0.07); // halo: clean gaps around every glyph
      ctx.lineJoin = "round";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const cx = region.cx * W;
      const firstBaseline = region.cy * H + size * 0.37 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, i) => {
        ctx.strokeText(line, cx, firstBaseline + i * lineHeight);
        ctx.fillText(line, cx, firstBaseline + i * lineHeight);
      });
    }

    /* Footer. */
    ctx.font = font(500, 20, fonts.mono);
    ctx.fillStyle = palette.ink;
    ctx.textBaseline = "alphabetic";
    if (text.subline) {
      ctx.textAlign = "left";
      ctx.fillText(text.subline, M, H - M);
    }
    ctx.textAlign = "right";
    if (text.date) ctx.fillText(text.date, W - M, H - M);
    else if (text.code) ctx.fillText(text.code, W - M, H - M);
  },
};
