/* VOID POST — pointer drag.
   One pointer pans the world. A press that never travels more than the
   threshold is a click (card expand); anything further is a drag. */

const DRAG_THRESHOLD = 6; // px of travel before a press becomes a drag

export function createDrag({ engine, universe, onCardClick }) {
  const ctl = { dragging: false };

  let active = false;
  let lastX = 0, lastY = 0;
  let downX = 0, downY = 0;
  let downTile = null;

  universe.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    active = true;
    ctl.dragging = false;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    downTile = e.target instanceof Element ? e.target.closest(".tile") : null;
    universe.setPointerCapture(e.pointerId);
  });

  universe.addEventListener("pointermove", (e) => {
    if (!active) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    if (!ctl.dragging) {
      const travel = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (travel > DRAG_THRESHOLD) {
        ctl.dragging = true;
        universe.classList.add("is-dragging");
      }
    }
    if (ctl.dragging) engine.pan(dx, dy);
  });

  function release(e) {
    if (!active) return;
    active = false;
    if (!ctl.dragging && downTile && onCardClick) onCardClick(downTile, e);
    ctl.dragging = false;
    downTile = null;
    universe.classList.remove("is-dragging");
  }

  universe.addEventListener("pointerup", release);
  universe.addEventListener("pointercancel", release);

  return ctl;
}
