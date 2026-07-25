/* interactions.js — pointer tracking and the per-tick hover pass.
 *
 * Hover is decided by HIT-TESTING the stored pointer position against
 * the planes' synced rects inside the tick — never by pointerenter /
 * pointerleave events. One code path means gallery.setMouse() (headless
 * QA) behaves exactly like a real mouse, and scroll-under-cursor
 * re-hovers correctly without any synthetic events.
 */

import { localMouseUV, hitTest } from "./rectLogic.js";
import { createHoverState, createVelocityTracker } from "./motionLogic.js";

export function createInteractions({ renderer }) {
  const mouse = { x: -1e4, y: -1e4 }; // parked far offscreen until first move
  const velocity = createVelocityTracker();
  let lastMoveTime = null;
  let hoverCap = 1; // reduced-motion drops this to 0: static render, no chase
  let lastPointerType = "mouse";

  window.addEventListener(
    "pointerdown",
    (e) => { lastPointerType = e.pointerType || "mouse"; },
    { passive: true },
  );

  for (const p of renderer.planes) {
    p.hover = createHoverState();
    p.uMouse = { u: 0.5, v: 0.5 };
    p.uHover = 0;
    p.uSinceEnter = 0;
  }

  function setMouse(x, y, timeStamp) {
    if (lastMoveTime !== null) {
      const dtMs = timeStamp !== undefined ? timeStamp - lastMoveTime : 1000 / 60;
      velocity.sample(x - mouse.x, y - mouse.y, dtMs);
    }
    lastMoveTime = timeStamp !== undefined ? timeStamp : (lastMoveTime ?? 0) + 1000 / 60;
    mouse.x = x;
    mouse.y = y;
  }

  window.addEventListener(
    "pointermove",
    (e) => setMouse(e.clientX, e.clientY, e.timeStamp),
    { passive: true },
  );

  /* runs once per tick, after rect sync and before the draw */
  function update(dtSec) {
    const vel = velocity.update(dtSec);

    for (const p of renderer.planes) {
      const r = p.viewRect;
      const hovered = hoverCap > 0 && !!r && hitTest(mouse.x, mouse.y, r);

      p.uHover = p.hover.update(hovered, dtSec);
      p.uSinceEnter = p.hover.sinceEnter;

      /* freeze the last local UV on exit so the effect decays in place
       * instead of snapping to a clamped edge */
      if (hovered && r) {
        const uv = localMouseUV(mouse.x, mouse.y, r);
        p.uMouse.u = uv.u;
        p.uMouse.v = uv.v;
      }
    }

    renderer.globals.velocity = vel;
  }

  /* Touch pointers never leave — a lifted finger fires no pointerleave,
   * so the stored tap point would keep hit-testing true forever and pin
   * the pulse at full strength. Parking the pointer offscreen after a
   * touch interaction lets the release decay actually run. */
  function parkIfTouch() {
    if (lastPointerType !== "mouse") {
      mouse.x = -1e4;
      mouse.y = -1e4;
    }
  }

  /* touch path: a tap pulses the tapped plane — hover slams to 1 with
   * a velocity spike, then the normal release decay drains it */
  function pulsePlane(i) {
    const p = renderer.planes[i];
    if (!p?.hover || !p.viewRect) return;
    const uv = localMouseUV(mouse.x, mouse.y, p.viewRect);
    p.uMouse.u = uv.u;
    p.uMouse.v = uv.v;
    p.hover.pulse();
    velocity.spike(1);
    parkIfTouch();
  }

  return {
    mouse,
    velocity,
    update,
    setMouse,
    pulsePlane,
    parkIfTouch,
    setHoverCap(cap) { hoverCap = cap; },
    hoveredIndex() {
      const i = renderer.planes.findIndex(
        (p) => p.viewRect && hitTest(mouse.x, mouse.y, p.viewRect),
      );
      return i === -1 ? null : i;
    },
  };
}
