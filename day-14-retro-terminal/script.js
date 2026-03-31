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

/* ── Boot Sequence ───────────────────────────────────────── */

const ASCII_LOGO = `
 ██████╗  ██████╗ ██████╗ ████████╗
 ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝
 ██████╔╝██║   ██║██████╔╝   ██║
 ██╔═══╝ ██║   ██║██╔══██╗   ██║
 ██║     ╚██████╔╝██║  ██║   ██║
 ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝
`.trim();

const BOOT_MESSAGES = [
  { text: 'BIOS v2.4.1 — POST complete. Memory check: 640K OK', cls: 'line--dim' },
  { text: 'Loading kernel modules.................... done', cls: 'line--dim' },
  { text: 'Mounting filesystem........................ done', cls: 'line--dim' },
  { text: 'Initializing display driver................ done', cls: 'line--dim' },
  { text: '' },
  { text: 'Starting PORTFOLIO.EXE...', cls: '' },
];

async function runBootSequence() {
  CMD_INPUT.disabled = true;

  // Print ASCII logo instantly
  await printRaw(ASCII_LOGO.replace(/\n/g, '<br>'), 'line--ascii');
  await sleep(300);

  // Print subtitle
  await printLine('[ Retro Terminal Portfolio — Interactive CLI ]', 'line--dim', SPEED_FAST);
  await printBlank();
  await sleep(200);

  // Print boot messages
  for (const { text, cls = '' } of BOOT_MESSAGES) {
    if (text === '') {
      await printBlank();
      await sleep(100);
    } else {
      await printLine(text, cls, SPEED_FAST);
      await sleep(prefersReducedMotion ? 0 : 80);
    }
  }

  await sleep(300);
  await printLine('System initialized.', '', SPEED_NORMAL);
  await printBlank();
  await printLine("Type 'help' to see available commands.", 'line--dim', SPEED_NORMAL);
  await printBlank();

  // Enable input
  CMD_INPUT.disabled = false;
  CMD_INPUT.focus();
}

document.addEventListener('DOMContentLoaded', runBootSequence);

/* ── Command Parser ──────────────────────────────────────── */

// Registry: cmd name → async handler function
const COMMANDS = {};

/** Register a command handler */
function registerCommand(name, handler) {
  COMMANDS[name] = handler;
}

/** Parse and dispatch a raw input string */
async function parseCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  // Echo the typed command back in dim style
  await printLine('> ' + trimmed, 'line--cmd');

  const parts = trimmed.split(/\s+/);
  const cmd   = parts[0].toLowerCase();
  const args  = parts.slice(1);

  if (COMMANDS[cmd]) {
    await COMMANDS[cmd](args);
  } else {
    await printLine(`bash: ${cmd}: command not found`, 'line--error', SPEED_FAST);
    await printLine("Type 'help' to see available commands.", 'line--dim', SPEED_FAST);
  }

  await printBlank();
}

/* ── Input Listener ──────────────────────────────────────── */

CMD_INPUT.addEventListener('keydown', async e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = CMD_INPUT.value;
    CMD_INPUT.value = '';
    CMD_INPUT.disabled = true;
    await parseCommand(val);
    CMD_INPUT.disabled = false;
    CMD_INPUT.focus();
  }
});

/* ── Commands Implementation ─────────────────────────────── */

// ── help ──────────────────────────────────────────────────
registerCommand('help', async () => {
  const cmds = [
    ['help',           'Show this help message'],
    ['about',          'Who am I — background & bio'],
    ['skills',         'Tech skills with ASCII progress bars'],
    ['projects',       'Featured projects I have shipped'],
    ['contact',        'How to reach me'],
    ['whoami',         'Current user info'],
    ['clear',          'Clear the terminal'],
    ['theme [color]',  'Switch color theme: green | amber | blue | white'],
    ['matrix',         'Easter egg — you\'ll see'],
  ];

  await printLine('Available commands:', 'line--heading', SPEED_FAST);
  await printBlank();
  for (const [name, desc] of cmds) {
    const padded = name.padEnd(22, ' ');
    await printLine(`  ${padded}${desc}`, '', SPEED_FAST);
  }
});

