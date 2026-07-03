/* SPECIMEN 46 · Kinetic Typography Lab — entry point.
   GSAP core + plugins are loaded as globals from the CDN;
   section modules are ES modules initialised from here. */

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable);

/* iOS address-bar show/hide fires resize events constantly while
   scrolling — without this, ScrollTrigger.refresh() thrashes. */
ScrollTrigger.config({ ignoreMobileResize: true });

/* Pins and trigger positions computed against fallback-font metrics
   are wrong; re-measure once the real fonts are in. */
document.fonts.ready.then(() => ScrollTrigger.refresh());

import { buildWall } from "./wall.js";
import { initHero } from "./hero.js";

buildWall(document.querySelector(".wall-grid"));

/* All kinetic behaviour lives inside matchMedia contexts so
   prefers-reduced-motion users get the clean static specimen. */
const mm = gsap.matchMedia();

mm.add("(prefers-reduced-motion: no-preference)", () => {
  initHero(document.querySelector("#hero"));
});

console.info(`Kinetic Typography Lab — GSAP ${gsap.version}`);
