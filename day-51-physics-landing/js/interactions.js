// interactions.js — everything the visitor can do to the world.

const { Mouse, MouseConstraint, Composite, Events, Query, Body } = window.Matter;

export const REDUCED_MOTION = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

export function setupMouse(world, cast, stage) {
  const mouse = Mouse.create(stage);
  const mc = MouseConstraint.create(world.engine, {
    mouse,
    constraint: { stiffness: 0.18, damping: 0.08 },
  });
  Composite.add(world.world, mc);

  const byBody = new Map(cast.map((item) => [item.body, item]));
  let hovered = null;
  let grabbed = null;

  Events.on(mc, "startdrag", (e) => {
    const item = byBody.get(e.body);
    if (!item) return;
    grabbed = item;
    item.el.classList.add("is-grabbed");
    stage.classList.add("is-dragging");
  });

  Events.on(mc, "enddrag", () => {
    if (grabbed) grabbed.el.classList.remove("is-grabbed");
    grabbed = null;
    stage.classList.remove("is-dragging");
  });

  // hover highlight: point-query the cast every tick (18 bodies — cheap)
  world.onTick(() => {
    let item = null;
    if (!grabbed) {
      const found = Query.point(
        cast.map((c) => c.body),
        mouse.position
      )[0];
      item = found ? byBody.get(found) : null;
    }
    if (item === hovered) return;
    if (hovered) hovered.el.classList.remove("is-hover");
    hovered = item;
    if (hovered) hovered.el.classList.add("is-hover");
  });

  return mc;
}

// toast — one at a time, self-dismissing
let toastTimer = 0;
export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
}

// nav pills are real buttons: a genuine click (not a fling) while the pill is
// at rest owns up to the joke
export function setupNavToasts(cast) {
  let down = null;
  for (const item of cast.filter((c) => c.kind === "pill")) {
    item.el.addEventListener("pointerdown", (e) => {
      down = { x: e.clientX, y: e.clientY };
    });
    item.el.addEventListener("click", (e) => {
      const keyboard = e.detail === 0;
      const moved = down
        ? Math.hypot(e.clientX - down.x, e.clientY - down.y)
        : 0;
      if ((keyboard || moved < 6) && item.body.speed < 1.2) {
        showToast("this nav has weight");
      }
    });
  }
}

// idle wobble: every ~8s some body gets a tiny off-center nudge
export function setupIdle(world, cast) {
  if (REDUCED_MOTION) return;
  function tick() {
    setTimeout(tick, 6500 + Math.random() * 3000);
    if (document.hidden) return;
    if (cast.some((c) => c.body.isStatic)) return; // mid-reassemble
    const item = cast[Math.floor(Math.random() * cast.length)];
    const away = world.engine.gravity.y >= 0 ? -1 : 1;
    Body.applyForce(
      item.body,
      {
        x: item.body.position.x + (Math.random() - 0.5) * item.w * 0.7,
        y: item.body.position.y,
      },
      {
        x: (Math.random() - 0.5) * 0.004 * item.body.mass,
        y: away * (0.002 + Math.random() * 0.004) * item.body.mass,
      }
    );
  }
  setTimeout(tick, 8000);
}

// gravity switch: down → float → up. Float keeps bodies adrift with tiny
// random impulses; up piles everything against the ceiling.
const GRAVITY_MODES = [
  { name: "down", y: 1, label: "↓ down" },
  { name: "float", y: 0, label: "≈ float" },
  { name: "up", y: -1, label: "↑ up" },
];

