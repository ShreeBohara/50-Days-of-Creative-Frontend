import { createSplitFlapBoard, getColumnsForWidth } from "./board.js";

const status = document.querySelector("#system-status");
const grid = document.querySelector("#board-grid");
const boardLabel = document.querySelector("#board-label");

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

const board = createSplitFlapBoard(grid, {
  columns: getColumnsForWidth(window.innerWidth),
  onFrameRequested: (lines, changedIndices) => {
    boardLabel.setAttribute("aria-label", describeBoard(lines));
    status.textContent = changedIndices.length
      ? `${changedIndices.length} flaps routing`
      : "Board programme unchanged";
  },
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
renderPreview();

window.splitFlapBoard = board;
