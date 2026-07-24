// VOLTAGE ⚡ — boot. Waits one rAF so layout exists before any
// viewport-dependent wiring (hidden tabs report bogus sizes otherwise).

function boot() {
  document.documentElement.dataset.js = "ready";

  // Debug handle for QA tooling; games register themselves here.
  window.__arcade = window.__arcade || {};
}

requestAnimationFrame(boot);
