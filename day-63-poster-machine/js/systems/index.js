// Registry of poster systems.
//
// A system is { id, code, name, salt, plan(rng, text) -> plan, draw(ctx, frame, plan) }.
// `plan` is the ONLY place a system may draw random numbers, and it must draw
// the same number of them regardless of text, palette or resolution — that is
// what keeps a seed code reproducible everywhere (display, minis, export).
// `draw` is pure canvas work in 1200×1600 poster units; poster.js sets the
// transform, so systems never think about pixels.
import { font, fitFontSize, breakHeadline } from "../text.js";
import { pick, range } from "../rng.js";

/* Placeholder system so the studio renders before the real systems land. */
const blank = {
  id: "blank",
  code: "BLK",
  name: "Blank",
  salt: 0x0b1a,
  plan(rng) {
    return {
      weight: pick(rng, [700, 800, 900]),
      lines: pick(rng, [1, 2]),
      offset: range(rng, -0.08, 0.08),
    };
  },
  draw(ctx, frame, plan) {
    const { W, H, M, palette, text, fonts } = frame;
    const lines = breakHeadline(text.headline, plan.lines);
    ctx.fillStyle = palette.ink;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    let size = 520;
    for (const line of lines) {
      size = Math.min(size, fitFontSize(ctx, line, {
        weight: plan.weight, family: fonts.display, maxWidth: W - M * 2,
      }));
    }
    ctx.font = font(plan.weight, size, fonts.display);
    let y = H * (0.5 + plan.offset) - (lines.length - 1) * size * 0.45;
    for (const line of lines) {
      ctx.fillText(line, M, y);
      y += size * 0.9;
    }
    ctx.font = font(500, 22, fonts.mono);
    ctx.fillStyle = palette.accent;
    ctx.fillText("POSTER MACHINE / 63", M, H - M);
    ctx.textAlign = "right";
    ctx.fillStyle = palette.ink;
    ctx.fillText(text.code || "", W - M, H - M);
  },
};

export const SYSTEMS = [blank];
export const DEFAULT_SYSTEM = SYSTEMS[0].id;
export const SYSTEM_IDS = SYSTEMS.map((system) => system.id);

export function getSystem(id) {
  return SYSTEMS.find((system) => system.id === id) || SYSTEMS[0];
}
