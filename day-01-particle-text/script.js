const DEFAULT_WORD = "CREATE";
const MAX_WORD_LENGTH = 18;

const canvas = document.querySelector("[data-particle-canvas]");
const form = document.querySelector("[data-word-form]");
const input = document.querySelector("[data-word-input]");

const context = canvas?.getContext("2d");
const offscreenCanvas = document.createElement("canvas");
const offscreenContext = offscreenCanvas.getContext("2d", { willReadFrequently: true });

const config = {
  alphaThreshold: 120,
  driftStrength: 1.35,
  fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
  fontWeight: 700,
  maxParticles: 4800,
  maxFontSize: 340,
  minFontSize: 120,
  inactiveAlpha: 0.02,
  particleEase: 0.045,
  particleFadeEase: 0.12,
  particleSizeMax: 2.8,
  particleSizeMin: 1.1,
  particleVelocityDamping: 0.84,
  repulsionForce: 1.8,
  repulsionRadius: 110,
};

const state = {
  animationFrame: 0,
  particles: [],
  targets: [],
  time: 0,
  word: DEFAULT_WORD,
  lastValidWord: DEFAULT_WORD,
  viewport: {
    width: 0,
    height: 0,
    dpr: 1,
  },
  pointer: {
    active: false,
    x: Number.POSITIVE_INFINITY,
    y: Number.POSITIVE_INFINITY,
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function mixColorChannel(start, end, factor) {
  return Math.round(start + (end - start) * factor);
}

function getParticleColor(y, alpha) {
  const normalizedY = clamp(y / state.viewport.height, 0, 1);
  const startColor = { r: 124, g: 246, b: 255 };
  const endColor = { r: 255, g: 94, b: 219 };
  const r = mixColorChannel(startColor.r, endColor.r, normalizedY);
  const g = mixColorChannel(startColor.g, endColor.g, normalizedY);
  const b = mixColorChannel(startColor.b, endColor.b, normalizedY);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeWord(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_WORD_LENGTH).toUpperCase();
}

class Particle {
  constructor() {
    const { width, height } = state.viewport;

    this.x = randomBetween(0, width);
    this.y = randomBetween(0, height);
    this.vx = randomBetween(-1, 1);
    this.vy = randomBetween(-1, 1);
    this.targetX = this.x;
    this.targetY = this.y;
    this.size = randomBetween(config.particleSizeMin, config.particleSizeMax);
    this.alpha = config.inactiveAlpha;
    this.driftOffset = randomBetween(0, Math.PI * 2);
    this.driftSpeed = randomBetween(0.8, 1.6);
    this.targetAlpha = config.inactiveAlpha;
  }

  retarget(target) {
    this.targetX = target.x;
    this.targetY = target.y;
    this.targetAlpha = 0.94;
  }

  release(index) {
    const { width, height } = state.viewport;
    const angle = index * 0.23;
    const radius = 20 + (index % 32) * 2.4;

    this.targetX = width * 0.5 + Math.cos(angle) * radius;
    this.targetY = height * 0.5 + Math.sin(angle) * radius;
    this.targetAlpha = config.inactiveAlpha;
  }

  update() {
    const driftX = Math.cos(state.time * this.driftSpeed + this.driftOffset) * config.driftStrength;
    const driftY =
      Math.sin(state.time * (this.driftSpeed * 1.1) + this.driftOffset) * config.driftStrength;

    if (state.pointer.active) {
      const dx = this.x - state.pointer.x;
      const dy = this.y - state.pointer.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 0 && distance < config.repulsionRadius) {
        const strength = (1 - distance / config.repulsionRadius) * config.repulsionForce;
        this.vx += (dx / distance) * strength;
        this.vy += (dy / distance) * strength;
      }
    }

    const deltaX = this.targetX + driftX - this.x;
    const deltaY = this.targetY + driftY - this.y;

    this.vx += deltaX * config.particleEase;
    this.vy += deltaY * config.particleEase;
    this.vx *= config.particleVelocityDamping;
    this.vy *= config.particleVelocityDamping;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha += (this.targetAlpha - this.alpha) * config.particleFadeEase;
  }

  draw() {
    context.beginPath();
    context.fillStyle = getParticleColor(this.y, this.alpha);
    context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    context.fill();
  }
}

function setCanvasSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  state.viewport.width = width;
  state.viewport.height = height;
  state.viewport.dpr = dpr;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
}

