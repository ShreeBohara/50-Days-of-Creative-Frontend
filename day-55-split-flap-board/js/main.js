import { createSplitFlapBoard, getColumnsForWidth } from "./board.js";
import { createClackAudio } from "./audio.js";
import { createMessageMode } from "./messageMode.js";

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
let activeMode = "departures";

const previewServices = [
  { time: "06:40", destination: "BERLIN", code: "BER", status: "ON TIME" },
  { time: "07:15", destination: "NEWYORK", code: "NYC", status: "BOARDING" },
  { time: "08:05", destination: "LISBON", code: "LIS", status: "ON TIME" },
  { time: "09:20", destination: "TOKYO", code: "TYO", status: "DELAYED" },
  { time: "10:10", destination: "VIENNA", code: "VIE", status: "ON TIME" },
  { time: "11:35", destination: "SEATTLE", code: "SEA", status: "BOARDING" },
];

const statusCodes = {
  "ON TIME": { medium: "ONT", compact: "OK" },
  BOARDING: { medium: "BRD", compact: "BD" },
  DELAYED: { medium: "DLY", compact: "DL" },
};

function formatPreview(columns) {
  return previewServices.map((service) => {
    if (columns === 22) {
      return `${service.time} ${service.destination.padEnd(7)} ${service.status.padEnd(8)}`;
    }
    if (columns === 16) {
      return `${service.time} ${service.destination.slice(0, 6).padEnd(6)} ${statusCodes[service.status].medium}`;
    }
    return `${service.time} ${service.code} ${statusCodes[service.status].compact}`;
  });
}

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
  onStateChange: syncAudioControls,
});

const board = createSplitFlapBoard(grid, {
  columns: getColumnsForWidth(window.innerWidth),
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

function renderPreview() {
  board.setBoard(formatPreview(board.columns));
}

function renderPlaceholder(label) {
  const line = String(label).toUpperCase().slice(0, board.columns);
  const leftPadding = Math.max(0, Math.floor((board.columns - line.length) / 2));
  board.setBoard(["", "", `${" ".repeat(leftPadding)}${line}`]);
}

function renderActiveMode() {
  if (activeMode === "message") {
    messageMode.activate();
  } else if (activeMode === "departures") {
    renderPreview();
  } else {
    renderPlaceholder(activeMode);
  }
}

function setActiveMode(mode) {
  if (!mode || mode === activeMode) return;
  messageMode.deactivate();
  activeMode = mode;
  modeTabs.forEach((tab) => {
    const selected = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  modePanels.forEach((panel) => {
    const selected = panel.id === `panel-${mode}`;
    panel.classList.toggle("is-active", selected);
    panel.hidden = !selected;
  });
  boardTitle.textContent = mode;
  renderActiveMode();
  announce(`${mode} mode selected`);
}

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveMode(tab.dataset.mode));
});

let resizeFrame = 0;
window.addEventListener("resize", () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    if (board.setColumns(getColumnsForWidth(window.innerWidth))) {
      if (activeMode === "message") messageMode.resize();
      else renderActiveMode();
    }
  });
}, { passive: true });

document.documentElement.classList.add("is-ready");
syncAudioControls(audio.state);
volumeControl.setAttribute("aria-valuetext", "45 percent");
renderPreview();

window.splitFlapBoard = board;
