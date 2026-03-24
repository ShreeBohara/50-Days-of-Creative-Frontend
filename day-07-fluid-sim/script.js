/* ── Day 07 · Fluid Simulation ──
 *  Real-time 2D fluid dynamics with GPU-accelerated
 *  Navier-Stokes solver running in WebGL fragment shaders.
 */

'use strict';

/* ── DOM refs ── */
const canvas = document.querySelector('[data-fluid-canvas]');
const hero = document.querySelector('[data-hero]');
const viscositySlider = document.querySelector('[data-viscosity]');
const diffusionSlider = document.querySelector('[data-diffusion]');
const viscosityValue = document.querySelector('[data-viscosity-value]');
const diffusionValue = document.querySelector('[data-diffusion-value]');
const clearBtn = document.querySelector('[data-clear]');
const randomSplatsBtn = document.querySelector('[data-random-splats]');

/* ── Canvas and WebGL context ── */
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

resizeCanvas();

const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });

if (!gl) {
  document.body.innerHTML = '<p style="color:#e8e6f0;text-align:center;padding:4rem;font-family:system-ui">WebGL 2 is not supported on this browser.</p>';
}
