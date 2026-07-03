// day 47 — ASCII EVERYTHING
// boot: tabs, statusbar, engine start. Sources arrive per mode.

import { settings, setSource, start, onStats } from './engine.js';

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

// --- temporary test card until the demo source lands ---
// vertical gradient + a bright disc: proves the luminance→char mapping
const card = document.createElement('canvas');
card.width = 320;
card.height = 180;
const cctx = card.getContext('2d');
const grad = cctx.createLinearGradient(0, 0, 320, 0);
grad.addColorStop(0, '#000');
grad.addColorStop(1, '#fff');
cctx.fillStyle = grad;
cctx.fillRect(0, 0, 320, 180);
cctx.fillStyle = '#fff';
cctx.beginPath();
cctx.arc(160, 90, 55, 0, Math.PI * 2);
cctx.fill();

setSource({
  drawable: card,
  width: () => card.width,
  height: () => card.height,
});

onStats(({ fps, cols, rows }) => {
  statusFps.textContent = `${fps}FPS`;
  statusGrid.textContent = `${cols}×${rows}`;
});

statusRamp.textContent = `RAMP:${settings.ramp}`;

setMode('demo');

// wait for the mono font so glyph metrics are right from the first frame
document.fonts.ready.then(start);
