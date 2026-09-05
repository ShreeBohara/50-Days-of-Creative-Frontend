// Poster Machine — boot. Waits for the display fonts (with a timeout so a
// blocked font never blanks the tool), wires the studio, and exposes a small
// headless controller on window.posterMachine for QA scripts.
import { createInitialState, reroll, canReroll, setSystem, setPalette, setText, setFinish, toggleLock, restore, snapshotOf } from "./state.js";
import { createPosterView } from "./posterView.js";
import { createAnnouncer } from "./dom.js";
import { DISPLAY_FAMILY, MONO_FAMILY } from "./text.js";
import { resolvePalette } from "./palettes.js";
import { mountPaletteControls } from "./paletteControls.js";
import { mountFinishControls } from "./finishControls.js";
import { mountTextControls } from "./textControls.js";
import { mountSystemPicker } from "./systemPicker.js";
import { mountRerollControls } from "./rerollControls.js";
import { mountSeedControls } from "./seedControls.js";
import { encodeCode, decodeCode } from "./seedCode.js";
import { mountExportControls } from "./exportControls.js";
import { exportBlob, renderExportCanvas } from "./exportPng.js";
import { mountGallery } from "./gallery.js";

const $ = (selector) => document.querySelector(selector);
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let state = createInitialState();
const announce = createAnnouncer($("#live-region"));
const stageStatus = $("#stage-status");
const rerollButton = $("#reroll-button");

const view = createPosterView({
  canvas: $("#poster"),
  ghost: $("#poster-ghost"),
  stage: $("#stage"),
  wrap: $("#poster-wrap"),
  reducedMotion: () => motionQuery.matches,
});

const gallery = mountGallery({
  container: $("#gallery-mount"),
  emptyEl: $("#gallery-empty"),
  onRestore: (snapshot) => apply(restore(state, snapshot), { fade: true }),
  announce,
});

/* Panel sections. Each mount gets `update(updater)` and reports back via sync(state). */
const systemPicker = mountSystemPicker({ container: $("#system-mount"), nameEl: $("#system-name"), onChange: update, announce });
const sections = [
  mountSeedControls({ container: $("#seed-mount"), onChange: update, announce }),
  mountRerollControls({
    button: rerollButton, locksContainer: $("#locks-mount"), hintEl: $("#seed-hint"),
    onReroll: doReroll, onChange: update, announce,
  }),
  mountTextControls({ container: $("#text-mount"), onChange: update }),
  systemPicker,
  mountPaletteControls({ container: $("#palette-mount"), nameEl: $("#palette-name"), onChange: update, announce }),
  mountFinishControls({ container: $("#finish-mount"), onChange: update }),
  mountExportControls({
    container: $("#export-mount"), getState: () => state, getCode: () => codeOf(state), announce,
  }),
];

const codeOf = encodeCode;

function syncUi() {
  rerollButton.disabled = !canReroll(state);
  stageStatus.textContent = codeOf(state);
  for (const section of sections) section.sync(state);
  gallery.sync(state, codeOf(state));
  const hash = `#${codeOf(state)}`;
  if (window.location.hash !== hash) window.history.replaceState(null, "", hash);
}

/** A valid code in the URL hash restores that poster before the first paint. */
function stateFromHash(base) {
  const result = decodeCode(window.location.hash.slice(1));
  return result.ok ? restore(base, result) : base;
}

/** Applies a new state; `fade` crossfades from the previous poster. */
function apply(next, { fade = false } = {}) {
  if (next === state) return;
  state = next;
  if (fade) view.crossfade(state, codeOf(state));
  else view.render(state, codeOf(state));
  syncUi();
}

/** Applies `updater(state)`; the shape every control uses. */
function update(updater, options) {
  apply(updater(state), options);
}

function doReroll() {
  if (!canReroll(state)) {
    announce("Both locks are on — unlock palette or layout to reroll.");
    return;
  }
  apply(reroll(state), { fade: true });
  gallery.push({ code: codeOf(state), snapshot: snapshotOf(state) });
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
  state = stateFromHash(state);
  await waitForFonts();
  view.measure();
  view.render(state, codeOf(state));
  syncUi();
  systemPicker.renderNow(state);
  gallery.push({ code: codeOf(state), snapshot: snapshotOf(state) });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      view.rerender();
      systemPicker.renderNow(state);
    });
  }

  /* Headless QA controller — drives the same functions the UI uses. */
  window.posterMachine = {
    version: "day-63",
    state: () => snapshotOf(state),
    code: () => codeOf(state),
    setCode: (code) => {
      const result = decodeCode(code);
      if (result.ok) apply(restore(state, result));
      return result.ok;
    },
    reroll: () => doReroll(),
    setSystem: (id) => apply(setSystem(state, id)),
    setPalette: (palette) => apply(setPalette(state, palette)),
    setText: (patch) => apply(setText(state, patch)),
    setFinish: (patch) => apply(setFinish(state, patch)),
    palette: () => resolvePalette(state.palette),
    lock: (which) => apply(toggleLock(state, which)),
    restore: (snapshot) => apply(restore(state, snapshot)),
    renderSync: () => view.rerender(),
    history: () => gallery.entries(),
    exportBlob: () => exportBlob(state, { code: codeOf(state) }),
    exportCanvas: (width = 2400) => renderExportCanvas(state, {
      code: codeOf(state), width, height: Math.round((width * 4) / 3),
    }),
    size: () => view.size,
    canvas: () => view.canvas,
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
