/* VOID POST — boot.
   Viewport-dependent setup is gated on one requestAnimationFrame so a
   hidden/zero-size embed never boots with a 0x0 viewport. */

function boot() {
  // Modules land here commit by commit: postcards, engine, drag, hud…
  console.info("[void-post] scaffold online");
}

requestAnimationFrame(() => requestAnimationFrame(boot));
