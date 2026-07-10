// HEAVY — boot: world, renderer, cast, interactions.

import { createWorld } from "./engine.js";
import { createSync } from "./sync.js";
import { createCast, layoutCast, scaleFor } from "./bodies.js";
import {
  setupMouse,
  setupGravity,
  setupShake,
  setupReassemble,
  setupNavToasts,
  setupIdle,
  REDUCED_MOTION,
} from "./interactions.js";

const { Composite, Body, Events } = window.Matter;

// entrance: each body starts above the viewport near its layout x and drops in
// on its own beat — letters first, then pills, cards, circles
function rainIn(world, sync, cast) {
  const jitter = (n) => (Math.random() - 0.5) * n;
  let added = 0;
  cast.forEach((item, i) => {
    Body.setPosition(item.body, {
      x: item.home.x + jitter(60),
      y: -item.h / 2 - 60 - Math.random() * 300,
    });
    Body.setAngle(item.body, jitter(0.6));
    Body.setAngularVelocity(item.body, jitter(0.1));
    setTimeout(() => {
      sync.register(item);
      Composite.add(world.world, item.body);
      added += 1;
    }, 160 + i * 80 + Math.random() * 50);
  });
  // close the roof only once every body has genuinely fallen into view —
  // simulation time, not wall clock, so a paused/throttled tab can't trap
  // stragglers on the wrong side of the ceiling
  const guard = () => {
    if (added < cast.length) return;
    if (!cast.every((c) => c.body.position.y > c.h / 2)) return;
    Events.off(world.engine, "afterUpdate", guard);
    world.enableCeiling();
  };
  Events.on(world.engine, "afterUpdate", guard);
}

// reduced motion: no rain — the page opens already composed, weightless
function placeSettled(world, sync, cast) {
  for (const item of cast) {
    sync.register(item);
    Composite.add(world.world, item.body);
  }
  world.enableCeiling();
}

function boot() {
  const stage = document.getElementById("stage");
  const world = createWorld();
  const sync = createSync(world, stage);

  const cast = createCast(world.viewport());
  let scale = scaleFor(world.viewport().w);

  if (REDUCED_MOTION) {
    placeSettled(world, sync, cast);
  } else {
    rainIn(world, sync, cast);
  }

  setupMouse(world, cast, stage);
  setupGravity(world, cast, REDUCED_MOTION ? 1 : 0); // reduced motion starts in float
  setupShake(world, cast);
  setupReassemble(world, cast, sync);
  setupNavToasts(cast);
  setupIdle(world, cast);

  // pull anything stranded outside the walls (resize, tunneling) back into view
  function clampIntoView(vp) {
    for (const item of cast) {
      if (item.body.isStatic) continue;
      const { x, y } = item.body.position;
      const cx = Math.min(Math.max(x, item.w / 2 + 4), vp.w - item.w / 2 - 4);
      let cy = Math.min(y, vp.h - item.h / 2 - 4);
      if (world.hasCeiling()) cy = Math.max(cy, item.h / 2 + 4);
      if (cx !== x || cy !== y) {
        Body.setPosition(item.body, { x: cx, y: cy });
        Body.setVelocity(item.body, { x: 0, y: 0 });
      }
    }
  }

  world.onResize((vp) => {
    layoutCast(cast, vp);

    // resize across a size class: rescale bodies and their elements in place
    const next = scaleFor(vp.w);
    const f = next / scale;
    if (Math.abs(f - 1) > 0.08) {
      scale = next;
      for (const item of cast) {
        Body.scale(item.body, f, f);
        item.w *= f;
        item.h *= f;
        if (item.r) item.r *= f;
        item.el.style.width = `${item.w}px`;
        item.el.style.height = `${item.h}px`;
        const fs = parseFloat(item.el.style.fontSize);
        if (fs) item.el.style.fontSize = `${fs * f}px`;
      }
    }

    clampIntoView(vp);
  });

  // slow warden sweep for anything that still finds a way out
  setInterval(() => clampIntoView(world.viewport()), 2500);

  console.info(`HEAVY: ${cast.length} bodies live`);

  // console handle for poking the world
  window.HEAVY = { world, cast, sync };
}

// wait for the first rendered frame: rAF never fires in a hidden/unsized tab,
// so this guarantees the world is built against a real, laid-out viewport
requestAnimationFrame(boot);
