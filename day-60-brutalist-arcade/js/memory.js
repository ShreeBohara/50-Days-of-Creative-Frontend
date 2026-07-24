// GAME 03 — MEMORY PAIRS. 4x4 grid, eight icon pairs, zero rounded corners.

import { el, hudStat, svgIcon } from "./dom.js";
import { createConfetti } from "./confetti.js";
import { createDeck, createGame, flipCard, settle } from "./memoryLogic.js";

const MISMATCH_HOLD_MS = 700;

function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function initMemory() {
  const frame = document.getElementById("memory-frame");
  if (!frame) return;

  let game = createGame(createDeck());
  let locked = false;
  let startedAt = null;
  let clockTimer = null;
  let finalTimeMs = 0;

  // --- HUD -----------------------------------------------------------------
  const hud = el("div", "game-hud");
  const movesStat = hudStat("MOVES", "0");
  const timeStat = hudStat("TIME", "0:00");
  hud.append(movesStat.root, timeStat.root);

  // --- stage + grid ---------------------------------------------------------
  const stage = el("div", "mem-stage");
  const grid = el("div", "mem-grid");
  const cards = [];

  function buildCard(index) {
    const card = el("button", "mem-card");
    card.type = "button";
    card.setAttribute("aria-label", `Card ${index + 1}, face down`);
    const inner = el("span", "mem-inner");
    inner.setAttribute("aria-hidden", "true");
    const front = el("span", "mem-front arcade", "?");
    const back = el("span", "mem-back");
    back.append(svgIcon(`i-${game.deck[index]}`, "mem-icon"));
    inner.append(front, back);
    card.append(inner);
    card.addEventListener("click", () => flip(index));
    return card;
  }

  function buildGrid() {
    grid.replaceChildren();
    cards.length = 0;
    for (let i = 0; i < game.deck.length; i += 1) {
      const card = buildCard(i);
      cards.push(card);
      grid.append(card);
    }
  }

  buildGrid();

  // confetti layer + win overlay
  const confettiCanvas = el("canvas", "confetti-canvas");
  confettiCanvas.setAttribute("aria-hidden", "true");
  const confetti = createConfetti(confettiCanvas);

  const overlay = el("div", "game-over");
  overlay.hidden = true;
  const overPanel = el("div", "game-over-panel");
  overPanel.setAttribute("role", "status");
  const overTitle = el("p", "game-over-title", "PAIRED UP!");
  const overReason = el("p", "game-over-reason arcade", "");
  const againBtn = el("button", "btn", "RE-SHUFFLE");
  againBtn.type = "button";
  overPanel.append(overTitle, overReason, againBtn);
  overlay.append(overPanel);
  againBtn.addEventListener("click", reset);

  stage.append(grid, confettiCanvas, overlay);

  // --- controls --------------------------------------------------------------
  const controls = el("div", "game-controls");
  const shuffleBtn = el("button", "btn btn-start", "SHUFFLE + RESTART");
  shuffleBtn.type = "button";
  const hint = el("p", "game-hint", "TWO FLIPS PER MOVE. THE ICONS ARE NOT SORRY.");
  controls.append(shuffleBtn, hint);
  shuffleBtn.addEventListener("click", reset);

  frame.append(hud, stage, controls);

  // --- clock -----------------------------------------------------------------
  function startClock() {
    if (startedAt !== null) return;
    startedAt = performance.now();
    clockTimer = setInterval(() => {
      timeStat.set(fmtTime(performance.now() - startedAt));
    }, 500);
  }

  function stopClock() {
    clearInterval(clockTimer);
    clockTimer = null;
  }

  // --- rendering helpers -------------------------------------------------------
  function paintCard(index) {
    const card = cards[index];
    const isUp = game.up.includes(index) || game.matched.includes(index);
    const isMatched = game.matched.includes(index);
    card.classList.toggle("is-flipped", isUp);
    card.classList.toggle("is-matched", isMatched);
    card.disabled = isMatched;
    card.setAttribute(
      "aria-label",
      isUp
        ? `Card ${index + 1}: ${game.deck[index]}${isMatched ? ", matched" : ""}`
        : `Card ${index + 1}, face down`,
    );
  }

  function paintAll() {
    for (let i = 0; i < cards.length; i += 1) paintCard(i);
  }

  // --- flow ----------------------------------------------------------------
  function flip(index) {
    if (locked) return;
    const { game: next, result } = flipCard(game, index);
    game = next;
    if (result === "ignore") return;

    startClock();
    paintCard(index);
    movesStat.set(game.moves);

    if (result === "mismatch") {
      const [a, b] = game.up;
      locked = true;
      document.dispatchEvent(
        new CustomEvent("voltage:whiff", { detail: { game: "memory" } }),
      );
      setTimeout(() => {
        cards[a].classList.add("is-wrong");
        cards[b].classList.add("is-wrong");
        setTimeout(() => {
          cards[a].classList.remove("is-wrong");
          cards[b].classList.remove("is-wrong");
          game = settle(game);
          paintCard(a);
          paintCard(b);
          locked = false;
        }, MISMATCH_HOLD_MS / 2);
      }, MISMATCH_HOLD_MS / 2);
    } else if (result === "match" || result === "win") {
      const matchedNow = game.matched.slice(-2);
      matchedNow.forEach(paintCard);
      document.dispatchEvent(
        new CustomEvent("voltage:hit", {
          detail: { game: "memory", points: 1 },
        }),
      );
      if (result === "win") win();
    }
  }

  function win() {
    stopClock();
    finalTimeMs = startedAt === null ? 0 : performance.now() - startedAt;
    timeStat.set(fmtTime(finalTimeMs));
    overReason.textContent = `${game.moves} MOVES — ${fmtTime(finalTimeMs)}`;
    overlay.hidden = false;
    confetti.burst();
    againBtn.focus({ preventScroll: true });
    document.dispatchEvent(
      new CustomEvent("voltage:gameover", {
        detail: { game: "memory", value: game.moves, timeMs: Math.round(finalTimeMs) },
      }),
    );
  }

  function reset() {
    locked = false;
    stopClock();
    startedAt = null;
    finalTimeMs = 0;
    overlay.hidden = true;
    movesStat.set(0);
    timeStat.set("0:00");
    game = createGame(createDeck());
    buildGrid();
  }

  window.__arcade = window.__arcade || {};
  window.__arcade.memory = {
    get game() {
      return game;
    },
    flip,
    reset,
  };
}