export function setupGravity(world, cast, startMode = 0) {
  const btn = document.getElementById("gravity-btn");
  const value = document.getElementById("gravity-value");
  let mode = startMode;
  let driftTimer = 0;

  function apply() {
    const m = GRAVITY_MODES[mode];
    world.engine.gravity.y = m.y;
    value.textContent = m.label;
    clearInterval(driftTimer);
    for (const item of cast) {
      // extra air drag in float mode so throws decay into a slow drift
      item.body.frictionAir =
        m.name === "float" ? 0.02 : item.bodyOpts.frictionAir;
    }
    if (m.name === "float" && !REDUCED_MOTION) {
      driftTimer = setInterval(() => {
        for (const item of cast) {
          if (Math.random() < 0.4) continue;
          Body.applyForce(item.body, item.body.position, {
            x: (Math.random() - 0.5) * 0.0009 * item.body.mass,
            y: (Math.random() - 0.5) * 0.0009 * item.body.mass,
          });
          Body.setAngularVelocity(
            item.body,
            item.body.angularVelocity + (Math.random() - 0.5) * 0.015
          );
        }
      }, 650);
    }
  }

  btn.addEventListener("click", () => {
    mode = (mode + 1) % GRAVITY_MODES.length;
    world.enableCeiling(); // flipping gravity closes the roof if the rain hadn't yet
    apply();
  });

  apply();
}

// reassemble: freeze every body, tween it home into the proper hero layout,
// hold the illusion of a normal landing page for 2s, then let it all collapse.
const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// shortest signed rotation back to upright
const unwind = (angle) => {
  const tau = Math.PI * 2;
  return ((angle % tau) + tau + Math.PI) % tau - Math.PI;
};

export function setupReassemble(world, cast, sync) {
  const btn = document.getElementById("reassemble-btn");
  const DUR = REDUCED_MOTION ? 0.001 : 950; // reduced motion: snap, don't glide
  const STAGGER = REDUCED_MOTION ? 0 : 45;
  const HOLD = 2000;

  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    btn.disabled = true;
    world.enableCeiling();

    const starts = cast.map((item, i) => ({
      item,
      x: item.body.position.x,
      y: item.body.position.y,
      a: unwind(item.body.angle),
      delay: i * STAGGER,
    }));
    for (const s of starts) {
      Body.setStatic(s.item.body, true);
      Body.setAngle(s.item.body, s.a);
    }

    const t0 = performance.now();
    function frame(now) {
      let done = true;
      for (const s of starts) {
        const t = Math.min(1, Math.max(0, (now - t0 - s.delay) / DUR));
        if (t < 1) done = false;
        const e = easeInOutCubic(t);
        const { home } = s.item;
        Body.setPosition(s.item.body, {
          x: s.x + (home.x - s.x) * e,
          y: s.y + (home.y - s.y) * e,
        });
        Body.setAngle(s.item.body, s.a * (1 - e));
      }
      sync.render();
      if (!done) {
        requestAnimationFrame(frame);
      } else {
        // the held moment of order — then physics gets it back
        setTimeout(() => {
          for (const s of starts) {
            Body.setStatic(s.item.body, false);
            Body.setVelocity(s.item.body, { x: 0, y: 0 });
            Body.setAngularVelocity(s.item.body, 0);
          }
          btn.disabled = false;
        }, HOLD);
      }
    }
    requestAnimationFrame(frame);
  });
}

// shake: a random impulse blast on every body plus a 200ms screen shake
export function setupShake(world, cast) {
  const btn = document.getElementById("shake-btn");

  btn.addEventListener("click", () => {
    world.enableCeiling();
    const upward = world.engine.gravity.y >= 0 ? -1 : 1;
    for (const item of cast) {
      Body.setVelocity(item.body, {
        x: item.body.velocity.x + (Math.random() - 0.5) * 24,
        y: item.body.velocity.y + upward * (4 + Math.random() * 13),
      });
      Body.setAngularVelocity(
        item.body,
        item.body.angularVelocity + (Math.random() - 0.5) * 0.4
      );
    }
    if (!REDUCED_MOTION) {
      document.body.classList.remove("is-shaking");
      void document.body.offsetWidth; // restart the animation on rapid re-clicks
      document.body.classList.add("is-shaking");
      setTimeout(() => document.body.classList.remove("is-shaking"), 230);
    }
  });
}
