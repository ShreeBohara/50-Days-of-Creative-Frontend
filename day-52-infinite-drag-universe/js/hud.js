/* VOID POST — HUD instruments and secondary navigation.
   The minimap dot shows where you are inside ONE 5x4 pattern cycle; the
   readout converts the endless offset into drifting survey coordinates.
   Arrows pan, double-click glides that spot to center, and after 5s of
   silence the field starts to wander on its own. */

import { COLS, ROWS } from "./engine.js";

const wrap = (v, size) => ((v % size) + size) % size;

const KEY_SPEED = 16;      // px/frame while an arrow is held
const IDLE_AFTER = 5000;   // ms of no interaction before auto-drift
const DRIFT_SPEED = 0.45;  // px/frame of idle wander

export function createHud({ engine, overlay, universe, dragCtl, minimap, minimapDot, coordsValue }) {
  let lastText = "";

  /* --- keyboard panning --- */
  const held = new Set();
  addEventListener("keydown", (e) => {
    if (!e.key.startsWith("Arrow") || overlay.isOpen()) return;
    held.add(e.key);
    markActive();
    e.preventDefault();
  });
  addEventListener("keyup", (e) => held.delete(e.key));

  /* --- double-click glide-to-point --- */
  let glideTarget = null;
  universe.addEventListener("dblclick", (e) => {
    glideTarget = {
      x: engine.state.x + (innerWidth / 2 - e.clientX),
      y: engine.state.y + (innerHeight / 2 - e.clientY),
    };
    markActive();
  });

  /* --- idle timer --- */
  let lastActive = performance.now();
  let driftAngle = Math.random() * Math.PI * 2;
  function markActive() { lastActive = performance.now(); }
  universe.addEventListener("pointerdown", () => {
    glideTarget = null; // grabbing the field cancels any glide
    markActive();
  });

  engine.onFrame((state) => {
    if (!overlay.isOpen()) {
      // arrows: hold = constant speed (set each frame), release = friction glide
      if (held.size) {
        const dirX = (held.has("ArrowLeft") ? 1 : 0) - (held.has("ArrowRight") ? 1 : 0);
        const dirY = (held.has("ArrowUp") ? 1 : 0) - (held.has("ArrowDown") ? 1 : 0);
        if (dirX || dirY) {
          state.vx = dirX * KEY_SPEED;
          state.vy = dirY * KEY_SPEED;
          markActive();
        }
      }

      // double-click glide: ease toward the stored target, then let go
      if (glideTarget) {
        state.x += (glideTarget.x - state.x) * 0.09;
        state.y += (glideTarget.y - state.y) * 0.09;
        if (Math.hypot(glideTarget.x - state.x, glideTarget.y - state.y) < 0.5) glideTarget = null;
        markActive();
      }

      // idle wander: a slow curving stroll until anything happens
      const resting = !dragCtl.dragging && !held.size && !glideTarget &&
                      state.vx === 0 && state.vy === 0;
      if (resting && performance.now() - lastActive > IDLE_AFTER) {
        driftAngle += 0.002;
        state.x += Math.cos(driftAngle) * DRIFT_SPEED;
        state.y += Math.sin(driftAngle) * DRIFT_SPEED;
      }
    }

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
