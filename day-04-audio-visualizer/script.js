"use strict";

const AudioContextClass = window.AudioContext || window.webkitAudioContext;

const canvas = document.querySelector("[data-spectrum-canvas]");
const fileInput = document.querySelector("[data-audio-input]");
const playToggle = document.querySelector("[data-play-toggle]");
const statusLabel = document.querySelector("[data-status-label]");
const trackLabel = document.querySelector("[data-track-label]");
const audioElement = document.querySelector("[data-audio-element]");

const FFT_SIZE = 256;
const BIN_COUNT = FFT_SIZE / 2;
const FULL_CIRCLE = Math.PI * 2;

const state = {
  audioContext: null,
  analyser: null,
  frequencyData: new Uint8Array(BIN_COUNT),
  mediaSourceNode: null,
  currentObjectUrl: "",
  activeMode: "idle",
  isPlaying: false,
  selectedFileName: "",
  frameId: 0,
  width: 0,
  height: 0,
  dpr: 1,
};

const context = canvas?.getContext("2d");

function setStatus(primary, secondary) {
  if (statusLabel) {
    statusLabel.textContent = primary;
  }

  if (trackLabel) {
    trackLabel.textContent = secondary;
  }
}

function updatePlayToggleLabel() {
  if (!playToggle) {
    return;
  }

  const hasFile = Boolean(audioElement?.src);
  const nextLabel = state.isPlaying ? "Pause" : hasFile ? "Play Upload" : "Play Demo";
  playToggle.textContent = nextLabel;
  playToggle.setAttribute("aria-pressed", String(state.isPlaying));
}

function revokeObjectUrl() {
  if (state.currentObjectUrl) {
    URL.revokeObjectURL(state.currentObjectUrl);
    state.currentObjectUrl = "";
  }
}

function ensureAudioGraph() {
  if (!AudioContextClass || !audioElement) {
    setStatus("Audio setup is unavailable.", "This browser does not support the Web Audio API.");
    return null;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }

  if (!state.analyser) {
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = FFT_SIZE;
    state.analyser.smoothingTimeConstant = 0.82;
    state.analyser.minDecibels = -92;
    state.analyser.maxDecibels = -12;
    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
  }

  if (!state.mediaSourceNode) {
    state.mediaSourceNode = state.audioContext.createMediaElementSource(audioElement);
    state.mediaSourceNode.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
  }

  return state.analyser;
}

async function resumeAudioContext() {
  const analyser = ensureAudioGraph();

  if (!analyser || !state.audioContext) {
    return false;
  }

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }

  return true;
}

function syncPlaybackState() {
  state.isPlaying = Boolean(audioElement && !audioElement.paused && !audioElement.ended);
  updatePlayToggleLabel();
}

function stopUploadedAudio() {
  if (!audioElement) {
    return;
  }

  audioElement.pause();
  audioElement.currentTime = 0;
  syncPlaybackState();
}

async function playUploadedAudio() {
  if (!audioElement?.src) {
    setStatus("Upload a track first.", "Demo mode will be added in a later commit.");
    return;
  }

  const ready = await resumeAudioContext();

  if (!ready) {
    return;
  }

  state.activeMode = "file";
  await audioElement.play();
  syncPlaybackState();
  setStatus("Playing uploaded audio.", state.selectedFileName || "Custom track");
}

function handleFileSelection(event) {
  const [file] = event.target.files ?? [];

  if (!file || !audioElement) {
    return;
  }

  stopUploadedAudio();
  revokeObjectUrl();

  state.currentObjectUrl = URL.createObjectURL(file);
  state.selectedFileName = file.name;
  state.activeMode = "file";

  audioElement.src = state.currentObjectUrl;
  audioElement.load();

  setStatus("Track loaded.", `${file.name} is ready to play.`);
  updatePlayToggleLabel();
}

async function handlePlayToggle() {
  if (state.isPlaying) {
    stopUploadedAudio();
    setStatus("Playback paused.", state.selectedFileName || "Upload a track or wait for demo mode.");
    return;
  }

  await playUploadedAudio();
}

