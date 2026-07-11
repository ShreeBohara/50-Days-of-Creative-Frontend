/* VOID POST — boot.
   Viewport-dependent setup is gated on one requestAnimationFrame so a
   hidden/zero-size embed never boots with a 0x0 viewport. */

import { createEngine } from "./engine.js";
import { createDrag } from "./drag.js";
import { createParallax } from "./parallax.js";
import { createOverlay } from "./overlay.js";
import { createHud } from "./hud.js";

function boot() {
  const field = document.getElementById("field");
  const universe = document.getElementById("universe");
  const engine = createEngine({ field });

  createParallax({ engine, layer: document.getElementById("parallax") });

  const overlay = createOverlay({ engine });

  createDrag({
    engine,
    universe,
    onCardClick(tile) {
      overlay.show(tile);
    },
  });

  createHud({
    engine,
    minimap: document.getElementById("minimap"),
    minimapDot: document.getElementById("minimapDot"),
    coordsValue: document.getElementById("coordsValue"),
  });

  // Debug handle: lets tooling drive the simulation when rAF is throttled.
  window.__universe = engine;

  console.info("[void-post] universe online —", engine.state.tiles.length, "tiles in pool");
}

requestAnimationFrame(() => requestAnimationFrame(boot));
