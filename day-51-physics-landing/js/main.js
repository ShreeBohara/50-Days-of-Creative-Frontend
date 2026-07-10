// HEAVY — boot. Remaining modules land in later commits:
// sync.js (DOM renderer), bodies.js (cast), interactions.js (controls).

import { createWorld } from "./engine.js";

const world = createWorld();

console.info(
  `HEAVY: Matter.js ${window.Matter.version} running, world ${world.viewport().w}x${world.viewport().h}`
);
