import { createDefaultScene } from "./scene.js";
import { createMeshRenderer } from "./renderer.js";

const canvas = document.querySelector("#mesh-canvas");
const status = document.querySelector("#boot-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = createDefaultScene({ reducedMotion });
const renderer = createMeshRenderer(canvas);
let resizeFrame = 0;

function render() {
  renderer.render(scene);
}

function resizeCanvas() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    renderer.resize();
    render();
  });
}

renderer.resize();
render();
window.addEventListener("resize", resizeCanvas, { passive: true });
status.textContent = "Color field online";
