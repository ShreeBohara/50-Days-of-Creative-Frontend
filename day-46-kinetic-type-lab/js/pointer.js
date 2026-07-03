/* Shared pointer store — ONE listener for the whole page.
   Consumers read `pointer` inside gsap.ticker callbacks; the
   handler itself does no per-event work beyond storing values. */

export const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  fine: window.matchMedia("(pointer: fine)").matches,
  moved: false, // stays false until the first real pointermove
  lastMove: 0, // timestamp of the last move — lets sections fall back to idle motion
};

window.addEventListener(
  "pointermove",
  (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved = true;
    pointer.lastMove = performance.now();
  },
  { passive: true }
);

/* Utility math shared by the experiments */
export const lerp = (a, b, t) => a + (b - a) * t;

export const smoothstep = (t) => t * t * (3 - 2 * t);

export const clamp01 = (t) => Math.min(1, Math.max(0, t));
