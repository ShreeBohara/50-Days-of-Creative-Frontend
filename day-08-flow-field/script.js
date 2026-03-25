/* ═══════════════════════════════════════════════════
 *  Day 08 – Perlin Noise Flow Field
 *  Generative art: particles following a Perlin-noise
 *  vector field with persistent trail rendering.
 * ═══════════════════════════════════════════════════ */
'use strict';

/* ─── DOM Refs ──────────────────────────────────── */

const canvas = document.querySelector('[data-canvas]');
const ctx = canvas.getContext('2d');
const hero = document.querySelector('[data-hero]');

const noiseScaleSlider = document.querySelector('[data-noise-scale]');
const noiseScaleOutput = document.querySelector('[data-noise-scale-value]');
const noiseSpeedSlider = document.querySelector('[data-noise-speed]');
const noiseSpeedOutput = document.querySelector('[data-noise-speed-value]');
const particleCountSlider = document.querySelector('[data-particle-count]');
const particleCountOutput = document.querySelector('[data-particle-count-value]');
const paletteSelect = document.querySelector('[data-palette]');
const clearBtn = document.querySelector('[data-clear]');
const saveBtn = document.querySelector('[data-save]');

/* ─── Canvas Setup ──────────────────────────────── */

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();

/* ─── Perlin Noise (Improved, 3D) ───────────────── */

const PERM = new Uint8Array(512);
const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];

(function seedPermutation() {
  const p = Uint8Array.from({ length: 256 }, (_, i) => i);
  /* Fisher-Yates shuffle with a fixed seed for reproducibility */
  let s = 42;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }

function dot3(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }

function noise3D(x, y, z) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x), v = fade(y), w = fade(z);

  const A  = PERM[X]     + Y, AA = PERM[A] + Z, AB = PERM[A + 1] + Z;
  const B  = PERM[X + 1] + Y, BA = PERM[B] + Z, BB = PERM[B + 1] + Z;

  return lerp(
    lerp(
      lerp(dot3(GRAD3[PERM[AA] % 12], x, y, z),
           dot3(GRAD3[PERM[BA] % 12], x - 1, y, z), u),
      lerp(dot3(GRAD3[PERM[AB] % 12], x, y - 1, z),
           dot3(GRAD3[PERM[BB] % 12], x - 1, y - 1, z), u), v),
    lerp(
      lerp(dot3(GRAD3[PERM[AA + 1] % 12], x, y, z - 1),
           dot3(GRAD3[PERM[BA + 1] % 12], x - 1, y, z - 1), u),
      lerp(dot3(GRAD3[PERM[AB + 1] % 12], x, y - 1, z - 1),
           dot3(GRAD3[PERM[BB + 1] % 12], x - 1, y - 1, z - 1), u), v),
    w
  );
}

/* ─── Configuration ─────────────────────────────── */

const config = {
  noiseScale: 0.005,
  noiseSpeed: 0.0003,
  cellSize: 20,
  particleCount: 3000,
  particleSpeed: 2,
  trailAlpha: 0.03,
};

/* ─── Flow Field ────────────────────────────────── */

let cols, rows;
let flowField = [];

function initFlowField() {
  cols = Math.ceil(canvas.width / config.cellSize) + 1;
  rows = Math.ceil(canvas.height / config.cellSize) + 1;
  flowField = new Float32Array(cols * rows);
  updateFlowField(0);
}

function updateFlowField(time) {
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * config.noiseScale * config.cellSize;
      const y = row * config.noiseScale * config.cellSize;
      const n = noise3D(x, y, time * config.noiseSpeed);
      flowField[col + row * cols] = n * Math.PI * 2;
    }
  }
}

initFlowField();

/* ─── Color Palettes ────────────────────────────── */

const PALETTES = {
  ocean: [
    'rgba(0, 180, 216, 0.5)',
    'rgba(0, 119, 182, 0.5)',
    'rgba(144, 224, 239, 0.4)',
    'rgba(202, 240, 248, 0.35)',
    'rgba(3, 4, 94, 0.6)',
    'rgba(72, 202, 228, 0.45)',
  ],
  sunset: [
    'rgba(255, 107, 107, 0.5)',
    'rgba(255, 159, 28, 0.5)',
    'rgba(214, 40, 118, 0.5)',
    'rgba(255, 128, 8, 0.45)',
    'rgba(176, 42, 55, 0.55)',
    'rgba(255, 195, 113, 0.4)',
  ],
  neon: [
    'rgba(255, 0, 110, 0.5)',
    'rgba(0, 245, 212, 0.5)',
    'rgba(184, 255, 0, 0.45)',
    'rgba(148, 0, 255, 0.5)',
    'rgba(255, 230, 0, 0.45)',
    'rgba(0, 180, 255, 0.45)',
  ],
  monochrome: [
    'rgba(255, 255, 255, 0.5)',
    'rgba(200, 200, 210, 0.45)',
    'rgba(160, 160, 175, 0.4)',
    'rgba(120, 120, 140, 0.35)',
    'rgba(230, 230, 240, 0.5)',
    'rgba(180, 180, 195, 0.4)',
  ],
};

