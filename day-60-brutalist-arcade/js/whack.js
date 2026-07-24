// GAME 01 — WHACK-A-DIV. Rogue <div>s pop out of a 3x3 grid; suppress them.

import { el, hudStat } from "./dom.js";
import {
  CELL_COUNT,
  START_POP_MS,
  START_GAP_MS,
  comboMultiplier,
  pickCell,
  scoreForHit,
} from "./whackLogic.js";

export function initWhack() {
  const frame = document.getElementById("whack-frame");
  if (!frame) return;

  const state = {
    running: false,
    score: 0,
    streak: 0,
    upIndex: -1,
    prevIndex: null,
    popTimer: null,
    expireTimer: null,
  };

  // --- HUD ---------------------------------------------------------------
  const hud = el("div", "game-hud");
  const scoreStat = hudStat("SCORE", "0");
  const comboStat = hudStat("COMBO", "x1");
  hud.append(scoreStat.root, comboStat.root);

  // --- grid ----------------------------------------------------------------
  const grid = el("div", "whack-grid");
  const cells = [];
  for (let i = 0; i < CELL_COUNT; i += 1) {
    const cell = el("button", "whack-cell");
    cell.type = "button";
    cell.setAttribute("aria-label", `Whack cell ${i + 1}`);
    const face = el("span", "whack-face arcade", "<div>");
    face.setAttribute("aria-hidden", "true");
    cell.append(face);
    cell.addEventListener("click", () => whack(i));
    cells.push(cell);
    grid.append(cell);
  }

  // --- controls ------------------------------------------------------------
  const controls = el("div", "game-controls");
  const startBtn = el("button", "btn btn-start", "START ROUND");
  startBtn.type = "button";
  controls.append(startBtn);
  startBtn.addEventListener("click", start);

  frame.append(hud, grid, controls);

  // --- flow ------------------------------------------------------------
  function setCombo() {
    comboStat.set(`x${comboMultiplier(state.streak)}`);
  }

  function down() {
    if (state.upIndex >= 0) {
      delete cells[state.upIndex].dataset.up;
      state.prevIndex = state.upIndex;
      state.upIndex = -1;
    }
  }

  function popUp() {
    const idx = pickCell(CELL_COUNT, state.prevIndex);
    state.upIndex = idx;
    cells[idx].dataset.up = "true";
    state.expireTimer = setTimeout(() => {
      down();
      state.streak = 0;
      setCombo();
      scheduleNext();
    }, START_POP_MS);
  }

  function scheduleNext() {
    state.popTimer = setTimeout(popUp, START_GAP_MS);
  }

  function whack(idx) {
    if (!state.running) return;
    if (idx === state.upIndex) {
      clearTimeout(state.expireTimer);
      const face = cells[idx].querySelector(".whack-face");
      face.classList.remove("is-squashed");
      void face.offsetWidth;
      face.classList.add("is-squashed");
      down();
      state.streak += 1;
      const points = scoreForHit(state.streak);
      state.score += points;
      scoreStat.set(state.score);
      scoreStat.flash();
      setCombo();
      document.dispatchEvent(
        new CustomEvent("voltage:hit", {
          detail: { game: "whack", streak: state.streak, points },
        }),
      );
      scheduleNext();
    } else {
      // whiffed an empty cell: streak dies, dignity too
      state.streak = 0;
      setCombo();
      document.dispatchEvent(
        new CustomEvent("voltage:whiff", { detail: { game: "whack" } }),
      );
    }
  }

  function start() {
    if (state.running) return;
    state.running = true;
    state.score = 0;
    state.streak = 0;
    state.prevIndex = null;
    scoreStat.set(0);
    setCombo();
    startBtn.disabled = true;
    scheduleNext();
  }

  window.__arcade = window.__arcade || {};
  window.__arcade.whack = { state, whack, popUp, start };
}
