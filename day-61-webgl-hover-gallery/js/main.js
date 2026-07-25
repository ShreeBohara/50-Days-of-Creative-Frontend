/* main.js — boot. Commit 1: generate the six procedural textures and
 * mount them straight into the grid (this exact state later doubles
 * as the no-WebGL fallback view).
 *
 * NOTE: boot runs on DOMContentLoaded, never gated on rAF — a hidden
 * preview tab throttles rAF and the page would stay blank there.
 */

import { buildTextures } from "./textures.js";
import { formatCaption } from "./textureRecipes.js";

function boot() {
  const textures = buildTextures();
  const frames = document.querySelectorAll(".frame");

  textures.forEach(({ recipe, canvas }, i) => {
    const frame = frames[i];
    if (!frame) return;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `${formatCaption(i, recipe.title)} — ${recipe.subtitle}`);
    frame.appendChild(canvas);
  });

  /* debug handle for headless QA; grows step()/setMouse()/... later */
  window.gallery = { version: "day-61", textures };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
