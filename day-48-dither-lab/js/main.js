// DITHER LAB — entry point. Owns the app state and the render loop; the
// processing pipeline, algorithms and controls plug in around this.

import { drawSampleScene } from "./sample.js";

const MAX_SOURCE = 1600; // cap uploads so error diffusion stays instant

const state = {
  source: null,          // HTMLCanvasElement holding the (capped) source image
  sourceName: "sample scene",
  algorithm: "floyd-steinberg",
  palette: "gameboy",
  pixelSize: 2,
  brightness: 0,         // -100..100
  contrast: 0,           // -100..100
  grayscale: false,
  serpentine: true,
  crt: false,
  split: 0.5,            // comparison divider position, 0..1
};

const stage = document.getElementById("stage");
const stack = document.getElementById("stack");
const canvasOriginal = document.getElementById("canvas-original");
const canvasProcessed = document.getElementById("canvas-processed");
const ticketSize = document.getElementById("ticket-size");

// ---- source handling --------------------------------------------------------

// Draws any image source onto a fresh canvas, capped to MAX_SOURCE on the
// longest edge, so every later stage works on a known-size canvas.
export function setSource(drawable, w, h, name) {
  const scale = Math.min(1, MAX_SOURCE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext("2d").drawImage(drawable, 0, 0, canvas.width, canvas.height);
  state.source = canvas;
  state.sourceName = name;
  fitStack();
  requestRender();
}

// ---- layout: fit the canvas stack inside the stage, preserving aspect --------

function fitStack() {
  if (!state.source) return;
  const pad = 2; // stack border
  const box = stage.getBoundingClientRect();
  const cs = getComputedStyle(stage);
  const availW = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - pad * 2;
  const availH = box.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - pad * 2;
  const ar = state.source.width / state.source.height;
  let w = availW;
  let h = w / ar;
  if (h > availH) { h = availH; w = h * ar; }
  stack.style.width = `${Math.floor(w)}px`;
  stack.style.height = `${Math.floor(h)}px`;
}

// ---- render loop (rAF-coalesced so slider drags cost one frame each) ----------

let renderQueued = false;

export function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function render() {
  const src = state.source;
  if (!src) return;

  canvasOriginal.width = src.width;
  canvasOriginal.height = src.height;
  canvasOriginal.getContext("2d").drawImage(src, 0, 0);

  // Processing pipeline lands next — until then the output mirrors the source.
  canvasProcessed.width = src.width;
  canvasProcessed.height = src.height;
  canvasProcessed.getContext("2d").drawImage(src, 0, 0);

  ticketSize.textContent = `${src.width}×${src.height} — ${state.sourceName}`;
}

// ---- boot ---------------------------------------------------------------------

const sample = drawSampleScene();
setSource(sample, sample.width, sample.height, "sample scene");

window.addEventListener("resize", () => { fitStack(); });

// debug handle for poking at the lab from the console
window.ditherLab = { state, requestRender, setSource };
