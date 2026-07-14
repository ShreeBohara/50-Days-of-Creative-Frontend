import { createSplitFlapBoard, getColumnsForWidth } from "./board.js";
import { createClackAudio } from "./audio.js";

const status = document.querySelector("#system-status");
const grid = document.querySelector("#board-grid");
const boardLabel = document.querySelector("#board-label");
const liveRegion = document.querySelector("#live-region");
const soundToggle = document.querySelector("#sound-toggle");
const volumeControl = document.querySelector("#volume-control");
const volumeOutput = document.querySelector("#volume-output");

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

let resizeFrame = 0;
window.addEventListener("resize", () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    if (board.setColumns(getColumnsForWidth(window.innerWidth))) renderPreview();
  });
}, { passive: true });

document.documentElement.classList.add("is-ready");
syncAudioControls(audio.state);
volumeControl.setAttribute("aria-valuetext", "45 percent");
renderPreview();

window.splitFlapBoard = board;
