// interactions.js — everything the visitor can do to the world.

const { Mouse, MouseConstraint, Composite, Events, Query, Body } = window.Matter;

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

// gravity switch: down → float → up. Float keeps bodies adrift with tiny
// random impulses; up piles everything against the ceiling.
const GRAVITY_MODES = [
  { name: "down", y: 1, label: "↓ down" },
  { name: "float", y: 0, label: "≈ float" },
  { name: "up", y: -1, label: "↑ up" },
];

export function setupGravity(world, cast) {
  const btn = document.getElementById("gravity-btn");
  const value = document.getElementById("gravity-value");
  let mode = 0;
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
    if (m.name === "float") {
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
