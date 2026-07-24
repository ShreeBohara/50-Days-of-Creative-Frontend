// GAME 01 — WHACK-A-DIV. Rogue <div>s pop out of a 3x3 grid; suppress them.
// 30-second rounds, pops speed up 600→300ms, three escapes end the run.

import { el, hudStat } from "./dom.js";
import {
  CELL_COUNT,
  MAX_MISSES,
  ROUND_MS,
  comboMultiplier,
  pickCell,
  popDuration,
  popGap,
  scoreForHit,
} from "./whackLogic.js";

export function initWhack() {
  const frame = document.getElementById("whack-frame");
  if (!frame) return;

  const state = {
    running: false,
    score: 0,
    streak: 0,
    misses: 0,
    upIndex: -1,
    prevIndex: null,
    roundStart: 0,
    popTimer: null,
    expireTimer: null,
    clockTimer: null,
  };

  // --- HUD -----------------------------------------------------------------
  const hud = el("div", "game-hud");
  const scoreStat = hudStat("SCORE", "0");
  const comboStat = hudStat("COMBO", "x1");
  const timeStat = hudStat("TIME", "30");

  const livesRoot = el("div", "hud-stat");
  livesRoot.append(el("span", "hud-label", "LIVES"));
  const livesRow = el("span", "hud-lives");
  const lifeDots = [];
  for (let i = 0; i < MAX_MISSES; i += 1) {
    const dot = el("span", "life");
    lifeDots.push(dot);
    livesRow.append(dot);
  }
  livesRoot.append(livesRow);

  hud.append(scoreStat.root, comboStat.root, timeStat.root, livesRoot);

  // --- stage + grid ----------------------------------------------------------
  const stage = el("div", "whack-stage");
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

  // game-over overlay
  const overlay = el("div", "game-over");
  overlay.hidden = true;
  const overPanel = el("div", "game-over-panel");
  overPanel.setAttribute("role", "status");
  const overTitle = el("p", "game-over-title", "GAME OVER");
  const overReason = el("p", "game-over-reason arcade", "");
  const overScore = el("p", "game-over-score", "0");
  const againBtn = el("button", "btn", "GO AGAIN");
  againBtn.type = "button";
  overPanel.append(overTitle, overReason, overScore, againBtn);
  overlay.append(overPanel);
  againBtn.addEventListener("click", start);

  stage.append(grid, overlay);

  // --- controls ---------------------------------------------------------------
  const controls = el("div", "game-controls");
  const startBtn = el("button", "btn btn-start", "START ROUND");
  startBtn.type = "button";
  const hint = el("p", "game-hint", "MOUSE OR KEYS 1–9. DIVS THAT ESCAPE COST A LIFE.");
  controls.append(startBtn, hint);
  startBtn.addEventListener("click", start);

  frame.append(hud, stage, controls);

  // --- helpers ----------------------------------------------------------------
  function elapsed() {
    return performance.now() - state.roundStart;
  }

  function setCombo() {
    comboStat.set(`x${comboMultiplier(state.streak)}`);
  }

  function setLives() {
    lifeDots.forEach((dot, i) => {
      dot.classList.toggle("is-lost", i < state.misses);
    });
  }

  function clearTimers() {
    clearTimeout(state.popTimer);
    clearTimeout(state.expireTimer);
    clearInterval(state.clockTimer);
  }

  function down() {
    if (state.upIndex >= 0) {
      delete cells[state.upIndex].dataset.up;
      state.prevIndex = state.upIndex;
      state.upIndex = -1;
    }
  }

  // --- flow ----------------------------------------------------------------
  function popUp() {
    if (!state.running) return;
    const idx = pickCell(CELL_COUNT, state.prevIndex);
    state.upIndex = idx;
    cells[idx].dataset.up = "true";
    state.expireTimer = setTimeout(escape, popDuration(elapsed()));
  }

  function scheduleNext() {
    if (!state.running) return;
    state.popTimer = setTimeout(popUp, popGap(elapsed()));
  }

  function escape() {
    down();
    state.streak = 0;
    state.misses += 1;
    setCombo();
    setLives();
    document.dispatchEvent(
      new CustomEvent("voltage:miss", { detail: { game: "whack" } }),
    );
    if (state.misses >= MAX_MISSES) {
      gameOver("THREE DIVS ESCAPED");
    } else {
      scheduleNext();
    }
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

  function tickClock() {
    const left = Math.max(0, ROUND_MS - elapsed());
    const secs = Math.ceil(left / 1000);
    timeStat.set(secs);
    timeStat.root.classList.toggle("is-critical", secs <= 5);
    if (left <= 0) gameOver("TIME UP");
  }

  function gameOver(reason) {
    if (!state.running) return;
    state.running = false;
    clearTimers();
    down();
    overReason.textContent = reason;
    overScore.textContent = String(state.score);
    overlay.hidden = false;
    startBtn.disabled = false;
    startBtn.textContent = "GO AGAIN";
    againBtn.focus({ preventScroll: true });
    document.dispatchEvent(
      new CustomEvent("voltage:gameover", {
        detail: { game: "whack", value: state.score },
      }),
    );
  }

  function start() {
    if (state.running) return;
    clearTimers();
    overlay.hidden = true;
    state.running = true;
    state.score = 0;
    state.streak = 0;
    state.misses = 0;
    state.prevIndex = null;
    state.roundStart = performance.now();
    scoreStat.set(0);
    timeStat.set(Math.round(ROUND_MS / 1000));
    timeStat.root.classList.remove("is-critical");
    setCombo();
    setLives();
    startBtn.disabled = true;
    state.clockTimer = setInterval(tickClock, 250);
    scheduleNext();
  }

  // keys 1-9 whack cells in reading order while the round runs
  document.addEventListener("keydown", (event) => {
    if (!state.running) return;
    if (event.target instanceof HTMLInputElement) return;
    const num = Number.parseInt(event.key, 10);
    if (num >= 1 && num <= CELL_COUNT) {
      whack(num - 1);
    }
  });

  window.__arcade = window.__arcade || {};
  window.__arcade.whack = { state, whack, popUp, start, gameOver };
}
