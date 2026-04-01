'use strict';

const canvas = document.querySelector('[data-scene]');
const trailToggle = document.querySelector('[data-trail-toggle]');
const context = canvas.getContext('2d');

const viewport = {
  width: 0,
  height: 0,
  dpr: 1
};

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

window.addEventListener('resize', resizeCanvas);
trailToggle.checked = false;
resizeCanvas();
