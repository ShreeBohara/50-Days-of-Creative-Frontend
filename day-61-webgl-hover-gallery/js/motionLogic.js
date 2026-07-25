/* motionLogic.js — pure motion math: easings, frame-rate-independent
 * exponential smoothing, and the hover / velocity state machines that
 * feed the shader uniforms. No DOM — fully covered by node tests.
 */

/* classic quartic ease for the expand tween — no overshoot */
export function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* frame-rate-independent exponential approach:
 * the same wall-clock time covers the same fraction of the distance
 * no matter how many frames it is sliced into. lambda is 1/seconds. */
export function expSmooth(current, target, lambda, dtSec) {
  return current + (target - current) * (1 - Math.exp(-lambda * dtSec));
}

/* Per-plane hover state: u_hover eases 0..1 (snappy in, lazy out) and
 * u_sinceEnter counts seconds since the cursor entered — ripple decays
 * on it. pulse() is the touch path: slam to 1, let release drain it. */
export function createHoverState({ attack = 10, release = 4 } = {}) {
  let value = 0;
  let sinceEnter = 0;
  let inside = false;

  return {
    get value() { return value; },
    get sinceEnter() { return sinceEnter; },
    get inside() { return inside; },

    update(hovered, dtSec) {
      if (hovered && !inside) sinceEnter = 0; // entry edge
      inside = hovered;
      if (hovered) sinceEnter += dtSec;
      value = expSmooth(value, hovered ? 1 : 0, hovered ? attack : release, dtSec);
      value = Math.min(1, Math.max(0, value));
      return value;
    },

    pulse() {
      value = 1;
      sinceEnter = 0;
      inside = false; // nothing holds it — release decay takes over
    },
  };
}

/* Cursor speed -> u_velocity in [0,1]. Pointer samples raise a spike
 * target (px/ms, normalized by `scale`); the smoothed value chases it
 * with a fast attack and the spike itself drains with a slow decay,
 * so a flick keeps feeding the shaders for a beat after it ends. */
export function createVelocityTracker({ attack = 8, decay = 3, scale = 1.5 } = {}) {
  let value = 0;
  let target = 0;

  return {
    get value() { return value; },

    sample(dx, dy, dtMs) {
      if (dtMs <= 0) return;
      const speed = Math.hypot(dx, dy) / dtMs;
      target = Math.max(target, Math.min(speed / scale, 1));
    },

    /* touch pulse / collapse burst injects a full-strength spike */
    spike(strength = 1) {
      target = Math.max(target, Math.min(strength, 1));
    },

    update(dtSec) {
      value = expSmooth(value, target, target > value ? attack : decay, dtSec);
      target = expSmooth(target, 0, decay, dtSec);
      return value;
    },
  };
}
