// Taunt marquee. Two identical runs scroll -50%; duplicate run is
// aria-hidden. WCAG 2.2.2: pause button + reduced-motion handled in CSS.

import { getScores } from "./storage.js";

const TAUNTS = [
  "DRINK VOLTAGE. APOLOGIZE LATER.",
  "NO CURVES. NO MERCY. NO ROUNDED CORNERS.",
  "SIDE EFFECTS: WINNING, VIBRATING, TYPING IN CAPS",
  "WARNING: DIVS MAY FIGHT BACK",
  "YOUR MOUSE CALLED. IT WANTS A RAISE.",
  "CAFFEINE IS A FOOD GROUP NOW",
];

function fmtInitials(entry) {
  return entry && entry.initials ? ` (${entry.initials})` : "";
}

export function scoreLines(scores) {
  const lines = [];
  lines.push(
    scores.whack
      ? `WHACK HIGH SCORE: ${scores.whack.value}${fmtInitials(scores.whack)} — CAN YOU EVEN?`
      : "WHACK HIGH SCORE: 0 — NOBODY DARES",
  );
  lines.push(
    scores.reflex
      ? `REFLEX BEST: ${scores.reflex.value}MS${fmtInitials(scores.reflex)} — BLINK AND LOSE`
      : "REFLEX BEST: UNCLAIMED. SUSPICIOUS.",
  );
  lines.push(
    scores.memory
      ? `MEMORY BEST: ${scores.memory.value} MOVES${fmtInitials(scores.memory)} — UNFORGETTABLE`
      : "MEMORY BEST: FORGOTTEN. FITTING.",
  );
  return lines;
}

function interleave(lines) {
  const out = [];
  const max = Math.max(lines.length, TAUNTS.length);
  for (let i = 0; i < max; i += 1) {
    if (i < lines.length) out.push(lines[i]);
    if (i < TAUNTS.length) out.push(TAUNTS[i]);
  }
  return out;
}

function buildRun(items, hidden) {
  const run = document.createElement("span");
  run.className = "ticker-run";
  if (hidden) run.setAttribute("aria-hidden", "true");
  items.forEach((text) => {
    const item = document.createElement("span");
    item.className = "ticker-item";
    item.textContent = text;
    const sep = document.createElement("span");
    sep.className = "ticker-sep";
    sep.setAttribute("aria-hidden", "true");
    sep.textContent = "⚡";
    run.append(item, sep);
  });
  return run;
}

export function initTicker() {
  const viewport = document.getElementById("ticker-viewport");
  const pauseBtn = document.getElementById("ticker-pause");
  if (!viewport || !pauseBtn) return;

  const track = document.createElement("div");
  track.className = "ticker-track";
  viewport.append(track);

  function setDuration() {
    const run = track.firstElementChild;
    if (!run) return;
    const width = run.getBoundingClientRect().width;
    if (width > 0) {
      const secs = Math.min(60, Math.max(18, width / 110));
      track.style.setProperty("--ticker-duration", `${secs.toFixed(1)}s`);
    }
  }

  function rebuild() {
    const items = interleave(scoreLines(getScores()));
    track.replaceChildren(buildRun(items, false), buildRun(items, true));
    setDuration();
  }

  pauseBtn.addEventListener("click", () => {
    const paused = pauseBtn.getAttribute("aria-pressed") === "true";
    pauseBtn.setAttribute("aria-pressed", String(!paused));
    pauseBtn.setAttribute(
      "aria-label",
      paused ? "Pause scrolling ticker" : "Resume scrolling ticker",
    );
    pauseBtn.textContent = paused ? "⏸" : "▶";
    track.classList.toggle("is-paused", !paused);
  });

  document.addEventListener("voltage:scores", rebuild);
  window.addEventListener("resize", setDuration);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setDuration).catch(() => {});
  }

  rebuild();
  window.__arcade = window.__arcade || {};
  window.__arcade.ticker = { rebuild };
}
