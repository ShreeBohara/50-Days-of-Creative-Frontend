/* expand.js — click-to-fullscreen state machine.
 *
 * The tween runs in CSS-pixel viewport-rect space (grid rect ->
 * fullscreen rect) and feeds the renderer an override rect each tick;
 * the renderer draws that plane LAST so it rises above its neighbors.
 * Distortion settles as it opens (hover is scaled by 1 - openness) and
 * the landing back in the grid fires a burst of the active effect.
 *
 * t is "openness" 0..1: opening integrates up, closing integrates
 * down, so reversing mid-flight is free.
 */

import { lerpRect } from "./rectLogic.js";
import { easeInOutQuart } from "./motionLogic.js";

const OPEN_MS = 650;
const CLOSE_MS = 480;

export function createExpand({ renderer, interactions, titleEl }) {
  let phase = "idle"; // idle | opening | open | closing
  let index = -1;
  let t = 0;
  let fromRect = null;
  let durations = { open: OPEN_MS, close: CLOSE_MS };
  let burstEnabled = true; // reduced-motion turns the landing flare off
  let lastFocus = null;

  /* while a plane is fullscreen, everything underneath is a trap:
   * clicks would hit the invisible controls, Tab would walk hidden
   * frames, screen readers would still see the whole grid. inert
   * removes all three at once. */
  const inertRegions = [...document.querySelectorAll(".site-head, .grid, .site-foot")];

  function setPageInert(on) {
    for (const el of inertRegions) el.inert = on;
  }

  function fullscreenRect() {
    return {
      x: 0,
      y: 0,
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    };
  }

  function setTitle(plane) {
    if (!titleEl) return;
    const num = titleEl.querySelector(".et-num");
    const name = titleEl.querySelector(".et-name");
    const sub = titleEl.querySelector(".et-sub");
    if (num) num.textContent = String(plane.index + 1).padStart(2, "0");
    if (name) name.textContent = plane.recipe.title;
    if (sub) sub.textContent = plane.recipe.subtitle;
  }

  function open(i) {
    const plane = renderer.planes[i];
    if (!plane || !plane.viewRect) return;
    if (phase === "opening" || phase === "open") return;
    index = i;
    phase = "opening";
    /* keep current t when re-opening mid-close, else start from grid */
    if (t === 0) fromRect = { ...plane.viewRect };
    setTitle(plane);

    lastFocus = document.activeElement;
    setPageInert(true);
    plane.el?.setAttribute("aria-expanded", "true");
    titleEl?.focus?.({ preventScroll: true });
  }

  function close() {
    if (phase === "opening" || phase === "open") phase = "closing";
  }

  function update(dtSec) {
    if (phase === "opening") {
      t += (dtSec * 1000) / durations.open;
      if (t >= 1) { t = 1; phase = "open"; }
    } else if (phase === "closing") {
      t -= (dtSec * 1000) / durations.close;
      if (t <= 0) {
        t = 0;
        phase = "idle";
        const plane = renderer.planes[index];
        /* landing burst: the active effect flares and decays */
        if (burstEnabled) {
          if (plane?.hover) plane.hover.pulse();
          interactions?.velocity.spike(1);
          /* on touch there is no pointer to move away — park it so
           * the burst can drain instead of pinning at full hover */
          interactions?.parkIfTouch?.();
        }
        plane?.el?.setAttribute("aria-expanded", "false");
        setPageInert(false);
        if (lastFocus?.focus) lastFocus.focus({ preventScroll: true });
        lastFocus = null;
        index = -1;
      }
    }

    if (index >= 0) {
      const plane = renderer.planes[index];
      /* closing chases the LIVE grid rect so a scroll mid-expand still
       * lands the plane exactly on its slot */
      const gridRect =
        phase === "opening" || phase === "open"
          ? fromRect
          : plane.viewRect ?? fromRect;
      const openness = easeInOutQuart(Math.min(1, Math.max(0, t)));
      renderer.setExpand({
        index,
        rect: lerpRect(gridRect, fullscreenRect(), openness),
        openness,
      });
    } else {
      renderer.setExpand(null);
    }

    if (titleEl) titleEl.classList.toggle("visible", phase === "open");
  }

  return {
    open,
    close,
    update,
    setDurations(openMs, closeMs, burst = true) {
      durations = { open: openMs, close: closeMs };
      burstEnabled = burst;
    },
    get active() { return phase !== "idle"; },
    get phase() { return phase; },
    get index() { return index; },
  };
}
