// Web Audio blips. One lazy AudioContext (first user gesture), square-wave
// one-shots with a hard envelope, a different register per game, and a
// brutalist mute rocker that persists.

import { store } from "./storage.js";

const MUTE_KEY = "muted";

let ctx = null;
let muted = false;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

// One-shot blip. All juice sounds route through here.
export function blip({ freq = 440, dur = 0.09, type = "square", vol = 0.16, slide = 0 }) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
  }
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(30, freq), t0);
  if (slide > 0) {
    osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  }
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function chord(notes, gapMs, opts = {}) {
  notes.forEach((freq, i) => {
    setTimeout(() => blip({ freq, ...opts }), i * gapMs);
  });
}

// Per-game registers: whack lives low, memory mid, reflex high.
function onHit(event) {
  const { game, streak = 0 } = event.detail || {};
  if (game === "whack") {
    blip({ freq: 200 + Math.min(streak, 12) * 28, slide: 520, dur: 0.08 });
  } else if (game === "memory") {
    chord([440, 880], 70, { dur: 0.09 });
  } else if (game === "reflex") {
    blip({ freq: 900, type: "triangle", dur: 0.12, vol: 0.2 });
  }
}

function onWhiff(event) {
  const { game } = event.detail || {};
  blip({ freq: game === "reflex" ? 150 : 120, dur: 0.16, vol: 0.14 });
}

function onMiss() {
  blip({ freq: 90, dur: 0.2, vol: 0.2 });
}

function onGameOver(event) {
  const { game } = event.detail || {};
  if (game === "memory") {
    chord([523, 659, 784, 1046], 95, { dur: 0.14, vol: 0.18 });
  } else {
    chord([330, 220, 147], 110, { dur: 0.16, vol: 0.18 });
  }
}

export function initAudio() {
  muted = store.get(MUTE_KEY, false) === true;

  const switchBtn = document.getElementById("mute-switch");
  const stateLabel = switchBtn ? switchBtn.querySelector("[data-mute-state]") : null;

  function paint() {
    if (!switchBtn || !stateLabel) return;
    switchBtn.setAttribute("aria-pressed", String(muted));
    switchBtn.setAttribute(
      "aria-label",
      muted ? "Sound muted. Toggle to unmute." : "Sound on. Toggle to mute.",
    );
    stateLabel.textContent = muted ? "OFF" : "ON";
  }

  if (switchBtn) {
    switchBtn.addEventListener("click", () => {
      muted = !muted;
      store.set(MUTE_KEY, muted);
      paint();
      if (!muted) blip({ freq: 660, dur: 0.07 });
    });
  }
  paint();

  document.addEventListener("voltage:hit", onHit);
  document.addEventListener("voltage:whiff", onWhiff);
  document.addEventListener("voltage:miss", onMiss);
  document.addEventListener("voltage:gameover", onGameOver);

  window.__arcade = window.__arcade || {};
  window.__arcade.audio = {
    blip,
    isMuted: () => muted,
    setMuted(next) {
      muted = next === true;
      store.set(MUTE_KEY, muted);
      paint();
    },
  };
}
