/* VOID POST — boot.
   Viewport-dependent setup is gated on one requestAnimationFrame so a
   hidden/zero-size embed never boots with a 0x0 viewport. */

import { createEngine } from "./engine.js";

function boot() {
  const field = document.getElementById("field");
  const engine = createEngine({ field });

  // Debug handle: lets tooling drive the simulation when rAF is throttled.
  window.__universe = engine;

  console.info("[void-post] universe online —", engine.state.tiles.length, "tiles in pool");
}

requestAnimationFrame(() => requestAnimationFrame(boot));
