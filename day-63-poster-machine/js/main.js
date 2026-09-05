// Poster Machine — boot. Waits for the display fonts (with a timeout so a
// blocked font never blanks the tool), wires the studio, and exposes a small
// headless controller on window.posterMachine for QA scripts.
import { createInitialState, reroll, canReroll, setSystem, setPalette, setText, setFinish, toggleLock, restore, snapshotOf } from "./state.js";
import { createPosterView } from "./posterView.js";
import { createAnnouncer } from "./dom.js";
import { DISPLAY_FAMILY, MONO_FAMILY } from "./text.js";

const $ = (selector) => document.querySelector(selector);
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let state = createInitialState();
const announce = createAnnouncer($("#live-region"));
const stageStatus = $("#stage-status");
const seedReadout = $("#seed-readout");
const rerollButton = $("#reroll-button");

const view = createPosterView({
  canvas: $("#poster"),
  ghost: $("#poster-ghost"),
  stage: $("#stage"),
  wrap: $("#poster-wrap"),
  reducedMotion: () => motionQuery.matches,
});

/* Until the seed-code commit lands, the readout shows the raw layout seed. */
function codeOf(current) {
  return current.layoutSeed.toString(16).toUpperCase().padStart(5, "0");
}

function syncUi() {
  seedReadout.textContent = codeOf(state);
  rerollButton.disabled = !canReroll(state);
  stageStatus.textContent = `${state.system} · ${state.layoutSeed}`;
}

/** Applies a new state; `fade` crossfades from the previous poster. */
function apply(next, { fade = false } = {}) {
  if (next === state) return;
  state = next;
  if (fade) view.crossfade(state, codeOf(state));
  else view.render(state, codeOf(state));
  syncUi();
}

function doReroll() {
  if (!canReroll(state)) {
    announce("Both locks are on — unlock palette or layout to reroll.");
    return;
  }
  apply(reroll(state), { fade: true });
}

function isTypingTarget(target) {
  return target instanceof Element
    && Boolean(target.closest("input, textarea, select, button, [contenteditable]"));
}

async function waitForFonts() {
  if (!document.fonts || typeof document.fonts.load !== "function") return;
  const loads = Promise.all([
    document.fonts.load(`900 100px ${DISPLAY_FAMILY}`),
    document.fonts.load(`700 100px ${DISPLAY_FAMILY}`),
    document.fonts.load(`500 16px ${MONO_FAMILY}`),
  ]);
  await Promise.race([loads, new Promise((resolve) => setTimeout(resolve, 2000))]);
}

async function boot() {
  document.documentElement.dataset.js = "ready";
  await waitForFonts();
  view.measure();
  view.render(state, codeOf(state));
  syncUi();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => view.rerender());
  }

  rerollButton.addEventListener("click", doReroll);
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat || isTypingTarget(event.target)) return;
    event.preventDefault();
    doReroll();
  });

  /* Headless QA controller — drives the same functions the UI uses. */
  window.posterMachine = {
    version: "day-63",
    state: () => snapshotOf(state),
    code: () => codeOf(state),
    reroll: () => doReroll(),
    setSystem: (id) => apply(setSystem(state, id)),
    setPalette: (palette) => apply(setPalette(state, palette)),
    setText: (patch) => apply(setText(state, patch)),
    setFinish: (patch) => apply(setFinish(state, patch)),
    lock: (which) => apply(toggleLock(state, which)),
    restore: (snapshot) => apply(restore(state, snapshot)),
    renderSync: () => view.rerender(),
    size: () => view.size,
    canvas: () => view.canvas,
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
