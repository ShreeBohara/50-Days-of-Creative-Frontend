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

import { buildWall, initWallRipple } from "./wall.js";
import { initHero } from "./hero.js";
import { initScatter } from "./scatter.js";
import { initWave } from "./wave.js";
import { initElastic } from "./elastic.js";
import { initMarquee } from "./marquee.js";
import { initCursor } from "./cursor.js";

/* All kinetic behaviour lives inside matchMedia contexts so
   prefers-reduced-motion users get the clean static specimen.
   Sections initialise in DOM order — the scatter pin changes the
   page length, so trigger creation order matters. */
const mm = gsap.matchMedia();

/* The wall exists for everyone; the cell count adapts to the viewport
   and the ripple only runs for motion-OK users. matchMedia re-runs
   this block whenever either condition flips. */
mm.add(
  {
    motionOK: "(prefers-reduced-motion: no-preference)",
    small: "(max-width: 640px)",
  },
  (ctx) => {
    const { motionOK, small } = ctx.conditions;
    const grid = document.querySelector(".wall-grid");
    const cols = small ? 4 : 5;
    const rows = small ? 5 : 8;
    grid.style.setProperty("--wall-cols", cols);
    const cells = buildWall(grid, cols, rows);
    if (motionOK) initWallRipple(grid, cells, cols, rows);
  }
);

mm.add(
  {
    motionOK: "(prefers-reduced-motion: no-preference)",
    coarse: "(pointer: coarse)",
  },
  (ctx) => {
    const { motionOK, coarse } = ctx.conditions;
    if (!motionOK) return;

    initHero(document.querySelector("#hero"));
    initScatter(document.querySelector("#scatter"), { coarse });
    initWave(document.querySelector("#wave"), { coarse });
    initElastic(document.querySelector("#elastic"));
    initMarquee(document.querySelector("#marquee"));
    initCursor();

    /* Quiet entrances for the caption lines — one trigger each,
       nothing continuous. */
    document.querySelectorAll(".caption").forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 14,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 88%" },
      });
    });

    /* Hero chrome settles in on load */
    gsap.from(".hero-sub, .site-head", {
      autoAlpha: 0,
      y: 10,
      duration: 0.9,
      ease: "power2.out",
      stagger: 0.12,
      delay: 0.15,
    });
  }
);

console.info(`Kinetic Typography Lab — GSAP ${gsap.version}`);
