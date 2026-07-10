// HEAVY — boot: world, renderer, cast. Interactions land in later commits.

import { createWorld } from "./engine.js";
import { createSync } from "./sync.js";
import { createCast, layoutCast } from "./bodies.js";

const { Composite, Body } = window.Matter;

function boot() {
  const stage = document.getElementById("stage");
  const world = createWorld();
  const sync = createSync(world, stage);

  const cast = createCast(world.viewport());
  for (const item of cast) {
    sync.register(item);
    Composite.add(world.world, item.body);
  }

  // bodies currently spawn in the hero layout and immediately succumb to gravity;
  // the staggered entrance rain replaces this in the next commit
  world.enableCeiling();

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