function getBaseFontSize(word) {
  const { width, height } = state.viewport;
  const lengthFactor = clamp(word.length, 3, 10);
  const sizeFromHeight = height * 0.34;
  const sizeFromWidth = width / (lengthFactor * 0.52);

  return clamp(Math.min(sizeFromHeight, sizeFromWidth), config.minFontSize, config.maxFontSize);
}

function fitFontSizeToViewport(word) {
  const { width, height } = state.viewport;
  const maxWidth = width * 0.82;
  const maxHeight = height * 0.4;
  let fontSize = getBaseFontSize(word);

  offscreenContext.textAlign = "center";
  offscreenContext.textBaseline = "middle";

  while (fontSize > config.minFontSize) {
    offscreenContext.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;
    const metrics = offscreenContext.measureText(word);
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    if (metrics.width <= maxWidth && textHeight <= maxHeight) {
      break;
    }

    fontSize -= 6;
  }

  return fontSize;
}

function getSampleGap(fontSize) {
  return clamp(Math.round(fontSize / 34), 4, 8);
}

function drawTextToOffscreen(word) {
  const { width, height } = state.viewport;
  const fontSize = fitFontSizeToViewport(word);

  offscreenContext.clearRect(0, 0, width, height);
  offscreenContext.fillStyle = "#ffffff";
  offscreenContext.textAlign = "center";
  offscreenContext.textBaseline = "middle";
  offscreenContext.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;
  offscreenContext.fillText(word, width / 2, height / 2);

  return { fontSize, width, height };
}

function limitTargets(targets) {
  if (targets.length <= config.maxParticles) {
    return targets;
  }

  const limited = [];
  const stride = targets.length / config.maxParticles;

  for (let index = 0; index < config.maxParticles; index += 1) {
    limited.push(targets[Math.floor(index * stride)]);
  }

  return limited;
}

// Sample visible text pixels from an offscreen canvas to produce particle targets.
function sampleTextTargets(word) {
  const { width, height, fontSize } = drawTextToOffscreen(word);
  const gap = getSampleGap(fontSize);
  const imageData = offscreenContext.getImageData(0, 0, width, height).data;
  const targets = [];

  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const alpha = imageData[(y * width + x) * 4 + 3];

      if (alpha > config.alphaThreshold) {
        targets.push({
          x: x + gap * 0.5,
          y: y + gap * 0.5,
        });
      }
    }
  }

  return limitTargets(targets);
}

function ensureParticlePool() {
  while (state.particles.length < config.maxParticles) {
    state.particles.push(new Particle());
  }
}

function assignParticleTargets(targets) {
  ensureParticlePool();

  state.particles.forEach((particle, index) => {
    const target = targets[index];

    if (target) {
      particle.retarget(target);
      return;
    }

    particle.release(index);
  });
}

function setWord(nextWord) {
  const normalizedWord = normalizeWord(nextWord);

  if (!normalizedWord) {
    return false;
  }

  state.word = normalizedWord;
  state.lastValidWord = normalizedWord;
  state.targets = sampleTextTargets(normalizedWord);
  assignParticleTargets(state.targets);
  input.value = normalizedWord;
  return true;
}

function handleInput(event) {
  const nextWord = normalizeWord(event.target.value);

  if (!nextWord) {
    return;
  }

  if (nextWord !== state.word) {
    setWord(nextWord);
  }
}

function restoreWord() {
  if (!normalizeWord(input.value)) {
    input.value = state.lastValidWord;
  }
}

function updatePointerPosition(event) {
  state.pointer.active = true;
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
}

function clearPointerPosition() {
  state.pointer.active = false;
  state.pointer.x = Number.POSITIVE_INFINITY;
  state.pointer.y = Number.POSITIVE_INFINITY;
}

function renderFrame(timestamp = 0) {
  state.time = timestamp * 0.001;
  context.clearRect(0, 0, state.viewport.width, state.viewport.height);

  for (const particle of state.particles) {
    particle.update();
    particle.draw();
  }

  state.animationFrame = window.requestAnimationFrame(renderFrame);
}

function init() {
  if (!canvas || !context || !offscreenContext || !input || !form) {
    return;
  }

  setCanvasSize();
  setWord(DEFAULT_WORD);
  renderFrame();

  input.addEventListener("input", handleInput);
  input.addEventListener("blur", restoreWord);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    restoreWord();
  });
  window.addEventListener("pointermove", updatePointerPosition, { passive: true });
  window.addEventListener("pointerleave", clearPointerPosition);
  window.addEventListener("pointercancel", clearPointerPosition);
}

init();
