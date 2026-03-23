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

const MESSAGE = "THERE IS NO SPOON";

const DECODE_RADIUS = CHAR_SIZE * 5;
const DECODE_DURATION = 600;

const state = {
  width: 0,
  height: 0,
  numCols: 0,
  numRows: 0,
  columns: [],
  messageSlots: [],
  mouseX: -9999,
  mouseY: -9999,
  mouseActive: false,
  mouseLastMoveTime: 0,
  lastFrameTime: 0,
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

function computeMessageSlots() {
  const startCol = Math.floor((state.numCols - MESSAGE.length) / 2);
  const midRow = Math.floor(state.numRows / 2);

  state.messageSlots = MESSAGE.split("").map((char, i) => ({
    col: startCol + i,
    row: midRow,
    targetChar: char,
    decoded: char === " ",
    decodeProgress: char === " " ? 1 : 0,
    cycleChar: randomChar(),
    cycleTimer: 0,
    glowIntensity: 0,
    flashAlpha: 0,
  }));
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
  computeMessageSlots();
}

resizeCanvas();

const ro = new ResizeObserver(() => resizeCanvas());
ro.observe(document.documentElement);

/* ── Mouse tracking ─────────────────────────────── */
canvas.addEventListener("pointermove", (e) => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  state.mouseActive = true;
  state.mouseLastMoveTime = performance.now();
});

canvas.addEventListener("pointerleave", () => {
  state.mouseActive = false;
  state.mouseX = -9999;
  state.mouseY = -9999;
});

/* ── Decode logic ───────────────────────────────── */
function updateDecode(now, dt) {
  for (const slot of state.messageSlots) {
    if (slot.targetChar === " ") continue;

    const cx = slot.col * CHAR_SIZE + CHAR_SIZE / 2;
    const cy = slot.row * CHAR_SIZE + CHAR_SIZE / 2;
    const dist = Math.hypot(state.mouseX - cx, state.mouseY - cy);

    if (dist < DECODE_RADIUS && !slot.decoded) {
      slot.decodeProgress = Math.min(1, slot.decodeProgress + dt / DECODE_DURATION);

      /* Cycle chars — accelerate as progress grows */
      const interval = 80 - slot.decodeProgress * 50;
      slot.cycleTimer += dt;
      if (slot.cycleTimer > interval) {
        slot.cycleChar = randomChar();
        slot.cycleTimer = 0;
      }

      if (slot.decodeProgress >= 1) {
        slot.decoded = true;
        slot.cycleChar = slot.targetChar;
        slot.flashAlpha = 0.4;
      }
    }
  }
}

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

function getTrailColor(brightness) {
  if (brightness > 0.95) return "#ffffff";
  if (brightness > 0.85) return "#cfffcf";
  if (brightness > 0.6) return "#00ff41";
  if (brightness > 0.3) return "rgba(0, 204, 51, " + brightness.toFixed(2) + ")";
  return "rgba(0, 59, 0, " + (brightness * 1.5).toFixed(2) + ")";
}

/* Build a set of message-slot grid keys for fast lookup */
function buildMessageGrid() {
  const grid = new Set();
  for (const slot of state.messageSlots) {
    grid.add(slot.col + "," + slot.row);
  }
  return grid;
}

function renderFrame(now) {
  const dt = state.lastFrameTime ? now - state.lastFrameTime : 16;
  state.lastFrameTime = now;

  updateColumns(now);
  updateDecode(now, dt);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.font = CHAR_SIZE + "px 'Share Tech Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  const msgGrid = buildMessageGrid();

  /* Draw rain columns — skip message slot positions */
  for (const col of state.columns) {
    const headRow = col.dropY | 0;

    for (let row = headRow - col.length; row <= headRow; row++) {
      if (row < 0 || row >= state.numRows) continue;
      if (msgGrid.has(col.x + "," + row)) continue;

      const dist = col.dropY - row;
      const brightness = 1.0 - dist / col.length;

      const x = col.x * CHAR_SIZE + CHAR_SIZE / 2;
      const y = row * CHAR_SIZE + CHAR_SIZE / 2;
      const ch = col.chars[((row % col.chars.length) + col.chars.length) % col.chars.length];

      if (dist < 1) {
        ctx.shadowColor = "#00ff41";
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = getTrailColor(brightness);
      ctx.fillText(ch, x, y);
    }
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  /* Draw message slots */
  for (const slot of state.messageSlots) {
    if (slot.targetChar === " ") continue;

    const x = slot.col * CHAR_SIZE + CHAR_SIZE / 2;
    const y = slot.row * CHAR_SIZE + CHAR_SIZE / 2;

    if (slot.decoded) {
      ctx.fillStyle = "#ffffff";
      ctx.fillText(slot.targetChar, x, y);
    } else if (slot.decodeProgress > 0) {
      ctx.fillStyle = "#00ff41";
      ctx.fillText(slot.cycleChar, x, y);
    } else {
      /* Show as normal rain char */
      ctx.fillStyle = "rgba(0, 204, 51, 0.4)";
      ctx.fillText(randomChar(), x, y);
    }

    /* Flash on lock-in */
    if (slot.flashAlpha > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, " + slot.flashAlpha.toFixed(2) + ")";
      ctx.fillRect(
        slot.col * CHAR_SIZE, slot.row * CHAR_SIZE,
        CHAR_SIZE, CHAR_SIZE
      );
      slot.flashAlpha = Math.max(0, slot.flashAlpha - dt * 0.003);
    }
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  requestAnimationFrame(renderFrame);
}

requestAnimationFrame(renderFrame);
