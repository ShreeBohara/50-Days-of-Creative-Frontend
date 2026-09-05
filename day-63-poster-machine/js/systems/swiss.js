// Swiss Grid — strict modular grid, the headline set huge in the grotesk and
// broken across gridlines, one accent block, rotated index labels, one rule.
import {
  planSwiss, gridGeometry, gridlineX, gridlineY, accentRect, ruleLine,
} from "./swissPlan.js";
import { font, fitFontSize, breakHeadline } from "../text.js";
import { contrast, withAlpha } from "../color.js";

const CAP = 0.74; // cap height as a fraction of font size (Hanken Grotesk)
const DESCENT = 0.06;

/** Fits the headline lines to their columns; all lines share one size. */
function layoutHeadline(ctx, lines, plan, g, family) {
  if (!lines.length) return { size: 0, lines: [] };
  const starts = lines.map((_, i) => Math.min(plan.shifts[i] ?? 0, Math.max(0, g.cols - 2)));
  let size = 520;
  lines.forEach((line, i) => {
    const maxWidth = gridlineX(g, g.cols) - gridlineX(g, starts[i]);
    size = Math.min(size, fitFontSize(ctx, line, { weight: plan.weight, family, maxWidth }));
  });
  const lineHeight = size * 0.9;
  const blockH = size * CAP + (lines.length - 1) * lineHeight + size * DESCENT;
  let capTop;
  if (plan.anchor === "top") capTop = gridlineY(g, 1);
  else if (plan.anchor === "middle") capTop = g.y0 + (g.contentH - blockH) / 2;
  else capTop = gridlineY(g, g.rows - 1) - g.gutter - blockH;
  capTop = Math.max(g.y0, Math.min(capTop, g.y0 + g.contentH - blockH));
  return {
    size,
    lineHeight,
    lines: lines.map((line, i) => ({
      text: line,
      x: gridlineX(g, starts[i]),
      baseline: capTop + size * CAP + i * lineHeight,
    })),
  };
}

function drawGrid(ctx, g, ink, hairline) {
  ctx.strokeStyle = withAlpha(ink, 0.1);
  ctx.lineWidth = hairline;
  ctx.beginPath();
  for (let c = 0; c <= g.cols; c += 1) {
    const x = gridlineX(g, c);
    ctx.moveTo(x, g.y0);
    ctx.lineTo(x, g.y0 + g.contentH);
    if (c > 0 && c < g.cols) {
      ctx.moveTo(x - g.gutter, g.y0);
      ctx.lineTo(x - g.gutter, g.y0 + g.contentH);
    }
  }
  for (let r = 0; r <= g.rows; r += 1) {
    const y = gridlineY(g, r);
    ctx.moveTo(g.x0, y);
    ctx.lineTo(g.x0 + g.contentW, y);
  }
  ctx.stroke();
}

function drawLabel(ctx, label, textValue, g) {
  const x = gridlineX(g, label.col);
  const y = gridlineY(g, label.row);
  ctx.save();
  ctx.translate(x, y);
  if (label.rotated) {
    if (label.row < g.rows - 1) {
      ctx.rotate(Math.PI / 2); // reads top-to-bottom, hanging below the intersection
      ctx.textAlign = "left";
      ctx.fillText(textValue, 8, -10);
    } else {
      ctx.rotate(-Math.PI / 2); // reads bottom-to-top, rising from the intersection
      ctx.textAlign = "left";
      ctx.fillText(textValue, 8, 24);
    }
  } else if (label.col >= g.cols) {
    ctx.textAlign = "right";
    ctx.fillText(textValue, -8, 26);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(textValue, 8, 26);
  }
  ctx.restore();
}

export const swiss = {
  id: "swiss",
  code: "SWS",
  name: "Swiss Grid",
  salt: 0x5357,
  plan: (rng) => planSwiss(rng),
  draw(ctx, frame, plan) {
    const { W, H, M, palette, text, fonts } = frame;
    const g = gridGeometry(plan.cols, plan.rows, W, H, M);

    if (plan.showGrid) drawGrid(ctx, g, palette.ink, frame.hairline);

    const raw = plan.caps ? text.headline.toUpperCase() : text.headline;
    const layout = layoutHeadline(ctx, breakHeadline(raw, plan.lineCount), plan, g, fonts.display);

    /* Accent block: fixed placement rules, or a band behind a headline line. */
    let accent = accentRect(plan, g);
    let behindLine = -1;
    if (!accent && layout.lines.length) {
      behindLine = layout.lines.length > 1 ? 1 : 0;
      const line = layout.lines[behindLine];
      accent = {
        x: g.x0,
        y: line.baseline - layout.size * CAP - 10,
        w: g.contentW,
        h: layout.size * (CAP + DESCENT) + 20,
      };
    }
    if (accent) {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(accent.x, accent.y, accent.w, accent.h);
    }

    /* Headline. A line sitting on the accent band knocks out to the paper
       colour when ink would not read against the accent. */
    if (layout.lines.length) {
      const knockout = contrast(palette.ink, palette.accent) < 3 ? palette.bg : palette.ink;
      ctx.font = font(plan.weight, layout.size, fonts.display);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      layout.lines.forEach((line, i) => {
        ctx.fillStyle = i === behindLine ? knockout : palette.ink;
        ctx.fillText(line.text, line.x, line.baseline);
      });
    }

    /* The one rule line. */
    const rule = ruleLine(plan, g);
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(rule.thickness, frame.hairline);
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(rule.x1, rule.y1);
    ctx.lineTo(rule.x2, rule.y2);
    ctx.stroke();

    /* Rotated index labels at grid intersections. */
    const labels = ["01", "02", text.code || "63"];
    ctx.font = font(500, 22, fonts.mono);
    ctx.fillStyle = palette.ink;
    ctx.textBaseline = "alphabetic";
    plan.labels.forEach((label, i) => drawLabel(ctx, label, labels[i], g));

    /* Subline and date live on the last row. */
    ctx.font = font(500, 20, fonts.mono);
    ctx.fillStyle = palette.ink;
    const baseY = g.y0 + g.contentH - 2;
    if (text.subline) {
      ctx.textAlign = "left";
      ctx.fillText(text.subline, g.x0, baseY);
    }
    if (text.date) {
      ctx.textAlign = "right";
      ctx.fillText(text.date, g.x0 + g.contentW, baseY);
    }
  },
};
