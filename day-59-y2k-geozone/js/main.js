import { createStore } from "./storage.js";
import { createSparkleTrail } from "./sparkles.js";
import { initStickers } from "./stickers.js";
import { createOdometer } from "./odometer.js";
import { initGuestbook } from "./guestbook.js";
import { initWindows } from "./windows.js";
import { createMusicToggle } from "./music.js";
import { initVisitorMap } from "./visitorMap.js";

const store = createStore();
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(pointer: fine)");

const app = {
  store,
  sparkles: null,
  get reducedMotion() {
    return reducedMotionQuery.matches;
  },
};

const HIT_SEED = 4207;

const counterRoot = document.querySelector("[data-hit-counter]");
if (counterRoot) {
  const previous = store.getJSON("hits", HIT_SEED);
  const next = previous + 1;
  store.setJSON("hits", next);
  const odometer = createOdometer(counterRoot, { width: 6 });
  const label = document.querySelector("[data-hit-counter-label]");
  if (label) label.textContent = `You are visitor number ${next}`;
  if (app.reducedMotion) {
    odometer.setValue(next, { animate: false });
  } else {
    odometer.setValue(previous, { animate: false });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => odometer.setValue(next));
    });
  }
  app.odometer = odometer;
}

const guestbookForm = document.querySelector("[data-guestbook-form]");
const guestbookEntries = document.querySelector("[data-guestbook-entries]");
if (guestbookForm && guestbookEntries) {
  app.guestbook = initGuestbook({
    form: guestbookForm,
    tbody: guestbookEntries,
    statusEl: document.querySelector("[data-guestbook-status]"),
    store,
  });
}

const onlineCount = document.querySelector("[data-online-count]");
if (onlineCount) {
  app.visitorMap = initVisitorMap({ countEl: onlineCount });
}

const musicButton = document.querySelector("[data-music-toggle]");
if (musicButton) {
  app.music = createMusicToggle(musicButton);
}

const taskbarButtons = document.querySelector("[data-taskbar-buttons]");
const winElements = [...document.querySelectorAll(".win")];
if (taskbarButtons && winElements.length) {
  app.windows = initWindows({
    windows: winElements,
    taskbarButtons,
    reducedMotion: () => app.reducedMotion,
  });
  for (const opener of document.querySelectorAll("[data-win-open]")) {
    opener.addEventListener("click", () => app.windows.open(opener.dataset.winOpen));
  }
}

const stickerLayer = document.querySelector(".sticker-layer");
if (stickerLayer) {
  app.stickers = initStickers({ layer: stickerLayer, store });
}

function motionAllowed() {
  return !app.reducedMotion && !document.documentElement.classList.contains("motion-paused");
}

const sparkleCanvas = document.querySelector(".sparkle-canvas");
if (sparkleCanvas && finePointerQuery.matches) {
  app.sparkles = createSparkleTrail(sparkleCanvas);
  app.sparkles.setEnabled(motionAllowed());
  window.addEventListener("pointermove", (event) => {
    app.sparkles.handleMove(event.clientX, event.clientY);
  });
}

reducedMotionQuery.addEventListener("change", () => {
  app.sparkles?.setEnabled(motionAllowed());
});

const motionToggle = document.querySelector("[data-motion-toggle]");
if (motionToggle) {
  motionToggle.addEventListener("click", () => {
    const paused = document.documentElement.classList.toggle("motion-paused");
    motionToggle.setAttribute("aria-pressed", String(paused));
    app.sparkles?.setEnabled(motionAllowed());
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    app.sparkles?.suspend();
    app.visitorMap?.suspend();
  } else {
    app.visitorMap?.resume();
  }
});

// Debug handle for headless QA (rAF is throttled in hidden tabs).
window.__day59 = app;

document.documentElement.classList.add("js-ready");
