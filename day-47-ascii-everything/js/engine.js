// engine — the whole trick in one file:
// draw the source small, read luminance per cell, print one character per cell.

const canvas = document.getElementById('ascii-canvas');
const ctx = canvas.getContext('2d');

// tiny offscreen canvas: one pixel per character cell
const sample = document.createElement('canvas');
const sctx = sample.getContext('2d', { willReadFrequently: true });

// JetBrains Mono advance width ≈ 0.6em; cells are therefore taller than wide,
// so the sample grid needs fewer rows than a square grid would use.
const CHAR_W_RATIO = 0.6;
const FONT_SIZE = 12;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

// ramps are ordered dense→sparse; on a dark screen, bright pixels get dense ink
export const settings = {
  cols: 120,
  ramp: '@%#*+=-:. ',
  colorMode: 'green', // green | amber | white | original | gameboy
  invert: false,
  contrast: 0, // -100 … 100
};

const MODE_COLORS = {
  green: '#4dff88',
  amber: '#ffb000',
  white: '#e8f0ea',
};

const GAMEBOY = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];

let source = null; // { drawable, width(), height(), tick?(t), mirror? }
let rafId = null;

// fps: rolling average over the last 30 frames
const frameTimes = [];
let lastFrameAt = 0;
let statsCallback = null;

export function onStats(cb) {
  statsCallback = cb;
}

export function setSource(next) {
  source = next;
}

export function getSource() {
  return source;
}

function gridSize() {
  const w = source.width();
  const h = source.height();
  if (!w || !h) return null;
  const cols = settings.cols;
  const rows = Math.max(2, Math.round(cols * (h / w) * CHAR_W_RATIO));
  return { cols, rows };
}

// classic contrast curve, c in [-100, 100] remapped to the 259-formula range
function contrastFactor() {
  const c = (settings.contrast / 100) * 128;
  return (259 * (c + 255)) / (255 * (259 - c));
}

function frame(now) {
  rafId = requestAnimationFrame(frame);
  if (!source) return;

  if (source.tick) source.tick(now);

  const grid = gridSize();
  if (!grid) return;
  const { cols, rows } = grid;

  // --- sample pass ---
  if (sample.width !== cols || sample.height !== rows) {
    sample.width = cols;
    sample.height = rows;
  }
  sctx.save();
  if (source.mirror) {
    sctx.translate(cols, 0);
    sctx.scale(-1, 1);
  }
  sctx.drawImage(source.drawable, 0, 0, cols, rows);
  sctx.restore();
  const pixels = sctx.getImageData(0, 0, cols, rows).data;

  // --- geometry ---
  const cellH = FONT_SIZE;
  const cellW = FONT_SIZE * CHAR_W_RATIO;
  const cssW = Math.round(cols * cellW);
  const cssH = Math.round(rows * cellH);
  if (canvas.width !== cssW * DPR || canvas.height !== cssH * DPR) {
    canvas.width = cssW * DPR;
    canvas.height = cssH * DPR;
  }

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`;
  ctx.textBaseline = 'top';

  const ramp = settings.ramp.length ? settings.ramp : '@ ';
  const steps = ramp.length - 1;
  const factor = contrastFactor();
  const perChar = settings.colorMode === 'original' || settings.colorMode === 'gameboy';

  if (!perChar) ctx.fillStyle = MODE_COLORS[settings.colorMode] || MODE_COLORS.green;

  for (let y = 0; y < rows; y++) {
    const rowBase = y * cols * 4;
    if (perChar) {
      for (let x = 0; x < cols; x++) {
        const i = rowBase + x * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        lum = Math.max(0, Math.min(255, factor * (lum - 128) + 128));
        if (settings.invert) lum = 255 - lum;
        const char = ramp[Math.round((1 - lum / 255) * steps)];
        if (char === ' ') continue;
        if (settings.colorMode === 'gameboy') {
          ctx.fillStyle = GAMEBOY[Math.min(3, (lum / 64) | 0)];
        } else {
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }
        ctx.fillText(char, x * cellW, y * cellH);
      }
    } else {
      // mono modes: build the row string once, draw once — the fast path
      let line = '';
      for (let x = 0; x < cols; x++) {
        const i = rowBase + x * 4;
        let lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        lum = Math.max(0, Math.min(255, factor * (lum - 128) + 128));
        if (settings.invert) lum = 255 - lum;
        line += ramp[Math.round((1 - lum / 255) * steps)];
      }
      ctx.fillText(line, 0, y * cellH);
    }
  }

  // --- stats ---
  if (lastFrameAt) {
    frameTimes.push(now - lastFrameAt);
    if (frameTimes.length > 30) frameTimes.shift();
  }
  lastFrameAt = now;
  if (statsCallback && frameTimes.length && (now | 0) % 500 < 17) {
    const avg = frameTimes.reduce((a, t) => a + t, 0) / frameTimes.length;
    statsCallback({ fps: Math.round(1000 / avg), cols, rows });
  }
}

export function start() {
  if (rafId === null) rafId = requestAnimationFrame(frame);
}

export function stop() {
  cancelAnimationFrame(rafId);
  rafId = null;
  lastFrameAt = 0;
  frameTimes.length = 0;
}

// the current frame as plain text — used by copy-as-text
export function getTextFrame() {
  if (!source) return '';
  const grid = gridSize();
  if (!grid) return '';
  const { cols, rows } = grid;
  const pixels = sctx.getImageData(0, 0, cols, rows).data;
  const ramp = settings.ramp.length ? settings.ramp : '@ ';
  const steps = ramp.length - 1;
  const factor = contrastFactor();
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      let lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      lum = Math.max(0, Math.min(255, factor * (lum - 128) + 128));
      if (settings.invert) lum = 255 - lum;
      line += ramp[Math.round((1 - lum / 255) * steps)];
    }
    lines.push(line);
  }
  return lines.join('\n');
}

export function getCanvas() {
  return canvas;
}
