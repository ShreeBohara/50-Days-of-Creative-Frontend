// main.js — Goo Lab boot.
// Each specimen is a self-contained module that mounts into the .specimens list.
// Heavy canvas loops are handed an on-screen signal so they can idle when scrolled away.
// (Specimen modules are wired in over the following commits.)

function boot() {
  const mount = document.getElementById('specimens');
  if (!mount) return;
  // Specimens register here in later commits, e.g. mountRadialMenu(mount).
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
