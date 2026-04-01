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
      blur: 8 + (1 - progress) * 24,
      color: `rgba(255, 255, 255, ${0.18 + (1 - progress) * 0.3})`,
      x: Math.random() * viewport.width,
      y: Math.random() * viewport.height,
      vx: 0,
      vy: 0
    });
  }
}

function drawBackground() {
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.fillStyle = '#070b16';
  context.fillRect(0, 0, viewport.width, viewport.height);
}

function drawCircles() {
  for (const circle of circles) {
    context.beginPath();
    context.fillStyle = circle.color;
    context.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    context.fill();
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

function updateCircles(deltaTime) {
  const frameFactor = Math.min(deltaTime * 60, 1.6);

  for (let index = 0; index < circles.length; index += 1) {
    const circle = circles[index];
    const leader = index === 0 ? attractor : circles[index - 1];
    const forceX = (leader.x - circle.x) * circle.spring;
    const forceY = (leader.y - circle.y) * circle.spring;

    circle.vx = (circle.vx + (forceX / circle.mass) * frameFactor) * circle.damping;
    circle.vy = (circle.vy + (forceY / circle.mass) * frameFactor) * circle.damping;
    circle.x += circle.vx * frameFactor;
    circle.y += circle.vy * frameFactor;
  }
}

function render(timestamp = 0) {
  const deltaTime = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.033) : 1 / 60;
  lastFrameTime = timestamp;

  updateAttractor(deltaTime);
  updateCircles(deltaTime);
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
