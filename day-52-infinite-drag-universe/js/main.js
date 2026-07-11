/* VOID POST — boot.
   Viewport-dependent setup is gated on one requestAnimationFrame so a
   hidden/zero-size embed never boots with a 0x0 viewport. */

import { buildPostcardSVG, CARD_COUNT } from "./postcards.js";

function boot() {
  /* Temporary contact sheet — replaced by the drag engine next stage */
  const field = document.getElementById("field");
  field.style.overflow = "auto";
  field.style.display = "grid";
  field.style.gridTemplateColumns = "repeat(5, 340px)";
  field.style.gap = "40px";
  field.style.padding = "120px 60px";
  field.style.justifyContent = "center";
  for (let i = 0; i < CARD_COUNT; i++) {
    const card = document.createElement("div");
    card.className = "postcard";
    card.appendChild(buildPostcardSVG(i));
    field.appendChild(card);
  }
  console.info("[void-post] contact sheet online");
}

requestAnimationFrame(() => requestAnimationFrame(boot));
