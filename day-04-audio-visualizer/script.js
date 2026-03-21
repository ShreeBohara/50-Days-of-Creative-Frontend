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

const state = {
  audioContext: null,
  analyser: null,
  frequencyData: null,
  mediaSourceNode: null,
  currentObjectUrl: "",
  activeMode: "idle",
  isPlaying: false,
  selectedFileName: "",
};

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
}

if (!canvas || !fileInput || !playToggle || !statusLabel || !trackLabel || !audioElement) {
  throw new Error("Audio visualizer UI failed to initialize because required elements are missing.");
}

bindEvents();
updatePlayToggleLabel();
