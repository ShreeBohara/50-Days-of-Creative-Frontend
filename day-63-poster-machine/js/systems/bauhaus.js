// Bauhaus — overlapping circles, semicircles, quarters, arcs, triangles and
// bars in flat palette colours with multiply blending, composed from twelve
// arrangement rules; the headline runs vertically along one edge.
import { planBauhaus, resolveShapes, blendForBg } from "./bauhausRules.js";
import { font, fitFontSize } from "../text.js";

const CAP = 0.74;

function drawShape(ctx, s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.beginPath();
  switch (s.kind) {
    case "circle":
      ctx.arc(0, 0, s.r, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "semi":
      ctx.arc(0, 0, s.r, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      break;
    case "quarter":
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, s.r, 0, Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      break;
    case "arc":
      ctx.lineWidth = s.w;
      ctx.lineCap = "butt";
      ctx.arc(0, 0, s.r, 0, s.span);
      ctx.stroke();
      break;
    case "ring":
      ctx.lineWidth = s.w;
      ctx.arc(0, 0, s.r, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "tri":
      ctx.moveTo(0, -s.r);
      ctx.lineTo(s.r * 0.866, s.r * 0.5);
      ctx.lineTo(-s.r * 0.866, s.r * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case "bar":
      ctx.rect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}

export const bauhaus = {
  id: "bauhaus",
  code: "BAU",
  name: "Bauhaus",
  salt: 0x4241,
  plan: (rng) => planBauhaus(rng),
  draw(ctx, frame, plan) {
    const { W, H, M, palette, text, fonts } = frame;

    /* Shapes, mirrored as a group by the plan's flip flags. */
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(plan.flipX ? -1 : 1, plan.flipY ? -1 : 1);
    ctx.translate(-W / 2, -H / 2);
    ctx.globalCompositeOperation = blendForBg(palette.bg);
    for (const shape of resolveShapes(plan, W, H)) {
      const color = palette.colors[shape.colorIdx];
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      drawShape(ctx, shape);
    }
    ctx.restore();

    /* Headline vertical along one edge. */
    const headline = text.headline.toUpperCase();
    if (headline) {
      const size = fitFontSize(ctx, headline, {
        weight: plan.weight, family: fonts.display, maxWidth: H - M * 2, maxSize: 190, tracking: 0.02,
      });
      ctx.save();
      ctx.font = font(plan.weight, size, fonts.display);
      ctx.fillStyle = palette.ink;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.letterSpacing = `${size * 0.02}px`;
      if (plan.edge === "left") {
        ctx.translate(M + size * CAP, H - M);
        ctx.rotate(-Math.PI / 2);
      } else {
        ctx.translate(W - M - size * CAP, M);
        ctx.rotate(Math.PI / 2);
      }
      ctx.fillText(headline, 0, 0);
      ctx.restore();
    }

    /* Subline / date in the bottom corner opposite the headline. */
    ctx.font = font(500, 20, fonts.mono);
    ctx.fillStyle = palette.ink;
    ctx.textBaseline = "alphabetic";
    const lines = [text.subline, text.date].filter(Boolean);
    if (!lines.length && text.code) lines.push(text.code);
    const x = plan.edge === "left" ? W - M : M;
    ctx.textAlign = plan.edge === "left" ? "right" : "left";
    lines.forEach((line, i) => ctx.fillText(line, x, H - M - (lines.length - 1 - i) * 26));
  },
};
