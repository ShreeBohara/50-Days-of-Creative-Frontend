import { createDefaultScene } from "./scene.js";
import { createMeshRenderer } from "./renderer.js";
import { createSimplexNoise } from "./noise.js";
import { sampleMotion } from "./motion.js";
import { mountPaletteControls } from "./paletteControls.js";
import { mountStudioControls } from "./studioControls.js";
import { mountRandomizeControls } from "./randomizeControls.js";
import { randomizeScene, shuffleSceneMotion } from "./randomize.js";
import { mountCssExport, mountPngExport } from "./exportControls.js";

const canvas = document.querySelector("#mesh-canvas");
const status = document.querySelector("#boot-status");
const liveRegion = document.querySelector("#live-region");
const toast = document.querySelector("#toast");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = createDefaultScene({ reducedMotion });
const renderer = createMeshRenderer(canvas);
const noise = createSimplexNoise(54);
let resizeFrame = 0;
let animationFrame = 0;
let elapsedSeconds = 0;
let lastTimestamp = 0;
let framePoints = sampleMotion(scene, 0, noise);
let transitionActive = false;
let transitionStart = 0;
let transitionProgress = 1;
let toastTimer = 0;

function render() {
  renderer.render(scene, framePoints, { transitionProgress });
}

function animate(timestamp) {
  animationFrame = 0;
  if (document.hidden) return;

  if (lastTimestamp && scene.settings.playing) {
    elapsedSeconds += Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  }
  lastTimestamp = timestamp;
  framePoints = sampleMotion(scene, elapsedSeconds, noise);

  if (transitionActive) {
    const linearProgress = Math.min(1, Math.max(0, (timestamp - transitionStart) / 1000));
    transitionProgress = 1 - (1 - linearProgress) ** 3;
    if (linearProgress >= 1) {
      transitionActive = false;
      transitionProgress = 1;
    }
  }
  render();

  if (scene.settings.playing || transitionActive) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function requestRender() {
  if (!animationFrame && !document.hidden) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function announce(message) {
  liveRegion.textContent = "";
  requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

function notify(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3600);
}

function sceneChanged() {
  framePoints = sampleMotion(scene, elapsedSeconds, noise);
  requestRender();
}

function resizeCanvas() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    transitionActive = false;
    transitionProgress = 1;
    renderer.resize();
    requestRender();
  });
}

renderer.resize();
requestRender();
window.addEventListener("resize", resizeCanvas, { passive: true });
document.addEventListener("visibilitychange", () => {
  lastTimestamp = 0;
  if (!document.hidden) requestRender();
});
const paletteControls = mountPaletteControls({
  container: document.querySelector("#palette-controls"),
  scene,
  onChange: sceneChanged,
  announce,
});
mountStudioControls({
  motionContainer: document.querySelector("#motion-controls"),
  surfaceContainer: document.querySelector("#surface-controls"),
  scene,
  onChange: sceneChanged,
  onPointCountChange: () => paletteControls.refresh(),
  announce,
});
mountRandomizeControls({
  container: document.querySelector("#compose-controls"),
  onRandomize: () => {
    if (!reducedMotion) renderer.captureTransition();
    const palette = randomizeScene(scene);
    elapsedSeconds = 0;
    lastTimestamp = 0;
    framePoints = sampleMotion(scene, 0, noise);
    paletteControls.refresh();
    transitionActive = !reducedMotion;
    transitionStart = performance.now();
    transitionProgress = reducedMotion ? 1 : 0;
    requestRender();
    announce(`${palette.name} field randomized`);
  },
  onShuffle: () => {
    shuffleSceneMotion(scene, framePoints);
    elapsedSeconds = 0;
    lastTimestamp = 0;
    framePoints = sampleMotion(scene, 0, noise);
    requestRender();
    announce("Motion paths shuffled");
  },
});
mountPngExport({
  container: document.querySelector("#export-controls"),
  scene,
  getFramePoints: () => framePoints,
  grainTexture: renderer.grainTexture,
  announce,
});
mountCssExport({
  container: document.querySelector("#export-controls"),
  scene,
  getFramePoints: () => framePoints,
  fallbackDialog: document.querySelector("#css-fallback"),
  fallbackCode: document.querySelector("#css-fallback-code"),
  notify,
});
document.querySelector("#select-css").addEventListener("click", () => {
  const code = document.querySelector("#css-fallback-code");
  code.focus();
  code.select();
});
status.textContent = "Color field online";