let currentPalette = 'ocean';

function randomColor() {
  const pal = PALETTES[currentPalette];
  return pal[Math.floor(Math.random() * pal.length)];
}

function recolorParticles() {
  for (const p of particles) p.color = randomColor();
}

/* ─── Particle System ───────────────────────────── */

let particles = [];

function createParticle(x, y) {
  const p = {
    x: x ?? Math.random() * canvas.width,
    y: y ?? Math.random() * canvas.height,
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    speed: 1 + Math.random() * config.particleSpeed,
    color: randomColor(),
    life: 0,
    maxLife: 200 + Math.random() * 300,
  };
  p.prevX = p.x;
  p.prevY = p.y;
  return p;
}

function initParticles(count) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(createParticle());
  }
}

function respawnParticle(p) {
  p.x = Math.random() * canvas.width;
  p.y = Math.random() * canvas.height;
  p.prevX = p.x;
  p.prevY = p.y;
  p.vx = 0;
  p.vy = 0;
  p.life = 0;
  p.maxLife = 200 + Math.random() * 300;
}

function updateParticle(p) {
  p.prevX = p.x;
  p.prevY = p.y;

  const col = Math.floor(p.x / config.cellSize);
  const row = Math.floor(p.y / config.cellSize);

  if (col < 0 || col >= cols || row < 0 || row >= rows) {
    respawnParticle(p);
    return;
  }

  const angle = flowField[col + row * cols];
  p.vx += Math.cos(angle) * 0.5;
  p.vy += Math.sin(angle) * 0.5;

  p.x += p.vx * p.speed;
  p.y += p.vy * p.speed;

  p.vx *= 0.98;
  p.vy *= 0.98;

  p.life++;

  if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height || p.life > p.maxLife) {
    respawnParticle(p);
  }
}

/* ─── Animation Loop ────────────────────────────── */

let animTime = 0;

function animate() {
  animTime++;
  updateFlowField(animTime);

  /* Fade existing trails */
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(5, 5, 16, ${config.trailAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* Draw particles with additive blending for glow */
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.8;

  for (const p of particles) {
    updateParticle(p);
    ctx.beginPath();
    ctx.moveTo(p.prevX, p.prevY);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = p.color;
    ctx.stroke();
  }

  requestAnimationFrame(animate);
}

/* ─── Interactions ──────────────────────────────── */

let heroVisible = true;

function hideHero() {
  if (!heroVisible) return;
  heroVisible = false;
  hero.classList.add('hidden');
}

/* Click to burst particles */
canvas.addEventListener('click', (e) => {
  hideHero();
  const burstCount = 200;
  for (let i = 0; i < burstCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 50;
    const p = createParticle(
      e.clientX + Math.cos(angle) * radius,
      e.clientY + Math.sin(angle) * radius
    );
    p.vx = Math.cos(angle) * (1 + Math.random() * 2);
    p.vy = Math.sin(angle) * (1 + Math.random() * 2);
    particles.push(p);
  }
  /* Trim excess particles */
  if (particles.length > config.particleCount + 500) {
    particles.splice(0, particles.length - config.particleCount);
  }
});

/* Noise scale slider */
noiseScaleSlider.addEventListener('input', () => {
  config.noiseScale = 0.001 + (noiseScaleSlider.value / 100) * 0.009;
  noiseScaleOutput.textContent = config.noiseScale.toFixed(4);
});

/* Noise speed slider */
noiseSpeedSlider.addEventListener('input', () => {
  config.noiseSpeed = (noiseSpeedSlider.value / 100) * 0.001;
  noiseSpeedOutput.textContent = config.noiseSpeed.toFixed(4);
});

/* Particle count slider */
particleCountSlider.addEventListener('input', () => {
  const target = parseInt(particleCountSlider.value, 10);
  config.particleCount = target;
  particleCountOutput.textContent = target;
  if (particles.length < target) {
    while (particles.length < target) particles.push(createParticle());
  } else if (particles.length > target) {
    particles.length = target;
  }
});

/* Palette dropdown */
paletteSelect.addEventListener('change', () => {
  currentPalette = paletteSelect.value;
  recolorParticles();
});

/* Clear button */
clearBtn.addEventListener('click', () => {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgb(5, 5, 16)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  initParticles(config.particleCount);
});

/* Save as PNG */
saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'flow-field.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

/* ─── Resize Handling ───────────────────────────── */

window.addEventListener('resize', () => {
  resizeCanvas();
  initFlowField();

  for (const p of particles) {
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      p.x = Math.random() * canvas.width;
      p.y = Math.random() * canvas.height;
      p.prevX = p.x;
      p.prevY = p.y;
      p.vx = 0;
      p.vy = 0;
    }
  }

  ctx.fillStyle = 'rgb(5, 5, 16)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

/* ─── Init ──────────────────────────────────────── */

ctx.fillStyle = 'rgb(5, 5, 16)';
ctx.fillRect(0, 0, canvas.width, canvas.height);
initParticles(config.particleCount);
animate();
