// engine.js — Matter.js world, static walls that track the viewport, fixed-step runner.

const { Engine, Runner, Bodies, Composite, Events } = window.Matter;

// Walls are very thick so flung bodies can't tunnel through them between steps.
const WALL = 260;

export function createWorld() {
  const engine = Engine.create({
    positionIterations: 8,
    velocityIterations: 6,
  });
  engine.gravity.y = 1;

  let walls = [];
  let ceilingEnabled = false;
  const resizeListeners = [];

  const viewport = () => ({
    w: window.innerWidth,
    h: window.innerHeight,
  });

  function buildWalls() {
    const { w, h } = viewport();
    for (const wall of walls) Composite.remove(engine.world, wall);
    walls = [
      // floor, flush with the bottom edge
      Bodies.rectangle(w / 2, h + WALL / 2, w + WALL * 4, WALL, { isStatic: true }),
      // side walls, extended far upward so the entrance rain can't slip out
      Bodies.rectangle(-WALL / 2, h / 2 - h * 2, WALL, h * 6, { isStatic: true }),
      Bodies.rectangle(w + WALL / 2, h / 2 - h * 2, WALL, h * 6, { isStatic: true }),
    ];
    if (ceilingEnabled) {
      walls.push(
        Bodies.rectangle(w / 2, -WALL / 2, w + WALL * 4, WALL, { isStatic: true })
      );
    }
    Composite.add(engine.world, walls);
  }

  // The ceiling only exists once the entrance rain has finished falling in —
  // it is what lets "gravity up" pile everything against the top of the screen.
  function enableCeiling() {
    if (ceilingEnabled) return;
    ceilingEnabled = true;
    buildWalls();
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildWalls();
      for (const fn of resizeListeners) fn(viewport());
    }, 150);
  });

  buildWalls();

  const runner = Runner.create();
  Runner.run(runner, engine);

  return {
    engine,
    world: engine.world,
    viewport,
    enableCeiling,
    onResize: (fn) => resizeListeners.push(fn),
    onTick: (fn) => Events.on(engine, "afterUpdate", fn),
  };
}
