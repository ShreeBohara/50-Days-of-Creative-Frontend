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
import { createInteractions } from "./interactions.js";
import { createCursor } from "./cursor.js";
import { createExpand } from "./expand.js";
import { EFFECTS, DEFAULT_EFFECT, resolveEffect } from "./effectRegistry.js";
import { mountFallback } from "./fallback.js";

/* dropdown + invert checkbox. Everything funnels through apply() so the
 * <select>, the QA controller and the renderer can never disagree. */
function buildControls(renderer) {
  const select = document.getElementById("effect-select");
  const invertWrap = document.getElementById("invert-wrap");
  const invertCheck = document.getElementById("invert-check");
  if (!select || !invertWrap || !invertCheck) {
    return { apply() {}, setInvert() {} };
  }

  for (const effect of EFFECTS) {
    const option = document.createElement("option");
    option.value = effect.id;
    option.textContent = effect.label;
    select.appendChild(option);
  }

  function apply(id) {
    const resolved = resolveEffect(id);
    const def = EFFECTS.find((e) => e.id === resolved);
    select.value = resolved;
    invertWrap.hidden = !def.hasInvert;
    renderer.setEffect(def.fragKey);
    renderer.draw();
  }

  function setInvert(on) {
    invertCheck.checked = !!on;
    renderer.globals.invert = on ? 1 : 0;
    renderer.draw();
  }

  select.addEventListener("change", () => apply(select.value));
  invertCheck.addEventListener("change", () => setInvert(invertCheck.checked));

  apply(DEFAULT_EFFECT);
  return { apply, setInvert };
}

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

  const interactions = createInteractions({ renderer });
  const expand = createExpand({
    renderer,
    interactions,
    titleEl: document.getElementById("expand-title"),
  });
  const cursor = createCursor({ interactions });
  renderer.setUpdater((dtSec) => {
    interactions.update(dtSec);
    expand.update(dtSec);
    cursor.update();
  });
  const controls = buildControls(renderer);

  /* one click path: expanded (or expanding) -> collapse; otherwise the
   * plane under the pointer expands. Click coordinates refresh the
   * stored pointer first so touch taps resolve the right plane. */
  window.addEventListener("click", (e) => {
    if (expand.active) {
      expand.close();
      return;
    }
    interactions.setMouse(e.clientX, e.clientY, e.timeStamp);
    const i = interactions.hoveredIndex();
    if (i !== null) expand.open(i);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") expand.close();
  });

  /* keyboard path: frames are focusable, Enter/Space expands */
  frames.forEach((frame, i) => {
    frame.setAttribute("tabindex", "0");
    frame.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (expand.active) expand.close();
      else expand.open(i);
    });
  });

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
    setMouse(x, y) {
      interactions.setMouse(x, y);
    },
    setEffect(name) {
      controls.apply(name);
    },
    setInvert(on) {
      controls.setInvert(on);
    },
    expand(i) {
      expand.open(i);
    },
    collapse() {
      expand.close();
    },
    state() {
      return {
        effect: renderer.effect,
        time: renderer.time,
        velocity: renderer.globals.velocity,
        hover: renderer.planes.map((p) => Number(p.uHover.toFixed(4))),
        hovered: interactions.hoveredIndex(),
        expand: { phase: expand.phase, index: expand.index },
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
