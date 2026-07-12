// main.js — Goo Lab boot.
// Each specimen is a self-contained module that mounts into the .specimens list.
// Heavy canvas loops are handed an on-screen signal so they can idle when scrolled away.
// (More specimen modules are wired in over the following commits.)

import { mountRadialMenu } from './radialMenu.js';
import { mountMetaballs } from './metaballs.js';
import { mountLoader } from './loader.js';
import { mountGooeyText } from './gooeyText.js';

function mount(id, fn) {
  const stage = document.getElementById(id);
  return stage ? fn(stage) : null;
}

function boot() {
  // controllers are exposed on window.goolab so the effects can be poked/tested
  window.goolab = {
    radial: mount('stage-radial', mountRadialMenu),
    metaballs: mount('stage-metaballs', mountMetaballs),
    loader: mount('stage-loader', mountLoader),
    text: mount('stage-text', mountGooeyText),
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
