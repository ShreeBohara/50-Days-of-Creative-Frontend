// Picker thumbnails: the same render path as the big poster at a fixed
// 120×160 backing store (CSS scales it), without the finish pass.
import { POSTER_W, renderPoster } from "./poster.js";

export const MINI_W = 120;
export const MINI_H = 160;

export function createMiniRenderer(canvas, systemId) {
  canvas.width = MINI_W;
  canvas.height = MINI_H;
  const ctx = canvas.getContext("2d", { alpha: false });
  const scale = MINI_W / POSTER_W;
  return {
    render(state) {
      renderPoster(ctx, { ...state, system: systemId }, { scale, finish: false });
    },
  };
}
