import { createDefaultScene } from "./scene.js";
import { createMeshRenderer } from "./renderer.js";
import { createSimplexNoise } from "./noise.js";
import { sampleMotion } from "./motion.js";

const canvas = document.querySelector("#mesh-canvas");
const status = document.querySelector("#boot-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = createDefaultScene({ reducedMotion });
const renderer = createMeshRenderer(canvas);
const noise = createSimplexNoise(54);
let resizeFrame = 0;
let animationFrame = 0;
let elapsedSeconds = 0;
let lastTimestamp = 0;
let framePoints = sampleMotion(scene, 0, noise);

function render() {
  renderer.render(scene, framePoints);
}

function animate(timestamp) {
  animationFrame = 0;
  if (document.hidden) return;

  if (lastTimestamp && scene.settings.playing) {
    elapsedSeconds += Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  }
  lastTimestamp = timestamp;
  framePoints = sampleMotion(scene, elapsedSeconds, noise);
  render();

  if (scene.settings.playing) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function requestRender() {
  if (!animationFrame && !document.hidden) {
    animationFrame = requestAnimationFrame(animate);
  }
}

function resizeCanvas() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
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
status.textContent = "Color field online";
