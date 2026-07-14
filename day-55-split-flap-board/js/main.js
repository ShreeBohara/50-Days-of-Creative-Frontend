import { createSplitFlapBoard, getColumnsForWidth } from "./board.js";
import { createClackAudio } from "./audio.js";
import { createMessageMode } from "./messageMode.js";
import { createDeparturesMode } from "./departuresMode.js";
import { createClockMode } from "./clockMode.js";
import { createQuotesMode } from "./quotesMode.js";
import { createFocusTyping, createTabController } from "./controls.js";

const status = document.querySelector("#system-status");
const grid = document.querySelector("#board-grid");
const boardLabel = document.querySelector("#board-label");
const liveRegion = document.querySelector("#live-region");
const soundToggle = document.querySelector("#sound-toggle");
const volumeControl = document.querySelector("#volume-control");
const volumeOutput = document.querySelector("#volume-output");
const modeTabs = [...document.querySelectorAll(".mode-tab")];
const modePanels = [...document.querySelectorAll(".mode-panel")];
const boardTitle = document.querySelector("#board-title");
const messageInput = document.querySelector("#message-input");
const messageCount = document.querySelector("#message-count");
const messageHelp = document.querySelector("#message-help");
const terminal = document.querySelector("#terminal");
const speedControl = document.querySelector("#speed-control");
const speedOutput = document.querySelector("#speed-output");
const staggerControl = document.querySelector("#stagger-control");
const keyboardModeButton = document.querySelector("#keyboard-mode");
let activeMode = "departures";
let focusTyping = null;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

function describeBoard(lines) {
  const content = lines.map((line) => line.trim()).filter(Boolean).join("; ");
  return `Split-flap departure board. ${content}`;
}

