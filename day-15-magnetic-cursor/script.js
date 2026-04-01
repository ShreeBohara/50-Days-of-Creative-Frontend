'use strict';

const canvas = document.querySelector('[data-scene]');
const trailToggle = document.querySelector('[data-trail-toggle]');
const context = canvas.getContext('2d');

const viewport = {
  width: 0,
  height: 0,
  dpr: 1
};

const circles = [];
const circleCount = 25;
const attractor = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0
};
const pointer = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  lastX: 0,
  lastY: 0,
  lastTime: 0,
  lastMoveTime: 0,
  active: false,
  down: false,
  hasInteracted: false,
  idle: true
};

let lastFrameTime = 0;
let pendingClickTimer = 0;
let scatterUntil = 0;

function hexToRgba(hex, alpha = 1) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(channel => channel + channel).join('')
    : normalized;

  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function resizeCanvas() {
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
  viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(viewport.width * viewport.dpr);
  canvas.height = Math.round(viewport.height * viewport.dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  context.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
  context.clearRect(0, 0, viewport.width, viewport.height);

  attractor.x = viewport.width * 0.5;
  attractor.y = viewport.height * 0.5;
  pointer.x = attractor.x;
  pointer.y = attractor.y;
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
}

function createCircles() {
  circles.length = 0;
  const palette = ['#9FE8FF', '#FF9EEC', '#FFD58F', '#A7FFBF', '#9AA9FF', '#7FD8FF'];

  for (let index = 0; index < circleCount; index += 1) {
    const progress = index / Math.max(circleCount - 1, 1);
    const radius = 6 + (1 - progress) * 30;
    const spread = 14 + index * 8;
    const angle = index * 0.62;

    circles.push({
      index,
      radius,
      mass: 0.9 + progress * 2.4,
      spring: 0.02 + (1 - progress) * 0.08,
      damping: 0.8 + progress * 0.15,
      alpha: 0.15 + (1 - progress) * 0.7,
      phase: Math.random() * Math.PI * 2,
      blur: 14 + (1 - progress) * 30,
      colorHex: palette[index % palette.length],
      x: Math.random() * viewport.width,
      y: Math.random() * viewport.height,
      scatterX: viewport.width * 0.5,
      scatterY: viewport.height * 0.5,
      vx: 0,
      vy: 0
    });
  }
}

function drawBackground() {
  context.clearRect(0, 0, viewport.width, viewport.height);
  const wash = context.createLinearGradient(0, 0, viewport.width, viewport.height);
  wash.addColorStop(0, '#050816');
  wash.addColorStop(0.55, '#0A132A');
  wash.addColorStop(1, '#091A36');
  context.fillStyle = wash;
  context.fillRect(0, 0, viewport.width, viewport.height);

  const warmBloom = context.createRadialGradient(
    viewport.width * 0.18,
    viewport.height * 0.22,
    0,
    viewport.width * 0.18,
    viewport.height * 0.22,
    viewport.width * 0.38
  );
  warmBloom.addColorStop(0, 'rgba(159, 232, 255, 0.18)');
  warmBloom.addColorStop(1, 'rgba(159, 232, 255, 0)');
  context.fillStyle = warmBloom;
  context.fillRect(0, 0, viewport.width, viewport.height);

  const coolBloom = context.createRadialGradient(
    viewport.width * 0.78,
    viewport.height * 0.18,
    0,
    viewport.width * 0.78,
    viewport.height * 0.18,
    viewport.width * 0.3
  );
  coolBloom.addColorStop(0, 'rgba(255, 158, 236, 0.18)');
  coolBloom.addColorStop(1, 'rgba(255, 158, 236, 0)');
  context.fillStyle = coolBloom;
  context.fillRect(0, 0, viewport.width, viewport.height);
}

function drawCircles() {
  for (const circle of circles) {
    const fill = context.createRadialGradient(
      circle.x - circle.radius * 0.35,
      circle.y - circle.radius * 0.35,
      circle.radius * 0.15,
      circle.x,
      circle.y,
      circle.radius
    );
    fill.addColorStop(0, hexToRgba(circle.colorHex, Math.min(circle.alpha + 0.18, 0.95)));
    fill.addColorStop(1, hexToRgba(circle.colorHex, 0.16));

    context.save();
    context.globalCompositeOperation = 'lighter';
    context.shadowBlur = circle.blur;
    context.shadowColor = hexToRgba(circle.colorHex, 0.75);
    context.fillStyle = fill;
    context.beginPath();
    context.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function updatePointerState(event) {
  const time = performance.now();
  const x = event.clientX;
  const y = event.clientY;
  const elapsed = Math.max(time - pointer.lastTime, 16);

  pointer.vx = (x - pointer.lastX) / elapsed;
  pointer.vy = (y - pointer.lastY) / elapsed;
  pointer.x = x;
  pointer.y = y;
  pointer.lastX = x;
  pointer.lastY = y;
  pointer.lastTime = time;
  pointer.lastMoveTime = time;
  pointer.active = true;
  pointer.hasInteracted = true;
  pointer.idle = false;
}

function updateAttractor(deltaTime) {
  const centerX = viewport.width * 0.5;
  const centerY = viewport.height * 0.5;
  const targetX = pointer.active ? pointer.x : centerX;
  const targetY = pointer.active ? pointer.y : centerY;
  const easing = Math.min(deltaTime * 12, 1);

  attractor.vx += (targetX - attractor.x) * 0.18 * easing;
  attractor.vy += (targetY - attractor.y) * 0.18 * easing;
  attractor.vx *= 0.76;
  attractor.vy *= 0.76;
  attractor.x += attractor.vx;
  attractor.y += attractor.vy;

  pointer.idle = performance.now() - pointer.lastMoveTime > 140;
}

function explodeFrom(x, y, strength = 1) {
  for (const circle of circles) {
    const dx = circle.x - x;
    const dy = circle.y - y;
    const distance = Math.hypot(dx, dy) || 1;
    const falloff = Math.max(0.35, 1 - Math.min(distance / 340, 0.78));
    const impulse = (14 + circle.radius * 0.55) * strength * falloff;

    circle.vx += (dx / distance) * impulse;
    circle.vy += (dy / distance) * impulse;
  }
}

function assignScatterTargets() {
  for (const circle of circles) {
    const edge = Math.floor(Math.random() * 4);
    const margin = 40 + circle.radius;

    if (edge === 0) {
      circle.scatterX = -margin;
      circle.scatterY = Math.random() * viewport.height;
    } else if (edge === 1) {
      circle.scatterX = viewport.width + margin;
      circle.scatterY = Math.random() * viewport.height;
    } else if (edge === 2) {
      circle.scatterX = Math.random() * viewport.width;
      circle.scatterY = -margin;
    } else {
      circle.scatterX = Math.random() * viewport.width;
      circle.scatterY = viewport.height + margin;
    }
  }
}

function updateCircles(deltaTime, time) {
  const frameFactor = Math.min(deltaTime * 60, 1.6);
  const scattering = performance.now() < scatterUntil;
  const shouldOrbit = pointer.idle || !pointer.hasInteracted || !pointer.active;

  for (let index = 0; index < circles.length; index += 1) {
    const circle = circles[index];
    const leader = index === 0 ? attractor : circles[index - 1];
    const orbitRadius = shouldOrbit ? 4 + index * 0.9 : 0;
    const orbitSpeed = 0.75 + (circle.spring * 12);
    const orbitAngle = time * orbitSpeed + circle.phase;
    const leaderX = scattering ? circle.scatterX : leader.x;
    const leaderY = scattering ? circle.scatterY : leader.y;
    const targetX = leaderX + Math.cos(orbitAngle) * orbitRadius;
    const targetY = leaderY + Math.sin(orbitAngle * 1.2) * orbitRadius * 0.65;
    const forceX = (targetX - circle.x) * circle.spring;
    const forceY = (targetY - circle.y) * circle.spring;

    circle.vx = (circle.vx + (forceX / circle.mass) * frameFactor) * circle.damping;
    circle.vy = (circle.vy + (forceY / circle.mass) * frameFactor) * circle.damping;
    circle.x += circle.vx * frameFactor;
    circle.y += circle.vy * frameFactor;
  }
}

function render(timestamp = 0) {
  const deltaTime = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.033) : 1 / 60;
  lastFrameTime = timestamp;
  const time = timestamp * 0.001;

  updateAttractor(deltaTime);
  updateCircles(deltaTime, time);
  drawBackground();
  drawCircles();
  requestAnimationFrame(render);
}

window.addEventListener('pointermove', updatePointerState);
window.addEventListener('pointerdown', event => {
  pointer.down = true;
  updatePointerState(event);
});
window.addEventListener('pointerup', () => {
  pointer.down = false;
});
window.addEventListener('click', event => {
  window.clearTimeout(pendingClickTimer);
  pendingClickTimer = window.setTimeout(() => {
    explodeFrom(event.clientX, event.clientY, 1);
  }, 220);
});
window.addEventListener('dblclick', event => {
  window.clearTimeout(pendingClickTimer);
  assignScatterTargets();
  scatterUntil = performance.now() + 1200;
  explodeFrom(event.clientX, event.clientY, 1.45);
});
window.addEventListener('pointerleave', () => {
  pointer.active = false;
  pointer.down = false;
});
window.addEventListener('blur', () => {
  pointer.active = false;
  pointer.down = false;
});

window.addEventListener('resize', resizeCanvas);
trailToggle.checked = false;
resizeCanvas();
createCircles();
render();
