// DITHER LAB — entry point. Owns the app state and the render loop; the
// processing pipeline, algorithms and controls plug in around this.

import { drawSampleScene } from "./sample.js";
import { runPipeline } from "./pipeline.js";
import { DITHERERS } from "./ditherers.js";
import { PALETTES, resolvePalette } from "./palettes.js";
import { buildControls } from "./controls.js";
import { initCompare } from "./compare.js";
import { applyCRT } from "./crt.js";
import { initTheme } from "./theme.js";

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
  customColors: ["#17130b", "#9d3a1c", "#f7f3e8"],
};

const stage = document.getElementById("stage");
const stack = document.getElementById("stack");
const canvasOriginal = document.getElementById("canvas-original");
const canvasProcessed = document.getElementById("canvas-processed");
const ticket = {
  algo: document.getElementById("ticket-algo"),
  palette: document.getElementById("ticket-palette"),
  px: document.getElementById("ticket-px"),
  size: document.getElementById("ticket-size"),
};

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
  stage.style.height = ""; // measure with the stylesheet height first
  const cs = getComputedStyle(stage);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const box = stage.getBoundingClientRect();
  const ar = state.source.width / state.source.height;
  const availW = box.width - padX - pad * 2;

  // small screens: the stage hugs the image instead of a fixed viewport slice
  if (window.matchMedia("(max-width: 760px)").matches) {
    const h = availW / ar;
    stack.style.width = `${Math.floor(availW)}px`;
    stack.style.height = `${Math.floor(h)}px`;
    stage.style.height = `${Math.ceil(h + padY + pad * 2)}px`;
    return;
  }

  const availH = box.height - padY - pad * 2;
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

  const ditherer = DITHERERS[state.algorithm] || DITHERERS.none;
  const out = runPipeline(src, {
    pixelSize: state.pixelSize,
    grayscale: state.grayscale,
    brightness: state.brightness,
    contrast: state.contrast,
    palette: resolvePalette(state),
    serpentine: state.serpentine,
    ditherFn: ditherer.draw ? null : ditherer.fn,
    drawFn: ditherer.draw ? ditherer.fn : null,
  });
  canvasProcessed.width = out.width;
  canvasProcessed.height = out.height;
  canvasProcessed.getContext("2d").drawImage(out, 0, 0);
  if (state.crt) applyCRT(canvasProcessed);

  ticket.algo.textContent = ditherer.label;
  ticket.palette.textContent = (PALETTES[state.palette] || PALETTES["1-bit"]).label;
  ticket.px.textContent = `px ${state.pixelSize}`;
  ticket.size.textContent = `${src.width}×${src.height} — ${state.sourceName}`;
}

// ---- uploads --------------------------------------------------------------------

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    setSource(img, img.naturalWidth, img.naturalHeight, file.name.toLowerCase());
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// the whole page is a drop target
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  document.body.classList.add("is-dropping");
});
window.addEventListener("dragleave", (e) => {
  if (!e.relatedTarget) document.body.classList.remove("is-dropping");
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("is-dropping");
  if (e.dataTransfer && e.dataTransfer.files.length) loadFile(e.dataTransfer.files[0]);
});

// ---- boot ---------------------------------------------------------------------

buildControls(document.getElementById("controls-body"), state, {
  onChange: requestRender,
  loadFile,
});
initCompare(stack, document.getElementById("divider"), state);
initTheme(document.getElementById("neg-toggle"));

const sample = drawSampleScene();
setSource(sample, sample.width, sample.height, "sample scene");

window.addEventListener("resize", () => { fitStack(); });

// debug handle for poking at the lab from the console
window.ditherLab = { state, requestRender, setSource };
