'use strict';
/* =============================================================
   Day 14 — Retro Terminal Portfolio
   script.js
   ============================================================= */

/* ── DOM Refs ─────────────────────────────────────────────── */
const $ = id => document.querySelector(id);
const OUTPUT   = $('[data-output]');
const CMD_INPUT = $('[data-cmd-input]');
const MUTE_BTN = $('[data-mute-btn]');
const MUTE_ICON = $('[data-mute-icon]');

/* ── Typing Speeds ───────────────────────────────────────── */
const SPEED_FAST   = 12;   // ms per char
const SPEED_NORMAL = 25;
const SPEED_SLOW   = 50;

/* ── Reduced-motion detection ────────────────────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Audio ──────────────────────────────────────────────── */
let muted = false;
let audioCtx = null;

function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playKeyClick() {
  if (muted) return;
  try {
    const ctx = ensureAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
    osc.type = 'square';
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (_) { /* ignore audio errors */ }
}

MUTE_BTN.addEventListener('click', () => {
  muted = !muted;
  MUTE_ICON.textContent = muted ? '♪̶' : '♪';
  MUTE_BTN.title = muted ? 'Unmute' : 'Mute';
});

/* ── Typing Engine ───────────────────────────────────────── */

/**
 * Type text character-by-character into an element.
 * Returns a Promise that resolves when done.
 */
function typeText(el, text, speed = SPEED_NORMAL) {
  return new Promise(resolve => {
    if (prefersReducedMotion) {
      el.textContent = text;
      scrollToBottom();
      resolve();
      return;
    }
    let i = 0;
    function step() {
      if (i < text.length) {
        el.textContent += text[i];
        if (i % 2 === 0) playKeyClick();
        scrollToBottom();
        i++;
        setTimeout(step, speed + (Math.random() * speed * 0.4 - speed * 0.2));
      } else {
        resolve();
      }
    }
    step();
  });
}

/**
 * Append a new line to output and optionally type text into it.
 */
function printLine(text = '', className = '', speed = SPEED_NORMAL) {
  const el = document.createElement('div');
  el.className = 'line' + (className ? ' ' + className : '');
  OUTPUT.appendChild(el);
  scrollToBottom();
  if (text === '') return Promise.resolve();
  return typeText(el, text, speed);
}

/**
 * Append multiple lines sequentially with optional inter-line delay.
 */
async function printLines(lines, speed = SPEED_NORMAL, interDelay = 0) {
  for (const { text = '', cls = '' } of lines) {
    await printLine(text, cls, speed);
    if (interDelay) await sleep(interDelay);
  }
}

/**
 * Append raw HTML immediately (no typing — for pre-rendered blocks).
 */
function printRaw(html, className = '') {
  const el = document.createElement('div');
  el.className = 'line' + (className ? ' ' + className : '');
  el.innerHTML = html;
  OUTPUT.appendChild(el);
  scrollToBottom();
  return Promise.resolve();
}

/**
 * Print a blank spacer line.
 */
function printBlank() {
  const el = document.createElement('div');
  el.className = 'line line--blank';
  OUTPUT.appendChild(el);
  scrollToBottom();
  return Promise.resolve();
}

/* ── Utilities ───────────────────────────────────────────── */
function scrollToBottom() {
  OUTPUT.scrollTop = OUTPUT.scrollHeight;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
