// HEAVY — boot: world, renderer, cast. Interactions land in later commits.

import { createWorld } from "./engine.js";
import { createSync } from "./sync.js";
import { createCast, layoutCast } from "./bodies.js";
import { setupMouse, setupGravity, setupShake } from "./interactions.js";

const { Composite, Body } = window.Matter;

// entrance: each body starts above the viewport near its layout x and drops in
// on its own beat — letters first, then pills, cards, circles
function rainIn(world, sync, cast) {
  const jitter = (n) => (Math.random() - 0.5) * n;
  let last = 0;
  cast.forEach((item, i) => {
    Body.setPosition(item.body, {
      x: item.home.x + jitter(60),
      y: -item.h / 2 - 60 - Math.random() * 300,
    });
    Body.setAngle(item.body, jitter(0.6));
    Body.setAngularVelocity(item.body, jitter(0.1));
    last = 160 + i * 80 + Math.random() * 50;
    setTimeout(() => {
      sync.register(item);
      Composite.add(world.world, item.body);
    }, last);
  });
  // close the roof once everything has had time to fall in,
  // so "gravity up" has something to pile against
  setTimeout(() => world.enableCeiling(), last + 2600);
}

function boot() {
  const stage = document.getElementById("stage");
  const world = createWorld();
  const sync = createSync(world, stage);

  const cast = createCast(world.viewport());
  rainIn(world, sync, cast);
  setupMouse(world, cast, stage);
  setupGravity(world, cast);
  setupShake(world, cast);

  world.onResize((vp) => {
    layoutCast(cast, vp);
    // pull anything the resize stranded outside the new walls back into view
    for (const item of cast) {
      const { x, y } = item.body.position;
      const cx = Math.min(Math.max(x, item.w / 2 + 4), vp.w - item.w / 2 - 4);
      let cy = Math.min(y, vp.h - item.h / 2 - 4);
      if (world.hasCeiling()) cy = Math.max(cy, item.h / 2 + 4);
      if (cx !== x || cy !== y) {
        Body.setPosition(item.body, { x: cx, y: cy });
        Body.setVelocity(item.body, { x: 0, y: 0 });
      }
    }
  });

  console.info(`HEAVY: ${cast.length} bodies live`);

  // console handle for poking the world
  window.HEAVY = { world, cast, sync };
}

// wait for the first rendered frame: rAF never fires in a hidden/unsized tab,
// so this guarantees the world is built against a real, laid-out viewport
requestAnimationFrame(boot);
