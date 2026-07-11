/* VOID POST — HUD instruments.
   The minimap dot shows where you are inside ONE 5x4 pattern cycle; the
   readout converts the endless offset into drifting survey coordinates. */

import { COLS, ROWS } from "./engine.js";

const wrap = (v, size) => ((v % size) + size) % size;

export function createHud({ engine, minimap, minimapDot, coordsValue }) {
  let lastText = "";

  engine.onFrame((state) => {
    const cycleW = COLS * state.cellW;
    const cycleH = ROWS * state.cellH;

    // minimap: fraction of the current cycle (negated: panning left moves you right)
    const fx = wrap(-state.x, cycleW) / cycleW;
    const fy = wrap(-state.y, cycleH) / cycleH;
    minimapDot.style.left = `${(fx * 100).toFixed(2)}%`;
    minimapDot.style.top = `${(fy * 100).toFixed(2)}%`;

    // survey coordinates: one cycle = one full revolution of the fake globe
    const lon = wrap(-state.x / cycleW * 360 + 180, 360) - 180;
    const lat = wrap(-state.y / cycleH * 180 + 90, 180) - 90;
    const fmt = (v, pos, neg) =>
      `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(4)}°${v >= 0 ? pos : neg}`;
    const textNow = `${fmt(lat, "N", "S")} / ${fmt(lon, "E", "W")}`;
    if (textNow !== lastText) {
      coordsValue.textContent = textNow;
      lastText = textNow;
    }
  });

  return { minimap };
}
