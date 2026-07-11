/* VOID POST — pointer drag + inertia.
   One pointer pans the world. A press that never travels more than the
   threshold is a click (card expand); anything further is a drag. On
   release, velocity measured over the last ~100ms becomes a friction
   glide — no library, just v *= friction every frame. */

const DRAG_THRESHOLD = 6;     // px of travel before a press becomes a drag
const SAMPLE_WINDOW = 100;    // ms of pointer history used for release velocity
const FRICTION = 0.94;        // per-frame velocity decay (at 60fps)
const STOP_EPSILON = 0.02;    // px/frame below which the glide ends
const MAX_FLING = 90;         // px/frame cap so a wild throw stays readable

export function createDrag({ engine, universe, onCardClick }) {
  const ctl = { dragging: false };

  let active = false;
  let lastX = 0, lastY = 0;
  let downX = 0, downY = 0;
  let downTile = null;
  let samples = [];

  universe.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    active = true;
    ctl.dragging = false;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    downTile = e.target instanceof Element ? e.target.closest(".tile") : null;
    samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
    engine.state.vx = 0; // grabbing the field stops any glide dead
    engine.state.vy = 0;
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
    if (ctl.dragging) {
      engine.pan(dx, dy);
      const now = performance.now();
      samples.push({ t: now, x: e.clientX, y: e.clientY });
      while (samples.length > 2 && now - samples[0].t > SAMPLE_WINDOW) samples.shift();
    }
  });

  function release(e) {
    if (!active) return;
    active = false;
    if (ctl.dragging && samples.length > 1) {
      // average velocity across the sample window, converted to px/frame
      const a = samples[0];
      const b = samples[samples.length - 1];
      const dt = Math.max(b.t - a.t, 1);
      const clamp = (v) => Math.max(-MAX_FLING, Math.min(MAX_FLING, v));
      engine.state.vx = clamp(((b.x - a.x) / dt) * (1000 / 60));
      engine.state.vy = clamp(((b.y - a.y) / dt) * (1000 / 60));
    } else if (!ctl.dragging && downTile && onCardClick) {
      onCardClick(downTile, e);
    }
    ctl.dragging = false;
    downTile = null;
    universe.classList.remove("is-dragging");
  }

  // Inertia: while nobody is holding the field, velocity keeps panning it,
  // decaying by friction each frame until it falls below the epsilon.
  engine.onFrame((state) => {
    if (ctl.dragging || (state.vx === 0 && state.vy === 0)) return;
    state.x += state.vx;
    state.y += state.vy;
    state.vx *= FRICTION;
    state.vy *= FRICTION;
    if (Math.hypot(state.vx, state.vy) < STOP_EPSILON) {
      state.vx = 0;
      state.vy = 0;
    }
  });

  universe.addEventListener("pointerup", release);
  universe.addEventListener("pointercancel", release);

  return ctl;
}
