// day 47 — ASCII EVERYTHING
// boot: tabs, statusbar, engine start. Sources arrive per mode.

import { settings, setSource, start, onStats } from './engine.js';
import { demoSource } from './demo.js';

const statusMode = document.getElementById('status-mode');
const statusGrid = document.getElementById('status-grid');
const statusFps = document.getElementById('status-fps');
const statusRamp = document.getElementById('status-ramp');
const tabs = [...document.querySelectorAll('.tab')];

let activeMode = 'demo';

export function setMode(mode) {
  activeMode = mode;
  tabs.forEach((tab) => {
    const on = tab.dataset.mode === mode;
    tab.classList.toggle('is-active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  statusMode.textContent = `MODE:${mode.toUpperCase()}`;
  document.dispatchEvent(new CustomEvent('modechange', { detail: { mode } }));
}

export function getMode() {
  return activeMode;
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(tab.dataset.mode));
});

// toast helper shared by later modules
let toastTimer;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

// demo is the default source, so the page is never empty
setSource(demoSource);

document.addEventListener('modechange', ({ detail }) => {
  if (detail.mode === 'demo') setSource(demoSource);
});

onStats(({ fps, cols, rows }) => {
  statusFps.textContent = `${fps}FPS`;
  statusGrid.textContent = `${cols}×${rows}`;
});

statusRamp.textContent = `RAMP:${settings.ramp}`;

setMode('demo');

// input modes register their modechange listeners on import
import('./webcam.js');
import('./imageMode.js');

// wait for the mono font so glyph metrics are right from the first frame
document.fonts.ready.then(start);
