/* Day 18 — Gravitational N-Body Simulation */

(() => {
  "use strict";

  const canvas = document.getElementById("gravity-canvas");
  const ctx = canvas.getContext("2d");

  const bodyCountNode = document.getElementById("body-count");
  const totalMassNode = document.getElementById("total-mass");

  const state = {
    width: 0,
    height: 0,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    bodies: [],
    stars: [],
    centerX: 0,
    centerY: 0,
    lastTime: performance.now(),
    timeScale: 1,
    spawn: {
      active: false,
      pointerId: null,
      x: 0,
      y: 0,
      startedAt: 0,
    },
  };

  const PHYSICS = {
    gravity: 3200,
    softening: 18,
  };

  class Body {
    constructor({ x, y, vx = 0, vy = 0, mass = 24 }) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.mass = mass;
      this.ax = 0;
      this.ay = 0;
      this.trail = [];
      this.syncVisuals();
    }

    syncVisuals() {
      this.radius = 2.8 + Math.cbrt(this.mass) * 1.22;
      this.color = getBodyColor(this.mass);
      this.glow = Math.max(14, this.radius * 3.5);
    }

    draw(context) {
      context.save();
      context.shadowColor = this.color;
      context.shadowBlur = this.glow;
      context.fillStyle = this.color;
      context.beginPath();
      context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      context.fill();

      context.shadowBlur = 0;
      context.fillStyle = "rgba(255, 255, 255, 0.82)";
      context.beginPath();
      context.arc(
        this.x - this.radius * 0.28,
        this.y - this.radius * 0.32,
        Math.max(1.25, this.radius * 0.2),
        0,
        Math.PI * 2
      );
      context.fill();
      context.restore();
    }
  }

  function getBodyColor(mass) {
    if (mass < 40) return "#7ed8ff";
    if (mass < 180) return "#ffe082";
    if (mass < 700) return "#ffb56b";
    return "#ff7a6b";
  }

  function createStarterBodies() {
    const starMass = 2400;
    const innerMass = 24;
    const outerMass = 38;
    const innerRadius = 210;
    const outerRadius = 340;

    const innerVelocity = Math.sqrt((PHYSICS.gravity * starMass) / innerRadius);
    const outerVelocity = Math.sqrt((PHYSICS.gravity * starMass) / outerRadius);
    const starVelocityY = -((innerMass * innerVelocity) + (outerMass * -outerVelocity)) / starMass;

    return [
      new Body({
        x: state.centerX,
        y: state.centerY,
        vy: starVelocityY,
        mass: starMass,
      }),
      new Body({
        x: state.centerX + innerRadius,
        y: state.centerY,
        vy: innerVelocity,
        mass: innerMass,
      }),
      new Body({
        x: state.centerX - outerRadius,
        y: state.centerY,
        vy: -outerVelocity,
        mass: outerMass,
      }),
    ];
  }

  function buildStars() {
    const count = Math.max(120, Math.floor((state.width * state.height) / 9500));
    return Array.from({ length: count }, () => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      radius: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.5 + 0.15,
      pulse: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.8 + 0.2,
    }));
  }

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.centerX = state.width * 0.5;
    state.centerY = state.height * 0.54;

    canvas.width = state.width * state.dpr;
    canvas.height = state.height * state.dpr;
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    state.stars = buildStars();

    if (!state.bodies.length) {
      state.bodies = createStarterBodies();
    }
  }

  function drawBackground(time) {
    const background = ctx.createLinearGradient(0, 0, state.width, state.height);
    background.addColorStop(0, "#030612");
    background.addColorStop(0.55, "#08111f");
    background.addColorStop(1, "#050816");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, state.width, state.height);

    const nebula = ctx.createRadialGradient(
      state.width * 0.24,
      state.height * 0.22,
      20,
      state.width * 0.24,
      state.height * 0.22,
      state.width * 0.5
    );
    nebula.addColorStop(0, "rgba(74, 190, 255, 0.12)");
    nebula.addColorStop(0.45, "rgba(117, 103, 255, 0.08)");
    nebula.addColorStop(1, "rgba(2, 5, 18, 0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, state.width, state.height);

    for (const star of state.stars) {
      const alpha = star.alpha + Math.sin(time * 0.0005 * star.speed + star.pulse) * 0.15;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.05, alpha)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBodies() {
    for (const body of state.bodies) {
      body.draw(ctx);
    }
  }

  function getHeldMass() {
    if (!state.spawn.active) return 0;
    const heldSeconds = Math.min((performance.now() - state.spawn.startedAt) / 1000, 3.4);
    return 14 + (Math.pow(heldSeconds, 1.65) * 260);
  }

  function drawSpawnIndicator(time) {
    if (!state.spawn.active) return;

    const mass = getHeldMass();
    const radius = 2.8 + Math.cbrt(mass) * 1.22;
    const pulse = 1 + (Math.sin(time * 0.008) * 0.06);

    ctx.save();
    ctx.translate(state.spawn.x, state.spawn.y);

    const ring = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 3.2);
    ring.addColorStop(0, "rgba(126, 216, 255, 0.18)");
    ring.addColorStop(1, "rgba(126, 216, 255, 0)");
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(126, 216, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.9 * pulse, -Math.PI / 2, Math.PI * 1.35);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = getBodyColor(mass);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.font = '500 11px "Azeret Mono", monospace';
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(mass)}`, 0, -(radius * 2.7));
    ctx.restore();
  }

  function computeAccelerations(bodies) {
    for (const body of bodies) {
      body.ax = 0;
      body.ay = 0;
    }

    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSq = (dx * dx) + (dy * dy) + (PHYSICS.softening * PHYSICS.softening);
        const distance = Math.sqrt(distanceSq);
        const forceScale = PHYSICS.gravity / (distanceSq * distance);
        const ax = dx * forceScale * b.mass;
        const ay = dy * forceScale * b.mass;
        const bx = dx * forceScale * a.mass;
        const by = dy * forceScale * a.mass;

        a.ax += ax;
        a.ay += ay;
        b.ax -= bx;
        b.ay -= by;
      }
    }
  }

  function velocityVerletStep(dt) {
    computeAccelerations(state.bodies);

    const previousAcceleration = state.bodies.map((body) => ({
      ax: body.ax,
      ay: body.ay,
    }));

    for (let i = 0; i < state.bodies.length; i += 1) {
      const body = state.bodies[i];
      const prev = previousAcceleration[i];
      body.x += (body.vx * dt) + (0.5 * prev.ax * dt * dt);
      body.y += (body.vy * dt) + (0.5 * prev.ay * dt * dt);
    }

    computeAccelerations(state.bodies);

    for (let i = 0; i < state.bodies.length; i += 1) {
      const body = state.bodies[i];
      const prev = previousAcceleration[i];
      body.vx += 0.5 * (prev.ax + body.ax) * dt;
      body.vy += 0.5 * (prev.ay + body.ay) * dt;
    }
  }

  function stepSimulation(dt) {
    if (state.bodies.length < 2) return;

    const substeps = Math.max(1, Math.ceil(dt / 0.012));
    const stepDt = dt / substeps;

    for (let i = 0; i < substeps; i += 1) {
      velocityVerletStep(stepDt);
      handleCollisions();
    }
  }

  function handleCollisions() {
    let hasMerged = true;

    while (hasMerged) {
      hasMerged = false;

      for (let i = 0; i < state.bodies.length; i += 1) {
        const a = state.bodies[i];

        for (let j = i + 1; j < state.bodies.length; j += 1) {
          const b = state.bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.hypot(dx, dy);

          if (distance > a.radius + b.radius) continue;

          const mergedMass = a.mass + b.mass;
          const mergedBody = new Body({
            x: ((a.x * a.mass) + (b.x * b.mass)) / mergedMass,
            y: ((a.y * a.mass) + (b.y * b.mass)) / mergedMass,
            vx: ((a.vx * a.mass) + (b.vx * b.mass)) / mergedMass,
            vy: ((a.vy * a.mass) + (b.vy * b.mass)) / mergedMass,
            mass: mergedMass,
          });

          state.bodies.splice(j, 1);
          state.bodies.splice(i, 1, mergedBody);
          hasMerged = true;
          break;
        }

        if (hasMerged) break;
      }
    }
  }

  function updateHud() {
    bodyCountNode.textContent = `Bodies: ${state.bodies.length}`;
    const totalMass = state.bodies.reduce((sum, body) => sum + body.mass, 0);
    totalMassNode.textContent = `Mass: ${Math.round(totalMass)}`;
  }

  function frame(time) {
    const delta = time - state.lastTime;
    state.lastTime = time;
    const simDt = Math.min(delta, 32) / 1000 * state.timeScale;

    if (simDt > 0) {
      stepSimulation(simDt);
    }

    drawBackground(time);
    drawBodies();
    drawSpawnIndicator(time);
    updateHud();

    if (delta >= 0) {
      requestAnimationFrame(frame);
    }
  }

  resize();
  updateHud();
  requestAnimationFrame(frame);

  window.addEventListener("resize", resize);

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    state.spawn.active = true;
    state.spawn.pointerId = event.pointerId;
    state.spawn.x = event.clientX;
    state.spawn.y = event.clientY;
    state.spawn.startedAt = performance.now();
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.spawn.active || event.pointerId !== state.spawn.pointerId) return;
    state.spawn.x = event.clientX;
    state.spawn.y = event.clientY;
  });

  function releaseSpawn(event) {
    if (!state.spawn.active || event.pointerId !== state.spawn.pointerId) return;

    const mass = getHeldMass();
    state.bodies.push(
      new Body({
        x: state.spawn.x,
        y: state.spawn.y,
        mass,
      })
    );

    state.spawn.active = false;
    state.spawn.pointerId = null;
  }

  canvas.addEventListener("pointerup", releaseSpawn);
  canvas.addEventListener("pointercancel", releaseSpawn);
})();
