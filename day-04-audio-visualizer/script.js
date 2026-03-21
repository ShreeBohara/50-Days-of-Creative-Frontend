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
  demoNodes: null,
  demoPulseIndex: 0,
  frameId: 0,
  resizeObserver: null,
  width: 0,
  height: 0,
  dpr: 1,
  bassBaseline: 0,
  pulseStrength: 0,
  flashStrength: 0,
  lastBeatTime: 0,
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
  let nextLabel = hasFile ? "Play Upload" : "Play Demo";

  if (state.isPlaying) {
    nextLabel = state.activeMode === "demo" ? "Pause Demo" : "Pause Upload";
  }

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
  if (state.activeMode === "demo") {
    updatePlayToggleLabel();
    return;
  }

  state.isPlaying = Boolean(audioElement && !audioElement.paused && !audioElement.ended);
  updatePlayToggleLabel();
}

function pauseUploadedAudio(resetTime = false) {
  if (!audioElement) {
    return;
  }

  audioElement.pause();

  if (resetTime) {
    audioElement.currentTime = 0;
  }

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

  stopActiveSource({ resetFilePosition: true });
  revokeObjectUrl();

  state.currentObjectUrl = URL.createObjectURL(file);
  state.selectedFileName = file.name;
  state.activeMode = "file";

  audioElement.src = state.currentObjectUrl;
  audioElement.load();

  setStatus("Track loaded.", `${file.name} is ready to play.`);
  updatePlayToggleLabel();
}

function scheduleDemoPulse() {
  if (!state.demoNodes || !state.audioContext) {
    return;
  }

  const { bassGain, midGain, airGain, midFilter } = state.demoNodes;
  const step = state.demoPulseIndex % 8;
  const accent = step % 4 === 0 ? 1 : 0.76 + (Math.random() * 0.12);
  const spacing = step % 4 === 3 ? 430 : 320;
  const now = state.audioContext.currentTime;

  bassGain.gain.cancelScheduledValues(now);
  bassGain.gain.setValueAtTime(0.0001, now);
  bassGain.gain.linearRampToValueAtTime(0.18 * accent, now + 0.02);
  bassGain.gain.exponentialRampToValueAtTime(0.024, now + 0.34);

  midGain.gain.cancelScheduledValues(now);
  midGain.gain.setValueAtTime(0.028, now);
  midGain.gain.linearRampToValueAtTime(0.085 * accent, now + 0.04);
  midGain.gain.exponentialRampToValueAtTime(0.02, now + 0.32);

  airGain.gain.cancelScheduledValues(now);
  airGain.gain.setValueAtTime(0.014, now);
  airGain.gain.linearRampToValueAtTime(0.035 + (accent * 0.016), now + 0.08);
  airGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

  midFilter.frequency.cancelScheduledValues(now);
  midFilter.frequency.setValueAtTime(520 + (step * 45), now);
  midFilter.frequency.linearRampToValueAtTime(980 + (accent * 90), now + 0.12);
  midFilter.frequency.exponentialRampToValueAtTime(620, now + 0.4);

  state.demoPulseIndex += 1;
  state.demoNodes.pulseTimer = window.setTimeout(scheduleDemoPulse, spacing);
}

function stopDemoMode() {
  if (!state.demoNodes) {
    return;
  }

  const {
    bassOsc,
    midOsc,
    airOsc,
    motionOsc,
    motionDepth,
    bassFilter,
    midFilter,
    airFilter,
    bassGain,
    midGain,
    airGain,
    masterGain,
    pulseTimer,
  } = state.demoNodes;

  window.clearTimeout(pulseTimer);

  [bassOsc, midOsc, airOsc, motionOsc].forEach((node) => {
    try {
      node.stop();
    } catch (error) {
      // Oscillators may already be stopped during rapid source changes.
    }
  });

  [
    motionDepth,
    bassFilter,
    midFilter,
    airFilter,
    bassGain,
    midGain,
    airGain,
    masterGain,
    bassOsc,
    midOsc,
    airOsc,
    motionOsc,
  ].forEach((node) => {
    node.disconnect();
  });

  state.demoNodes = null;
  state.isPlaying = false;
  state.activeMode = audioElement?.src ? "file" : "idle";
  updatePlayToggleLabel();
}

