// controls — the rack modules. Each panel group is built here and pushes
// straight into engine settings; the render loop picks changes up next frame.

import { settings } from './engine.js';

const statusRamp = document.getElementById('status-ramp');

// small DOM helpers — the whole panel is generated, so keep it terse
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function field(labelText, input) {
  const wrap = el('label', 'field');
  wrap.append(el('span', 'field-label', labelText), input);
  return wrap;
}

/* ── RAMP ─────────────────────────────────────────────── */

const RAMP_PRESETS = [
  { name: 'CLASSIC', ramp: '@%#*+=-:. ' },
  { name: 'BLOCKS', ramp: '█▓▒░ ' },
  { name: 'BINARY', ramp: '10 ' },
];

const rampBody = document.getElementById('ramp-body');
const chipRow = el('div', 'chip-row');

const customInput = el('input', 'text-input');
customInput.type = 'text';
customInput.spellcheck = false;
customInput.autocomplete = 'off';
customInput.maxLength = 32;
customInput.placeholder = 'type your own ramp…';

function applyRamp(ramp, activeChip) {
  if (!ramp.length) return;
  settings.ramp = ramp;
  statusRamp.textContent = `RAMP:${ramp}`;
  [...chipRow.children].forEach((chip) => {
    chip.classList.toggle('is-active', chip === activeChip);
    chip.setAttribute('aria-pressed', String(chip === activeChip));
  });
}

RAMP_PRESETS.forEach((preset, i) => {
  const chip = el('button', 'chip', preset.name);
  chip.type = 'button';
  chip.title = preset.ramp;
  chip.setAttribute('aria-pressed', String(i === 0));
  if (i === 0) chip.classList.add('is-active');
  chip.addEventListener('click', () => {
    applyRamp(preset.ramp, chip);
    customInput.value = '';
  });
  chipRow.appendChild(chip);
});

customInput.addEventListener('input', () => {
  if (customInput.value.length >= 2) applyRamp(customInput.value, null);
});

rampBody.append(chipRow, field('CUSTOM · dense→sparse', customInput));

/* ── PHOSPHOR (color modes) ───────────────────────────── */
// the page chrome retints with the phosphor: data-colormode swaps the
// CSS custom properties, so the whole rig follows the screen

const COLOR_MODES = [
  { name: 'GREEN', mode: 'green' },
  { name: 'AMBER', mode: 'amber' },
  { name: 'WHITE', mode: 'white' },
  { name: 'ORIGINAL', mode: 'original' },
  { name: 'GAME BOY', mode: 'gameboy' },
];

const colorBody = document.getElementById('color-body');
const colorRow = el('div', 'chip-row');

COLOR_MODES.forEach((entry, i) => {
  const chip = el('button', 'chip', entry.name);
  chip.type = 'button';
  chip.setAttribute('aria-pressed', String(i === 0));
  if (i === 0) chip.classList.add('is-active');
  chip.addEventListener('click', () => {
    settings.colorMode = entry.mode;
    // 'original' carries the source's own colors — chrome stays green
    document.body.dataset.colormode = entry.mode === 'original' ? 'green' : entry.mode;
    [...colorRow.children].forEach((other) => {
      other.classList.toggle('is-active', other === chip);
      other.setAttribute('aria-pressed', String(other === chip));
    });
  });
  colorRow.appendChild(chip);
});

colorBody.append(colorRow);

/* ── SIGNAL (resolution / contrast / invert) ──────────── */

const signalBody = document.getElementById('signal-body');

function slider({ label, min, max, value, format, onInput }) {
  const input = el('input', 'range-input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.value = value;
  const wrap = field(label, input);
  const readout = el('span', 'field-value', format(value));
  wrap.querySelector('.field-label').appendChild(readout);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    readout.textContent = format(v);
    onInput(v);
  });
  return wrap;
}

signalBody.append(
  slider({
    label: 'RESOLUTION',
    min: 40,
    max: 200,
    value: settings.cols,
    format: (v) => `${v} COLS`,
    onInput: (v) => { settings.cols = v; },
  }),
  slider({
    label: 'CONTRAST',
    min: -100,
    max: 100,
    value: settings.contrast,
    format: (v) => (v > 0 ? `+${v}` : `${v}`),
    onInput: (v) => { settings.contrast = v; },
  })
);

const invertBtn = el('button', 'toggle-btn', 'INVERT: OFF');
invertBtn.type = 'button';
invertBtn.setAttribute('aria-pressed', 'false');
invertBtn.addEventListener('click', () => {
  settings.invert = !settings.invert;
  invertBtn.textContent = `INVERT: ${settings.invert ? 'ON' : 'OFF'}`;
  invertBtn.classList.toggle('is-on', settings.invert);
  invertBtn.setAttribute('aria-pressed', String(settings.invert));
});
signalBody.append(invertBtn);

/* ── TUBE (CRT overlay) ───────────────────────────────── */

const fxBody = document.getElementById('fx-body');
const crtOverlay = document.getElementById('crt-overlay');

const crtBtn = el('button', 'toggle-btn', 'SCANLINES: OFF');
crtBtn.type = 'button';
crtBtn.setAttribute('aria-pressed', 'false');
crtBtn.addEventListener('click', () => {
  const on = crtOverlay.classList.toggle('is-on');
  crtBtn.textContent = `SCANLINES: ${on ? 'ON' : 'OFF'}`;
  crtBtn.classList.toggle('is-on', on);
  crtBtn.setAttribute('aria-pressed', String(on));
});
fxBody.append(crtBtn);
