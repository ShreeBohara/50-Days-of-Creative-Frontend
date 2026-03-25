/* ═══════════════════════════════════════════════════
 *  Day 08 – Perlin Noise Flow Field
 *  Generative art: particles following a Perlin-noise
 *  vector field with persistent trail rendering.
 * ═══════════════════════════════════════════════════ */
'use strict';

/* ─── DOM Refs ──────────────────────────────────── */

const canvas = document.querySelector('[data-canvas]');
const ctx = canvas.getContext('2d');
const hero = document.querySelector('[data-hero]');

const noiseScaleSlider = document.querySelector('[data-noise-scale]');
const noiseScaleOutput = document.querySelector('[data-noise-scale-value]');
const noiseSpeedSlider = document.querySelector('[data-noise-speed]');
const noiseSpeedOutput = document.querySelector('[data-noise-speed-value]');
const particleCountSlider = document.querySelector('[data-particle-count]');
const particleCountOutput = document.querySelector('[data-particle-count-value]');
const paletteSelect = document.querySelector('[data-palette]');
const clearBtn = document.querySelector('[data-clear]');
const saveBtn = document.querySelector('[data-save]');

/* ─── Canvas Setup ──────────────────────────────── */

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
