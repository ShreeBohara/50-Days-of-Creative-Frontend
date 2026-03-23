"use strict";

/* ================================================================
   Day 06 — Matrix Rain with Hover Decode Effect
   ================================================================ */

/* ── Character pool ─────────────────────────────── */
const KATAKANA = Array.from({ length: 96 }, (_, i) =>
  String.fromCharCode(0x30a0 + i)
);
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS = "0123456789".split("");
const SYMBOLS = "!@#$%^&*+-=<>?".split("");
const CHAR_POOL = [...KATAKANA, ...LATIN, ...DIGITS, ...SYMBOLS];

function randomChar() {
  return CHAR_POOL[(Math.random() * CHAR_POOL.length) | 0];
}

/* ── Canvas ─────────────────────────────────────── */
const canvas = document.querySelector("[data-rain-canvas]");
const ctx = canvas.getContext("2d");

let CHAR_W = 16;
let CHAR_H = 20;
const MESSAGE = "THERE IS NO SPOON";
let DECODE_RADIUS = 100;
const DECODE_DURATION = 800;
const RE_ENCRYPT_DELAY = 3000;

/* ── State ──────────────────────────────────────── */
const state = {
  w: 0,
  h: 0,
  cols: 0,
  rows: 0,
  streams: [],
  msgSlots: [],
  mouseX: -9999,
  mouseY: -9999,
  lastMove: 0,
  lastFrame: 0,
  allDecoded: false,
  pulse: 0,
};

/* ── Stream (a single falling column of chars) ──── */
function createStream(col) {
  const speed = 1 + Math.random() * 3;
  const len = 6 + ((Math.random() * 25) | 0);
  return {
    col,
    y: -(Math.random() * state.rows * CHAR_H) - CHAR_H * 5,
    speed,
    len,
    chars: Array.from({ length: len + 5 }, () => randomChar()),
    mutateCD: 0,
  };
}

/* Multiple streams per column for density */
function initStreams() {
  state.streams = [];
  for (let c = 0; c < state.cols; c++) {
    const count = 2 + ((Math.random() * 2) | 0);
    for (let s = 0; s < count; s++) {
      const stream = createStream(c);
      stream.y -= s * (state.h / count + Math.random() * 100);
      state.streams.push(stream);
    }
  }
}

function computeMessage() {
  const startCol = Math.floor((state.cols - MESSAGE.length) / 2);
  const midRow = Math.floor(state.rows / 2);
  state.msgSlots = MESSAGE.split("").map((ch, i) => ({
    col: startCol + i,
    row: midRow,
    target: ch,
    decoded: ch === " ",
    progress: ch === " " ? 1 : 0,
    cycleChar: randomChar(),
    cycleCD: 0,
    flash: 0,
  }));
}

/* ── Re-encrypt state ───────────────────────────── */
let reEncQueue = [];
let reEncActive = false;

/* ── Resize ─────────────────────────────────────── */
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = innerWidth;
  const h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  CHAR_W = w < 600 ? 12 : 15;
  CHAR_H = CHAR_W * 1.3;
  DECODE_RADIUS = CHAR_W * 6;

  state.w = w;
  state.h = h;
  state.cols = Math.ceil(w / CHAR_W);
  state.rows = Math.ceil(h / CHAR_H);

  initStreams();
  computeMessage();
  reEncActive = false;
  reEncQueue = [];
}

resize();

let resizeTimer = 0;
const ro = new ResizeObserver(() => {
  cancelAnimationFrame(resizeTimer);
  resizeTimer = requestAnimationFrame(resize);
});
ro.observe(document.documentElement);

/* ── Input ──────────────────────────────────────── */
canvas.addEventListener("pointermove", (e) => {
  state.mouseX = e.clientX;
  state.mouseY = e.clientY;
  state.lastMove = performance.now();
});
canvas.addEventListener("pointerleave", () => {
  state.mouseX = -9999;
  state.mouseY = -9999;
});

/* ── Message slot lookup ────────────────────────── */
function slotAt(col, row) {
  for (const s of state.msgSlots) {
    if (s.col === col && s.row === row) return s;
  }
  return null;
}

