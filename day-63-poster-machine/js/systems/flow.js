// Flow Field — short strokes riding a seeded noise field, packed densely
// inside an invisible giant letterform (the headline's first letter) and
// sparse outside it. The headline itself sits small at the bottom.
import { planFlow, firstLetter, keepStroke, tracePath } from "./flowPlan.js";
import { letterMask, sampleMask } from "../letterMask.js";
import { font, drawTracked } from "../text.js";
import { withAlpha } from "../color.js";

export const flow = {
  id: "flow",
  code: "FLW",
  name: "Flow Field",
  salt: 0x464c,
  plan: (rng) => planFlow(rng),
  draw(ctx, frame, plan) {
    const { W, H, M, palette, text, fonts, noise } = frame;
    const mask = letterMask(firstLetter(text.headline), {
      scale: plan.letterScale,
      offsetX: plan.letterOffset.x,
      offsetY: plan.letterOffset.y,
      family: fonts.display,
    });

    const insideColors = [palette.accent, palette.ink];
    const outsideInk = withAlpha(palette.ink, 0.3);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of plan.strokes) {
      const m = sampleMask(mask, stroke.x, stroke.y);
      if (!keepStroke(m, stroke.t, plan.outsideDensity)) continue;
      const inside = m > 0.5;
      const points = tracePath(stroke, plan, noise.noise2D, W, H);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let k = 1; k < points.length; k += 1) ctx.lineTo(points[k].x, points[k].y);
      if (inside) {
        ctx.lineWidth = 2.4 + 1.8 * stroke.jitter;
        ctx.strokeStyle = stroke.jitter < plan.accentShare ? insideColors[0] : insideColors[1];
      } else {
        ctx.lineWidth = 1.2 + 0.9 * stroke.jitter;
        ctx.strokeStyle = plan.inkOutside
          ? outsideInk
          : withAlpha(palette.colors[stroke.colorIdx], 0.75);
      }
      ctx.stroke();
    }

    /* Footer: hairline, tracked headline bottom-left, subline/date right. */
    const footerTop = H - M - 56;
    ctx.strokeStyle = withAlpha(palette.ink, 0.6);
    ctx.lineWidth = 1.5;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(M, footerTop);
    ctx.lineTo(W - M, footerTop);
    ctx.stroke();

    ctx.fillStyle = palette.ink;
    ctx.textBaseline = "alphabetic";
    ctx.font = font(700, 34, fonts.display);
    drawTracked(ctx, text.headline.toUpperCase(), M, H - M, 5);

    ctx.font = font(500, 19, fonts.mono);
    ctx.textAlign = "right";
    const right = W - M;
    if (text.date) ctx.fillText(text.date, right, H - M);
    if (text.subline) ctx.fillText(text.subline, right, H - M - (text.date ? 26 : 0));
    if (!text.date && !text.subline && text.code) ctx.fillText(text.code, right, H - M);
  },
};
