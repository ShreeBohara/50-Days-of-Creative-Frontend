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
    const G = 3200;
    const starMass = 2400;
    const innerMass = 24;
    const outerMass = 38;
    const innerRadius = 210;
    const outerRadius = 340;

    const innerVelocity = Math.sqrt((G * starMass) / innerRadius);
    const outerVelocity = Math.sqrt((G * starMass) / outerRadius);
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

  function updateHud() {
    bodyCountNode.textContent = `Bodies: ${state.bodies.length}`;
    const totalMass = state.bodies.reduce((sum, body) => sum + body.mass, 0);
    totalMassNode.textContent = `Mass: ${Math.round(totalMass)}`;
  }

  function frame(time) {
    const delta = time - state.lastTime;
    state.lastTime = time;

    drawBackground(time);
    drawBodies();
    updateHud();

    if (delta >= 0) {
      requestAnimationFrame(frame);
    }
  }

  resize();
  updateHud();
  requestAnimationFrame(frame);

  window.addEventListener("resize", resize);
})();