/* ── Update ─────────────────────────────────────── */
function update(now, dt) {
  /* Advance streams */
  for (const s of state.streams) {
    s.y += s.speed;

    if (s.y - s.len * CHAR_H > state.h) {
      s.y = -(Math.random() * state.h * 0.5) - CHAR_H * 5;
      s.speed = 1 + Math.random() * 3;
      s.len = 6 + ((Math.random() * 25) | 0);
      s.chars = Array.from({ length: s.len + 5 }, () => randomChar());
    }

    s.mutateCD -= dt;
    if (s.mutateCD <= 0) {
      const idx = (Math.random() * s.chars.length) | 0;
      s.chars[idx] = randomChar();
      s.mutateCD = 60 + Math.random() * 80;
    }
  }

  /* Decode */
  for (const slot of state.msgSlots) {
    if (slot.target === " ") continue;

    const cx = slot.col * CHAR_W + CHAR_W / 2;
    const cy = slot.row * CHAR_H + CHAR_H / 2;
    const d = Math.hypot(state.mouseX - cx, state.mouseY - cy);

    if (d < DECODE_RADIUS && !slot.decoded && !reEncActive) {
      const ramp = 1 - (d / DECODE_RADIUS);
      slot.progress = Math.min(1, slot.progress + (dt / DECODE_DURATION) * (0.5 + ramp));

      const interval = 90 - slot.progress * 60;
      slot.cycleCD -= dt;
      if (slot.cycleCD <= 0) {
        slot.cycleChar = randomChar();
        slot.cycleCD = interval;
      }

      if (slot.progress >= 1) {
        slot.decoded = true;
        slot.cycleChar = slot.target;
        slot.flash = 1;
      }
    }
  }

  state.allDecoded = state.msgSlots
    .filter((s) => s.target !== " ")
    .every((s) => s.decoded);

  if (state.allDecoded) state.pulse += dt * 0.005;

  /* Re-encrypt check */
  const hasAny = state.msgSlots.some(
    (s) => s.target !== " " && (s.decoded || s.progress > 0)
  );

  if (hasAny && now - state.lastMove > RE_ENCRYPT_DELAY) {
    if (!reEncActive) {
      reEncQueue = state.msgSlots
        .filter((s) => s.target !== " " && (s.decoded || s.progress > 0))
        .map((s) => ({ slot: s, delay: Math.random() * 500 }))
        .sort((a, b) => a.delay - b.delay);
      reEncActive = true;
      state.allDecoded = false;
      state.pulse = 0;
    }

    let allDone = true;
    for (const item of reEncQueue) {
      item.delay -= dt;
      if (item.delay <= 0) {
        const s = item.slot;
        s.progress = Math.max(0, s.progress - dt / 400);
        s.cycleCD -= dt;
        if (s.cycleCD <= 0) {
          s.cycleChar = randomChar();
          s.cycleCD = 30;
        }
        if (s.progress <= 0) {
          s.decoded = false;
        } else {
          allDone = false;
        }
      } else {
        allDone = false;
      }
    }

    if (allDone) {
      reEncActive = false;
      reEncQueue = [];
    }
  }
}

/* ── Render ──────────────────────────────────────── */
function render(now) {
  const { w, h, streams, msgSlots } = state;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  ctx.font = `${CHAR_W}px 'Share Tech Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  /* Draw all streams */
  for (const s of streams) {
    const headY = s.y;
    const tailY = s.y - s.len * CHAR_H;

    for (let i = 0; i < s.len; i++) {
      const cy = headY - i * CHAR_H;
      if (cy < -CHAR_H || cy > h + CHAR_H) continue;

      const row = Math.round(cy / CHAR_H);
      const col = s.col;

      /* Check if this cell is a message slot */
      const slot = slotAt(col, row);

      if (slot && (slot.decoded || slot.progress > 0)) {
        /* Don't draw rain over actively decoding/decoded slots */
        continue;
      }

      const t = i / s.len;
      const x = col * CHAR_W + CHAR_W / 2;
      const ch = s.chars[i % s.chars.length];

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      if (i === 0) {
        /* Head — bright white with glow */
        ctx.shadowColor = "#00ff41";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#e0ffe0";
        ctx.fillText(ch, x, cy);
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      } else if (i < 3) {
        ctx.fillStyle = "#00ff41";
        ctx.fillText(ch, x, cy);
      } else {
        const alpha = Math.max(0, 1 - t * 1.2);
        if (alpha < 0.02) continue;
        const g = Math.round(60 + 195 * (1 - t));
        ctx.fillStyle = `rgba(0, ${g}, ${Math.round(g * 0.25)}, ${alpha.toFixed(2)})`;
        ctx.fillText(ch, x, cy);
      }
    }
  }

  /* Draw message slots */
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  for (const slot of msgSlots) {
    if (slot.target === " ") continue;

    const x = slot.col * CHAR_W + CHAR_W / 2;
    const y = slot.row * CHAR_H + CHAR_H / 2;

    if (slot.decoded) {
      const glow = state.allDecoded
        ? 20 + Math.sin(state.pulse) * 10
        : 14;
      ctx.shadowColor = "#00ff41";
      ctx.shadowBlur = glow;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(slot.target, x, y);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    } else if (slot.progress > 0) {
      const brightness = 0.3 + slot.progress * 0.7;
      ctx.shadowColor = "#00ff41";
      ctx.shadowBlur = slot.progress * 8;
      ctx.fillStyle = `rgba(0, 255, 65, ${brightness.toFixed(2)})`;
      ctx.fillText(slot.cycleChar, x, y);
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }
    /* When progress === 0: draw nothing — let rain pass through naturally */

    /* Lock-in flash */
    if (slot.flash > 0) {
      ctx.fillStyle = `rgba(0, 255, 65, ${(slot.flash * 0.5).toFixed(2)})`;
      const r = CHAR_W * (1 + slot.flash * 2);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(0, 255, 65, ${(slot.flash * 0.4).toFixed(2)})`);
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      slot.flash = Math.max(0, slot.flash - dt * 0.004);
    }
  }

  /* Scanlines */
  ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
  for (let y = 0; y < h; y += 2) {
    ctx.fillRect(0, y, w, 1);
  }

  /* Vignette */
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.9);
  vg.addColorStop(0, "transparent");
  vg.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

/* ── Loop ───────────────────────────────────────── */
let dt = 0;

function frame(now) {
  dt = state.lastFrame ? now - state.lastFrame : 16;
  if (dt > 100) dt = 16;
  state.lastFrame = now;

  update(now, dt);
  render(now);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