function announce(message) {
  liveRegion.textContent = "";
  window.requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

function syncAudioControls(audioState) {
  const label = soundToggle.querySelector("strong");
  const detail = soundToggle.querySelector("small");
  const isActive = audioState.active;
  soundToggle.setAttribute("aria-pressed", String(isActive));
  soundToggle.dataset.state = audioState.enabled
    ? (isActive ? "active" : "muted")
    : "disabled";
  volumeControl.disabled = !audioState.enabled;

  if (!audioState.enabled) {
    label.textContent = "Enable clacks";
    detail.textContent = "Sound is off";
  } else if (isActive) {
    label.textContent = "Mute clacks";
    detail.textContent = "Sound active";
  } else {
    label.textContent = "Unmute clacks";
    detail.textContent = "Sound muted";
  }
}

const audio = createClackAudio({
  volume: volumeControl.value,
  reducedMotion: motionPreference.matches,
  onStateChange: syncAudioControls,
});

const board = createSplitFlapBoard(grid, {
  columns: getColumnsForWidth(window.innerWidth),
  reducedMotion: motionPreference.matches,
  onFlip: audio.clack,
  onFrameRequested: (lines, changedIndices) => {
    boardLabel.setAttribute("aria-label", describeBoard(lines));
    status.textContent = changedIndices.length
      ? `${changedIndices.length} flaps routing`
      : "Board programme unchanged";
  },
});

const messageMode = createMessageMode({
  input: messageInput,
  counter: messageCount,
  help: messageHelp,
  getColumns: () => board.columns,
  setBoard: board.setBoard,
  announce,
});

const departuresMode = createDeparturesMode({
  getColumns: () => board.columns,
  setBoard: board.setBoard,
  announce,
});

const clockMode = createClockMode({
  getColumns: () => board.columns,
  setBoard: board.setBoard,
});

const quotesMode = createQuotesMode({
  getColumns: () => board.columns,
  setBoard: board.setBoard,
  announce,
});

soundToggle.addEventListener("click", async () => {
  soundToggle.disabled = true;
  const wasEnabled = audio.state.enabled;
  const active = await audio.toggle();
  soundToggle.disabled = false;
  syncAudioControls(audio.state);
  if (!audio.state.enabled) {
    announce("Web Audio could not start. Activate the sound control to try again.");
  } else {
    announce(active ? (wasEnabled ? "Split-flap clacks unmuted" : "Split-flap clacks enabled") : "Split-flap clacks muted");
  }
});

volumeControl.addEventListener("input", () => {
  const volume = audio.setVolume(volumeControl.value);
  const percentage = Math.round(volume * 100);
  volumeOutput.value = `${percentage}%`;
  volumeControl.setAttribute("aria-valuetext", `${percentage} percent`);
});

function renderActiveMode() {
  if (activeMode === "message") {
    messageMode.activate();
  } else if (activeMode === "departures") {
    departuresMode.activate();
  } else if (activeMode === "clock") {
    clockMode.activate();
  } else {
    quotesMode.activate();
  }
}

function setActiveMode(mode) {
  if (!mode || mode === activeMode) return;
  if (mode !== "message" && focusTyping?.active) {
    focusTyping.exit({ restoreFocus: false, announce: false });
  }
  messageMode.deactivate();
  departuresMode.deactivate();
  clockMode.deactivate();
  quotesMode.deactivate();
  activeMode = mode;
  terminal.dataset.mode = mode;
  boardTitle.textContent = mode;
  renderActiveMode();
  announce(`${mode} mode selected`);
}

const tabController = createTabController({
  tabs: modeTabs,
  panels: modePanels,
  initialMode: activeMode,
  onSelect: setActiveMode,
});

speedControl.addEventListener("input", () => {
  const speed = board.setSpeed(speedControl.value);
  speedOutput.value = `${speed.toFixed(1)}×`;
  speedControl.setAttribute("aria-valuetext", `${speed.toFixed(1)} times`);
});

speedControl.addEventListener("change", () => {
  announce(`Flip speed ${Number(speedControl.value).toFixed(1)} times`);
});

staggerControl.addEventListener("change", () => {
  const staggered = board.setStagger(staggerControl.checked);
  announce(staggered ? "Left to right solve wave enabled" : "Simultaneous solve enabled");
});

focusTyping = createFocusTyping({
  button: keyboardModeButton,
  boardTarget: boardLabel,
  getColumns: () => board.columns,
  setText: (text) => messageMode.setSource(text, { announce: false }),
  onEnter: () => tabController.select("message"),
  onStateChange: (active) => {
    terminal.classList.toggle("is-keyboard-mode", active);
    status.textContent = active ? "Focus typing active · Escape to exit" : "Focus typing ready";
  },
  announce,
});

let resizeFrame = 0;
window.addEventListener("resize", () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    if (board.setColumns(getColumnsForWidth(window.innerWidth))) {
      if (activeMode === "message") messageMode.resize();
      else if (activeMode === "departures") departuresMode.resize();
      else if (activeMode === "clock") clockMode.resize();
      else quotesMode.resize();
      focusTyping.resize();
    }
  });
}, { passive: true });

function handleVisibilityChange() {
  const hidden = document.hidden;
  audio.setHidden(hidden);
  if (hidden) board.setPaused(true);
  messageMode.setHidden(hidden);
  departuresMode.setHidden(hidden);
  clockMode.setHidden(hidden);
  quotesMode.setHidden(hidden);
  if (!hidden) board.setPaused(false);
}

function handleMotionPreference(event) {
  board.setReducedMotion(event.matches);
  audio.setReducedMotion(event.matches);
  announce(event.matches
    ? "Reduced motion enabled. Board changes now settle immediately."
    : "Mechanical board motion enabled for future changes.");
}

document.addEventListener("visibilitychange", handleVisibilityChange);
motionPreference.addEventListener("change", handleMotionPreference);

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  messageMode.destroy();
  departuresMode.destroy();
  clockMode.destroy();
  quotesMode.destroy();
  focusTyping.destroy();
  tabController.destroy();
  board.destroy();
  void audio.destroy();
}, { once: true });

document.documentElement.classList.add("is-ready");
terminal.dataset.mode = activeMode;
syncAudioControls(audio.state);
speedControl.setAttribute("aria-valuetext", "1.0 times");
volumeControl.setAttribute("aria-valuetext", "45 percent");
departuresMode.activate();
if (document.hidden) handleVisibilityChange();

window.splitFlapBoard = board;
