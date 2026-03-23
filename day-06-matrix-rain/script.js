"use strict";

/* Day 06 — Matrix Rain with Hover Decode Effect */

/* ── Character pool ─────────────────────────────── */
const KATAKANA = Array.from({ length: 96 }, (_, i) =>
  String.fromCharCode(0x30a0 + i)
);
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS = "0123456789".split("");
const SYMBOLS = "!@#$%^&*()+-=[]{}|;:<>?".split("");
const CHAR_POOL = [...KATAKANA, ...LATIN, ...DIGITS, ...SYMBOLS];

function randomChar() {
  return CHAR_POOL[(Math.random() * CHAR_POOL.length) | 0];
}

/* ── Canvas setup ───────────────────────────────── */
const canvas = document.querySelector("[data-rain-canvas]");
const ctx = canvas.getContext("2d");

const CHAR_SIZE = 16;

const state = {
  width: 0,
  height: 0,
  numCols: 0,
  numRows: 0,
  columns: [],
};

function createColumn(x) {
  const speed = 0.3 + Math.random() * 0.9;
  const length = 8 + ((Math.random() * 20) | 0);
  return {
    x,
    dropY: -(Math.random() * 40),
    speed,
    length,
    chars: Array.from({ length: 60 }, () => randomChar()),
    lastMutate: 0,
  };
}

function initColumns() {
  state.columns = [];
  for (let i = 0; i < state.numCols; i++) {
    state.columns.push(createColumn(i));
  }
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.width = w;
  state.height = h;
  state.numCols = Math.ceil(w / CHAR_SIZE);
  state.numRows = Math.ceil(h / CHAR_SIZE);

  initColumns();
}

resizeCanvas();

const ro = new ResizeObserver(() => resizeCanvas());
ro.observe(document.documentElement);

/* ── Update & Render ────────────────────────────── */
function updateColumns(now) {
  for (const col of state.columns) {
    col.dropY += col.speed;

    if (col.dropY - col.length > state.numRows) {
      col.dropY = -(Math.random() * 20);
      col.speed = 0.3 + Math.random() * 0.9;
      col.length = 8 + ((Math.random() * 20) | 0);
    }

    if (now - col.lastMutate > 80 + Math.random() * 60) {
      const idx = (Math.random() * col.chars.length) | 0;
      col.chars[idx] = randomChar();
      col.lastMutate = now;
    }
  }
}

function renderFrame(now) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.font = CHAR_SIZE + "px 'Share Tech Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const col of state.columns) {
    const headRow = col.dropY | 0;

    for (let row = headRow - col.length; row <= headRow; row++) {
      if (row < 0 || row >= state.numRows) continue;

      const x = col.x * CHAR_SIZE + CHAR_SIZE / 2;
      const y = row * CHAR_SIZE + CHAR_SIZE / 2;
      const ch = col.chars[((row % col.chars.length) + col.chars.length) % col.chars.length];

      ctx.fillStyle = "#00ff41";
      ctx.fillText(ch, x, y);
    }
  }

  requestAnimationFrame(renderFrame);
}

requestAnimationFrame(renderFrame);
