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
}

function createCircles() {
  circles.length = 0;

  const centerX = viewport.width * 0.5;
  const centerY = viewport.height * 0.5;

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
      x: centerX + Math.cos(angle) * spread,
      y: centerY + Math.sin(angle) * spread,
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

function render() {
  drawBackground();
  drawCircles();
  requestAnimationFrame(render);
}

window.addEventListener('resize', resizeCanvas);
trailToggle.checked = false;
resizeCanvas();
createCircles();
render();
