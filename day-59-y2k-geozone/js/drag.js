// Shared pointer-drag utility used by both the sticker board and the
// popup windows. Pointer events + setPointerCapture cover mouse, touch
// and pen with one code path; handles carry `touch-action: none` in CSS.

export function clampPosition(x, y, elW, elH, boundsW, boundsH, options = {}) {
  const peek = options.peek ?? 24;
  const minX = peek - elW;
  const maxX = Math.max(minX, boundsW - peek);
  const minY = peek - elH;
  const maxY = Math.max(minY, boundsH - peek);
  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

const DRAG_THRESHOLD = 4;

export function createDraggable(el, options = {}) {
  const {
    handle = el,
    peek = 24,
    getBounds = () => ({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }),
    ignoreSelector = "button, a, input, textarea, select, label",
    onStart,
    onMove,
    onEnd,
  } = options;

  let dragging = false;
  let moved = false;
  let grabX = 0;
  let grabY = 0;
  let startX = 0;
  let startY = 0;

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Static positioning (e.g. mobile in-flow windows) means nothing to drag.
    if (getComputedStyle(el).position === "static") return;
    const hit = event.target.closest(ignoreSelector);
    if (hit && hit !== handle && handle.contains(hit)) return;
    const rect = el.getBoundingClientRect();
    grabX = event.clientX - rect.left;
    grabY = event.clientY - rect.top;
    startX = event.clientX;
    startY = event.clientY;
    dragging = true;
    moved = false;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // capture is best-effort
    }
    onStart?.(event);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    if (!moved) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
      moved = true;
      el.classList.add("is-dragging");
    }
    const bounds = getBounds();
    const rect = el.getBoundingClientRect();
    const pos = clampPosition(
      event.clientX - bounds.left - grabX,
      event.clientY - bounds.top - grabY,
      rect.width,
      rect.height,
      bounds.width,
      bounds.height,
      { peek },
    );
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    onMove?.(pos, event);
  }

  function onPointerUp(event) {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("is-dragging");
    onEnd?.({ moved }, event);
  }

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", onPointerUp);
  handle.addEventListener("pointercancel", onPointerUp);

  return {
    destroy() {
      handle.removeEventListener("pointerdown", onPointerDown);
      handle.removeEventListener("pointermove", onPointerMove);
      handle.removeEventListener("pointerup", onPointerUp);
      handle.removeEventListener("pointercancel", onPointerUp);
    },
  };
}