async function playDemoMode() {
  const ready = await resumeAudioContext();

  if (!ready || !state.audioContext || !state.analyser) {
    return;
  }

  stopActiveSource({ resetFilePosition: false });

  const bassOsc = state.audioContext.createOscillator();
  const midOsc = state.audioContext.createOscillator();
  const airOsc = state.audioContext.createOscillator();
  const motionOsc = state.audioContext.createOscillator();
  const motionDepth = state.audioContext.createGain();
  const bassFilter = state.audioContext.createBiquadFilter();
  const midFilter = state.audioContext.createBiquadFilter();
  const airFilter = state.audioContext.createBiquadFilter();
  const bassGain = state.audioContext.createGain();
  const midGain = state.audioContext.createGain();
  const airGain = state.audioContext.createGain();
  const masterGain = state.audioContext.createGain();

  bassOsc.type = "sine";
  bassOsc.frequency.value = 56;
  midOsc.type = "triangle";
  midOsc.frequency.value = 196;
  airOsc.type = "sawtooth";
  airOsc.frequency.value = 392;
  motionOsc.type = "sine";
  motionOsc.frequency.value = 0.11;

  motionDepth.gain.value = 8;

  bassFilter.type = "lowpass";
  bassFilter.frequency.value = 190;
  bassFilter.Q.value = 0.85;

  midFilter.type = "bandpass";
  midFilter.frequency.value = 620;
  midFilter.Q.value = 0.65;

  airFilter.type = "highpass";
  airFilter.frequency.value = 1200;
  airFilter.Q.value = 0.5;

  bassGain.gain.value = 0.0001;
  midGain.gain.value = 0.02;
  airGain.gain.value = 0.01;
  masterGain.gain.value = 0.45;

  motionOsc.connect(motionDepth);
  motionDepth.connect(midOsc.detune);
  motionDepth.connect(airOsc.detune);

  bassOsc.connect(bassFilter);
  bassFilter.connect(bassGain);
  bassGain.connect(masterGain);

  midOsc.connect(midFilter);
  midFilter.connect(midGain);
  midGain.connect(masterGain);

  airOsc.connect(airFilter);
  airFilter.connect(airGain);
  airGain.connect(masterGain);

  masterGain.connect(state.analyser);

  bassOsc.start();
  midOsc.start();
  airOsc.start();
  motionOsc.start();

  state.demoNodes = {
    bassOsc,
    midOsc,
    airOsc,
    motionOsc,
    motionDepth,
    bassFilter,
    midFilter,
    airFilter,
    bassGain,
    midGain,
    airGain,
    masterGain,
    pulseTimer: 0,
  };
  state.demoPulseIndex = 0;
  state.activeMode = "demo";
  state.isPlaying = true;

  scheduleDemoPulse();
  updatePlayToggleLabel();
  setStatus("Playing demo mode.", "Synthetic pulses are driving the spectrum.");
}

function stopActiveSource({ resetFilePosition }) {
  if (state.activeMode === "demo") {
    stopDemoMode();
    return;
  }

  if (audioElement?.src) {
    pauseUploadedAudio(resetFilePosition);
  }
}

async function handlePlayToggle() {
  if (state.isPlaying) {
    if (state.activeMode === "demo") {
      stopDemoMode();
      setStatus("Demo mode paused.", "Upload a track or restart the demo whenever you're ready.");
      return;
    }

    pauseUploadedAudio(false);
    setStatus("Playback paused.", state.selectedFileName || "Upload a track or start demo mode.");
    return;
  }

  if (audioElement?.src) {
    await playUploadedAudio();
    return;
  }

  await playDemoMode();
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
      state.activeMode = "file";
      syncPlaybackState();
      setStatus("Playback complete.", state.selectedFileName || "Upload another track to continue.");
    });
  }

  window.addEventListener("beforeunload", revokeObjectUrl);
  window.addEventListener("resize", resizeCanvas);

  if ("ResizeObserver" in window) {
    state.resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    state.resizeObserver.observe(canvas);
  }
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

  context.save();
  context.shadowColor = "rgba(255, 160, 94, 0.52)";
  context.shadowBlur = radius * 0.9;
  context.beginPath();
  context.fillStyle = gradient;
  context.arc(centerX, centerY, radius, 0, FULL_CIRCLE);
  context.fill();
  context.restore();
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
    const glowColor = getBarColor(index, intensity, 0.24 + (intensity * 0.18));
    const crispColor = getBarColor(index, intensity, 0.92);

    context.strokeStyle = glowColor;
    context.shadowColor = glowColor;
    context.shadowBlur = 18 + (intensity * 20);
    context.lineWidth = 5 + (intensity * 4.5);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    context.shadowBlur = 0;
    context.strokeStyle = crispColor;
    context.lineWidth = 2.5 + (intensity * 2.5);
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  }
}

function drawBackgroundFlash(centerX, centerY, minDimension) {
  if (!context) {
    return;
  }

  const flashGradient = context.createRadialGradient(
    centerX,
    centerY,
    minDimension * 0.12,
    centerX,
    centerY,
    minDimension * 0.82
  );

  flashGradient.addColorStop(0, `hsla(35, 100%, 72%, ${0.045 + (state.flashStrength * 0.08)})`);
  flashGradient.addColorStop(0.52, `hsla(198, 96%, 62%, ${0.024 + (state.flashStrength * 0.05)})`);
  flashGradient.addColorStop(1, "hsla(230, 88%, 12%, 0)");

  context.fillStyle = flashGradient;
  context.fillRect(0, 0, state.width, state.height);
}

function updateBeatDetection(frequencyData, now) {
  const bassEnergy = getAverageEnergy(frequencyData, 0, 12);
  const baseline = state.bassBaseline || bassEnergy;

  state.bassBaseline = (baseline * 0.92) + (bassEnergy * 0.08);

  const baselineThreshold = Math.max(68, state.bassBaseline * 1.32);
  const cooldownElapsed = now - state.lastBeatTime > 240;
  const detectedBeat = bassEnergy > baselineThreshold && cooldownElapsed;

  if (detectedBeat) {
    state.lastBeatTime = now;
    state.pulseStrength = 1;
    state.flashStrength = 1;
  } else {
    state.pulseStrength *= 0.91;
    state.flashStrength *= 0.9;
  }
}

function renderFrame() {
  if (!context) {
    return;
  }

  const now = window.performance.now();
  const width = state.width || window.innerWidth;
  const height = state.height || window.innerHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const minDimension = Math.min(width, height);
  const frequencySnapshot = getFrequencySnapshot();

  updateBeatDetection(frequencySnapshot, now);

  const orbRadius = (minDimension * 0.1) * (1 + (state.pulseStrength * 0.24));
  const barRadius = orbRadius + (minDimension * 0.085);
  const barTravel = minDimension * 0.18;

  context.clearRect(0, 0, width, height);
  drawBackgroundFlash(centerX, centerY, minDimension);
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
