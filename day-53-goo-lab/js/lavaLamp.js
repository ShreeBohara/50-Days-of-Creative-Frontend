// lavaLamp.js — SPECIMEN 05
// Ambient, no interaction. A row of blobs drift up and down on staggered CSS
// timelines inside a #goo container, so they detach from the top/bottom pools
// and re-merge like a real lava lamp. Hue slowly cycles for a living feel.
// Pure CSS motion — JS only builds the DOM.

import { el } from './util.js';

const BLOBS = [
  { left: 10, size: 130, dur: 17, delay: -2 },
  { left: 26, size: 92,  dur: 22, delay: -11 },
  { left: 43, size: 158, dur: 15, delay: -6 },
  { left: 60, size: 104, dur: 20, delay: -14 },
  { left: 75, size: 128, dur: 24, delay: -8 },
  { left: 88, size: 82,  dur: 18, delay: -17 },
];

export function mountLavaLamp(stage) {
  const lava = el('div', { class: 'lava', 'aria-hidden': 'true' });
  lava.appendChild(el('div', { class: 'lava-pool lava-pool--bottom' }));
  lava.appendChild(el('div', { class: 'lava-pool lava-pool--top' }));
  for (const b of BLOBS) {
    lava.appendChild(el('div', {
      class: 'lava-blob',
      style: {
        left: `${b.left}%`,
        width: `${b.size}px`,
        height: `${b.size}px`,
        animationDuration: `${b.dur}s`,
        animationDelay: `${b.delay}s`,
      },
    }));
  }
  stage.appendChild(lava);
  return {};
}
