/* main.js — boot and wiring.
 *
 * Boot runs on DOMContentLoaded, never gated on rAF — a hidden preview
 * tab throttles rAF and the page would stay blank there. The first
 * frame is painted synchronously with tick(0) for the same reason.
 */

import { buildTextures } from "./textures.js";
import { formatCaption } from "./textureRecipes.js";
import { createContext } from "./glCore.js";
import { createRenderer } from "./renderer.js";
import { mountFallback } from "./fallback.js";

function labelFrames(textures, frames) {
  textures.forEach(({ recipe }, i) => {
    const frame = frames[i];
    if (!frame) return;
    frame.setAttribute("role", "img");
    frame.setAttribute(
      "aria-label",
      `${formatCaption(i, recipe.title)} — ${recipe.subtitle}`,
    );
  });
}

function boot() {
  const textures = buildTextures();
  const frames = [...document.querySelectorAll(".frame")];
  const glCanvas = document.getElementById("gl");

  labelFrames(textures, frames);

  const gl = glCanvas ? createContext(glCanvas) : null;

  if (!gl) {
    if (glCanvas) glCanvas.remove();
    mountFallback(textures, frames);
    window.gallery = { version: "day-61", mode: "fallback" };
    return;
  }

  let renderer;
  try {
    renderer = createRenderer({ gl, canvas: glCanvas, frames, textures });
  } catch (err) {
    /* a driver that gives us a context but fails to compile shaders
     * still deserves the static gallery */
    console.error("day-61: GL boot failed, falling back —", err);
    glCanvas.remove();
    mountFallback(textures, frames);
    window.gallery = { version: "day-61", mode: "fallback", error: String(err) };
    return;
  }

  renderer.measure();
  renderer.tick(0); // immediate first paint

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(now - last, 100); // clamp tab-switch jumps
    last = now;
    renderer.tick(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener("resize", () => renderer.measure());
  if (document.fonts?.ready) {
    /* caption fonts change item heights — re-measure once they land */
    document.fonts.ready.then(() => renderer.measure());
  }

  /* headless-QA controller: drives the same tick as the rAF loop */
  window.gallery = {
    version: "day-61",
    mode: "gl",
    step(n = 1) {
      for (let i = 0; i < n; i++) renderer.tick(1000 / 60);
    },
    setEffect(name) {
      renderer.setEffect(name);
      renderer.draw();
    },
    state() {
      return {
        effect: renderer.effect,
        time: renderer.time,
        rects: renderer.planes.map((p) => p.viewRect),
      };
    },
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
