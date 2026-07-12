import { createDefaultScene } from "./scene.js";
import { renderMesh } from "./renderer.js";

const canvas = document.querySelector("#mesh-canvas");
const context = canvas.getContext("2d", { alpha: false });
const status = document.querySelector("#boot-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const scene = createDefaultScene({ reducedMotion });

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
  canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
  renderMesh(context, canvas.width, canvas.height, scene);
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas, { passive: true });
status.textContent = "Color field online";
