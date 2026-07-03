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
