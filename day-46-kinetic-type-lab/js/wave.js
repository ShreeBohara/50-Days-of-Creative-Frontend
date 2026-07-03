/* 03 · WAVE — a sentence riding an SVG sine path; the wave's
   amplitude follows the pointer's height on screen.

   Technique notes:
   - The flow animates textPath startOffset in USER UNITS, never % —
     percent is relative to path length, and the path length changes
     every time the amplitude changes (instant drift bug).
   - Glyph advances don't depend on curvature, so the loop cycle
     (one sentence's advance width) is constant even while the wave
     re-shapes underneath the text.
   - The sine is approximated with one cubic per half-period: handles
     at ±0.3642·L and peak·4/3 puts the bezier midpoint exactly at the
     sine crest. */

import { pointer, lerp, clamp01 } from "./pointer.js";

const MID = 300; // midline y in the 2400×600 viewBox
const WIDTH = 2400;
const HALF = 400; // half-period length (3 full waves across)
const HANDLE = 0.3642 * HALF;
const PEAK = 4 / 3; // handle y overshoot so the curve peaks at amp
const REPS = 4; // sentence repetitions in the markup
const SPEED = 200; // flow speed, user units per second
const AMP_MIN = 18;
const AMP_MAX = 135;

function buildD(amp) {
  let d = `M 0 ${MID}`;
  let sign = -1; // first crest bends up
  for (let x = 0; x < WIDTH; x += HALF) {
    const py = (MID + sign * amp * PEAK).toFixed(1);
    d += ` C ${(x + HANDLE).toFixed(1)} ${py}, ${(x + HALF - HANDLE).toFixed(1)} ${py}, ${x + HALF} ${MID}`;
    sign *= -1;
  }
  return d;
}

export function initWave(section, { coarse = false } = {}) {
  const path = section.querySelector("#wavePath");
  const tp = section.querySelector("#waveTextPath");

  let cycle = 0;
  const measure = () => {
    cycle = tp.getComputedTextLength() / REPS;
  };
  measure();
  document.fonts.ready.then(measure); // advances change once real fonts land

  const state = { off: 0, amp: 90, built: -1 };

  function tick(time, deltaTime) {
    /* Amplitude: pointer height on fine pointers, a slow breathing
       sine on touch devices or before the pointer has moved. */
    const target =
      coarse || !pointer.moved
        ? 76 + Math.sin(time * 0.5) * 58
        : lerp(AMP_MIN, AMP_MAX, clamp01(pointer.y / window.innerHeight));
    state.amp += (target - state.amp) * 0.08;

    // Rebuilding the path re-lays-out the text — skip sub-pixel changes
    if (Math.abs(state.amp - state.built) > 0.5) {
      path.setAttribute("d", buildD(state.amp));
      state.built = state.amp;
    }

    state.off -= SPEED * (deltaTime / 1000);
    if (state.off <= -cycle) state.off += cycle; // seamless one-sentence wrap
    tp.setAttribute("startOffset", state.off);
  }

  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) =>
      self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick),
  });
}