// ── about ─────────────────────────────────────────────────
registerCommand('about', async () => {
  await printLine('// ABOUT ME', 'line--heading', SPEED_FAST);
  await printBlank();
  await printLine("Hi — I'm a creative frontend developer obsessed with", '', SPEED_NORMAL);
  await printLine('interfaces that feel alive. I build things that live', '', SPEED_NORMAL);
  await printLine("at the edge of design and engineering: motion, depth,", '', SPEED_NORMAL);
  await printLine('interaction, and personality baked into every pixel.', '', SPEED_NORMAL);
  await printBlank();
  await printLine('Currently building 50 days of creative frontend experiments.', 'line--dim', SPEED_NORMAL);
  await printLine('Each day: one idea, one afternoon, shipped.', 'line--dim', SPEED_NORMAL);
});

// ── whoami ────────────────────────────────────────────────
registerCommand('whoami', async () => {
  await printLine('guest@portfolio.exe — Day 14 / 50', '', SPEED_NORMAL);
  await printLine('Role: Creative Frontend Developer', 'line--dim', SPEED_FAST);
});

// ── skills ────────────────────────────────────────────────
function buildBar(pct) {
  const total = 10;
  const filled = Math.round(pct / 10);
  return '[' + '█'.repeat(filled) + '░'.repeat(total - filled) + ']  ' + pct + '%';
}

registerCommand('skills', async () => {
  const skills = [
    ['JavaScript',  92],
    ['CSS / Design', 90],
    ['React',       82],
    ['TypeScript',  78],
    ['Node.js',     72],
    ['Three.js',    68],
    ['WebGL / GLSL',58],
    ['Figma',       75],
  ];

  await printLine('// SKILLS', 'line--heading', SPEED_FAST);
  await printBlank();
  for (const [name, pct] of skills) {
    const label = name.padEnd(16, ' ');
    await printLine(`  ${label}${buildBar(pct)}`, '', SPEED_FAST);
  }
});

// ── projects ──────────────────────────────────────────────
registerCommand('projects', async () => {
  const projects = [
    {
      name: '50 Days of Creative Frontend',
      tech: 'Vanilla JS, Canvas, WebGL, Three.js, React',
      desc: 'A daily creative frontend challenge — one experiment per day for 50 days.',
      link: 'github.com/ShreeBohara/50-Days-of-Creative-Frontend',
    },
    {
      name: 'Fluid Simulation',
      tech: 'WebGL 2, GLSL, Navier-Stokes',
      desc: 'GPU-accelerated fluid dynamics entirely in a browser WebGL2 fragment shader.',
      link: 'day-07-fluid-simulation',
    },
    {
      name: 'Cinematic Solar System',
      tech: 'React, Three.js, React Three Fiber',
      desc: 'Orbital 3D solar system with guided camera chapters and shader planets.',
      link: 'day-03-solar-system',
    },
  ];

  await printLine('// PROJECTS', 'line--heading', SPEED_FAST);

  for (const { name, tech, desc, link } of projects) {
    await printBlank();
    await printLine(`  ► ${name}`, '', SPEED_FAST);
    await printLine(`    Tech:  ${tech}`, 'line--dim', SPEED_FAST);
    await printLine(`    About: ${desc}`, 'line--dim', SPEED_FAST);
    await printLine(`    URL:   ${link}`, 'line--dim', SPEED_FAST);
  }
});

// ── contact ───────────────────────────────────────────────
registerCommand('contact', async () => {
  await printLine('// CONTACT', 'line--heading', SPEED_FAST);
  await printBlank();
  await printLine('  GitHub   →  github.com/ShreeBohara', '', SPEED_FAST);
  await printLine('  Email    →  shree@example.com', '', SPEED_FAST);
  await printLine('  LinkedIn →  linkedin.com/in/shreebohara', '', SPEED_FAST);
  await printBlank();
  await printLine("  Open to interesting projects & collaborations.", 'line--dim', SPEED_FAST);
});

// ── clear ─────────────────────────────────────────────────
registerCommand('clear', async () => {
  OUTPUT.innerHTML = '';
});
