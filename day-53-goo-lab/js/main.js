// main.js — Goo Lab boot.
// Each specimen is a self-contained module that mounts into the .specimens list.
// Heavy canvas loops are handed an on-screen signal so they can idle when scrolled away.
// (More specimen modules are wired in over the following commits.)

import { mountRadialMenu } from './radialMenu.js';

function mount(id, fn) {
  const stage = document.getElementById(id);
  if (stage) fn(stage);
}

function boot() {
  mount('stage-radial', mountRadialMenu);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
