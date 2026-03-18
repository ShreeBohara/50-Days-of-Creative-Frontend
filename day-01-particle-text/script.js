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
  fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
  fontWeight: 700,
  maxParticles: 4800,
  maxFontSize: 340,
  minFontSize: 120,
};

const state = {
  targets: [],
  word: DEFAULT_WORD,
  lastValidWord: DEFAULT_WORD,
  viewport: {
    width: 0,
    height: 0,
    dpr: 1,
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeWord(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_WORD_LENGTH).toUpperCase();
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

function setWord(nextWord) {
  const normalizedWord = normalizeWord(nextWord);

  if (!normalizedWord) {
    return false;
  }

  state.word = normalizedWord;
  state.lastValidWord = normalizedWord;
  state.targets = sampleTextTargets(normalizedWord);
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

function init() {
  if (!canvas || !context || !offscreenContext || !input || !form) {
    return;
  }

  setCanvasSize();
  setWord(DEFAULT_WORD);

  input.addEventListener("input", handleInput);
  input.addEventListener("blur", restoreWord);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    restoreWord();
  });
}

init();
