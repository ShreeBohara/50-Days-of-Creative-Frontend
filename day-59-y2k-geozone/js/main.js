import { createStore } from "./storage.js";

const store = createStore();
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const app = {
  store,
  get reducedMotion() {
    return reducedMotionQuery.matches;
  },
};

// Debug handle for headless QA (rAF is throttled in hidden tabs).
window.__day59 = app;

document.documentElement.classList.add("js-ready");