function bindEvents() {
  if (fileInput) {
    fileInput.addEventListener("change", handleFileSelection);
  }

  if (playToggle) {
    playToggle.addEventListener("click", () => {
      void handlePlayToggle();
    });
  }

  if (audioElement) {
    audioElement.addEventListener("play", syncPlaybackState);
    audioElement.addEventListener("pause", syncPlaybackState);
    audioElement.addEventListener("ended", () => {
      syncPlaybackState();
      setStatus("Playback complete.", state.selectedFileName || "Upload another track to continue.");
    });
  }

  window.addEventListener("beforeunload", revokeObjectUrl);
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  if (!canvas || !context) {
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const nextWidth = Math.max(1, Math.round(bounds.width));
  const nextHeight = Math.max(1, Math.round(bounds.height));
  const nextDpr = Math.max(1, window.devicePixelRatio || 1);

  state.width = nextWidth;
  state.height = nextHeight;
  state.dpr = nextDpr;

  canvas.width = Math.round(nextWidth * nextDpr);
  canvas.height = Math.round(nextHeight * nextDpr);
  context.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
}

function getFrequencySnapshot() {
  if (!state.frequencyData) {
    return null;
  }

  if (state.analyser) {
    state.analyser.getByteFrequencyData(state.frequencyData);
  } else {
    state.frequencyData.fill(0);
  }

  return state.frequencyData;
}

function getAverageEnergy(frequencyData, startIndex, endIndex) {
  const upperBound = Math.min(endIndex, frequencyData.length);
  let total = 0;
  let count = 0;

  for (let index = startIndex; index < upperBound; index += 1) {
    total += frequencyData[index];
    count += 1;
  }

  return count ? total / count : 0;
}

function getBarColor(index, intensity, alpha = 1) {
  const progress = index / Math.max(1, BIN_COUNT - 1);
  const hue = 28 + (progress * 178);
  const saturation = 88;
  const lightness = 56 + (intensity * 16);

  return `hsla(${hue.toFixed(2)}, ${saturation}%, ${lightness.toFixed(2)}%, ${alpha})`;
}

function drawOrb(centerX, centerY, radius, frequencyData) {
  if (!context) {
    return;
  }

  const lowEnergy = getAverageEnergy(frequencyData, 0, 10) / 255;
  const midEnergy = getAverageEnergy(frequencyData, 24, 62) / 255;
  const gradient = context.createRadialGradient(
    centerX - (radius * 0.32),
    centerY - (radius * 0.32),
    radius * 0.2,
    centerX,
    centerY,
    radius
  );

  gradient.addColorStop(0, `hsla(${36 + (lowEnergy * 10)}, 100%, ${76 + (lowEnergy * 8)}%, 0.95)`);
  gradient.addColorStop(0.58, `hsla(${20 + (midEnergy * 32)}, 94%, ${62 + (midEnergy * 10)}%, 0.88)`);
  gradient.addColorStop(1, "hsla(192, 88%, 58%, 0.35)");

  context.beginPath();
  context.fillStyle = gradient;
  context.arc(centerX, centerY, radius, 0, FULL_CIRCLE);
  context.fill();
}

function drawSpectrumBars(centerX, centerY, baseRadius, maxBarHeight, frequencyData) {
  if (!context || !frequencyData) {
    return;
  }

  context.lineCap = "round";

  for (let index = 0; index < BIN_COUNT; index += 1) {
    const intensity = frequencyData[index] / 255;
    const angle = (-Math.PI / 2) + (index / BIN_COUNT) * FULL_CIRCLE;
    const barHeight = 10 + (intensity * maxBarHeight);
    const startRadius = baseRadius;
    const endRadius = startRadius + barHeight;
    const startX = centerX + Math.cos(angle) * startRadius;
    const startY = centerY + Math.sin(angle) * startRadius;
    const endX = centerX + Math.cos(angle) * endRadius;
    const endY = centerY + Math.sin(angle) * endRadius;

    context.strokeStyle = getBarColor(index, intensity, 0.88);
    context.lineWidth = 2.5 + (intensity * 2.5);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  }
}

function renderFrame() {
  if (!context) {
    return;
  }

  const width = state.width || window.innerWidth;
  const height = state.height || window.innerHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const minDimension = Math.min(width, height);
  const orbRadius = minDimension * 0.1;
  const barRadius = orbRadius + (minDimension * 0.085);
  const barTravel = minDimension * 0.18;
  const frequencySnapshot = getFrequencySnapshot();

  context.clearRect(0, 0, width, height);
  drawOrb(centerX, centerY, orbRadius, frequencySnapshot);
  drawSpectrumBars(centerX, centerY, barRadius, barTravel, frequencySnapshot);

  state.frameId = window.requestAnimationFrame(renderFrame);
}

if (!canvas || !fileInput || !playToggle || !statusLabel || !trackLabel || !audioElement || !context) {
  throw new Error("Audio visualizer UI failed to initialize because required elements are missing.");
}

bindEvents();
updatePlayToggleLabel();
resizeCanvas();
renderFrame();
