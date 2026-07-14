import { createFlapCell } from "./flapCell.js";
import { getStaggerDelay } from "./charset.js";
import { createFlapSequencer } from "./flapSequencer.js";

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

const sequencers = [];

previewLines.forEach((line, row) => {
  for (const [column, character] of [...line.padEnd(22).slice(0, 22)].entries()) {
    const cell = createFlapCell(" ");
    const sequencer = createFlapSequencer(cell, {
      index: row * 22 + column,
      row,
      column,
    });
    grid.append(cell.element);
    sequencers.push(sequencer);
    sequencer.setTarget(character, { delay: getStaggerDelay(row, column, true) });
  }
});

document.documentElement.classList.add("is-ready");
status.textContent = "Mechanical sequence active";
