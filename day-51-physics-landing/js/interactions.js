// interactions.js — everything the visitor can do to the world.

const { Mouse, MouseConstraint, Composite, Events, Query } = window.Matter;

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
