/* VOID POST — grid engine.
   A virtual 5x4 pattern of postcards repeats forever. We build a pool of
   tiles just big enough to cover the viewport plus a buffer, rounded UP to
   a whole number of pattern repeats — that way each pool slot is bound to
   one postcard for its whole life and panning never reassigns content. */

import { buildPostcardSVG } from "./postcards.js";

export const COLS = 5;
export const ROWS = 4;

export function createEngine({ field }) {
  const state = {
    x: 0, y: 0,        // world offset in px
    vx: 0, vy: 0,      // velocity, consumed by the inertia hook
    tileW: 0, tileH: 0, gap: 0,
    cellW: 0, cellH: 0,
    poolCols: 0, poolRows: 0,
    poolW: 0, poolH: 0,  // one wrap cycle (multiple of the 5x4 field)
    tiles: [],
    running: true,
  };

  const hooks = new Set(); // per-frame subscribers (drag, hud, parallax…)

  function readMetrics() {
    const cs = getComputedStyle(document.documentElement);
    state.tileW = parseFloat(cs.getPropertyValue("--tile-w"));
    state.tileH = parseFloat(cs.getPropertyValue("--tile-h"));
    state.gap = parseFloat(cs.getPropertyValue("--tile-gap"));
    state.cellW = state.tileW + state.gap;
    state.cellH = state.tileH + state.gap;
  }

  function build() {
    readMetrics();
    while (field.firstChild) field.removeChild(field.firstChild);
    state.tiles = [];

    // viewport + one cell of buffer each side, rounded up to whole repeats
    const needCols = Math.ceil((innerWidth + state.cellW * 2) / state.cellW);
    const needRows = Math.ceil((innerHeight + state.cellH * 2) / state.cellH);
    state.poolCols = Math.ceil(needCols / COLS) * COLS;
    state.poolRows = Math.ceil(needRows / ROWS) * ROWS;
    state.poolW = state.poolCols * state.cellW;
    state.poolH = state.poolRows * state.cellH;

    for (let r = 0; r < state.poolRows; r++) {
      for (let c = 0; c < state.poolCols; c++) {
        const cardIndex = (r % ROWS) * COLS + (c % COLS);
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.dataset.card = cardIndex;
        const inner = document.createElement("div");
        inner.className = "postcard";
        inner.appendChild(buildPostcardSVG(cardIndex));
        tile.appendChild(inner);
        field.appendChild(tile);
        state.tiles.push({ node: tile, inner, c, r, cardIndex });
      }
    }
    render();
  }

  // Wrap v into [0, size) — true modulo, safe for negatives.
  const wrap = (v, size) => ((v % size) + size) % size;

  function render() {
    for (const tile of state.tiles) {
      // Wrapping by the pool size (a whole number of 5x4 repeats) means a
      // tile that jumps from one edge to the other lands exactly where its
      // own postcard belongs — the field is seamless in every direction.
      const x = wrap(tile.c * state.cellW + state.x, state.poolW) - state.cellW;
      const y = wrap(tile.r * state.cellH + state.y, state.poolH) - state.cellH;
      tile.node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }
  }

  function step() {
    hooks.forEach((h) => h(state));
    render();
  }

  function frame() {
    if (!state.running) return;
    step();
    requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  });

  build();
  // Start slightly into the field so the origin card isn't pinned to the corner.
  state.x = -state.cellW * 0.4;
  state.y = -state.cellH * 0.3;
  requestAnimationFrame(frame);

  return {
    state,
    step,                      // manual tick, handy for headless debugging
    onFrame: (h) => hooks.add(h),
    pan(dx, dy) { state.x += dx; state.y += dy; },
  };
}
