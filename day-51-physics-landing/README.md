# Day 51 — HEAVY: A Physics Playground Landing Page

A landing page for a fictional design studio where **every element of the UI is a Matter.js rigid body**. The headline letters H-E-A-V-Y, the nav pills, six feature cards, and three decorative circles rain down from above the viewport on load, bounce, and settle into a pile. Grab anything and fling it — it all has tuned mass, restitution, and friction. A corner control cycles gravity between **down / float / up** (float keeps the wreckage adrift with tiny random impulses; up piles everything against the ceiling), **shake** blasts every body with a random impulse while the screen judders for 200ms, and **reassemble** — the showpiece — freezes each body, tweens it back into a proper hero layout with a per-body stagger, holds the illusion of a normal landing page for two seconds, then hands it all back to the physics engine to collapse again. Clicking a nav pill at rest confesses "this nav has weight," and every ~8s an idle body gets a nudge so the scene never quite falls asleep.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-51-physics-landing/

## Tech

Vanilla JS (ES modules) + [Matter.js](https://brm.io/matter-js/) 0.20 via CDN — no build step. The renderer is **DOM-sync**: Matter runs headless (no canvas), and each invisible body drives a real absolutely-positioned DOM element via `translate3d(...) rotate(...)` every engine tick, so all text stays crisp, real, and inspectable. Space Grotesk variable (self-hosted woff2, SIL OFL), warm-paper brutalism: 2px ink borders, offset shadows.

## One Thing Learned

A physics world only stays coherent if its *boundaries* respect time the way the simulation does. The ceiling here can't exist on page load (the entrance rain falls in from above), so it has to close afterwards — and closing it on a wall-clock `setTimeout` is a trap: `requestAnimationFrame` pauses in a hidden tab while timers keep firing, so the roof slams shut while the letters are still frozen mid-air above it, sealing them out of the world forever. The fix is to make the trigger *simulation-relative* — an `afterUpdate` listener that closes the roof only once every body has genuinely crossed below the top edge — plus a slow "warden" sweep that teleports anything stranded outside the walls back in. Wall-clock time lies; only engine ticks tell the truth.
