import { createFlapCell } from "./flapCell.js";

const status = document.querySelector("#system-status");
const grid = document.querySelector("#board-grid");

const previewLines = [
  "06:40 BERLIN  ON TIME",
  "07:15 NEWYORK BOARDING",
  "08:05 LISBON  ON TIME",
  "09:20 TOKYO   DELAYED",
  "10:10 VIENNA  ON TIME",
  "11:35 SEATTLE BOARDING",
];

for (const line of previewLines) {
  for (const character of line.padEnd(22).slice(0, 22)) {
    const cell = createFlapCell(character);
    grid.append(cell.element);
  }
}

document.documentElement.classList.add("is-ready");
status.textContent = "Preview programme loaded";
