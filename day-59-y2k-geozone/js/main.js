import { createStore } from "./storage.js";
import { createSparkleTrail } from "./sparkles.js";

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

const sparkleCanvas = document.querySelector(".sparkle-canvas");
if (sparkleCanvas && finePointerQuery.matches) {
  app.sparkles = createSparkleTrail(sparkleCanvas);
  app.sparkles.setEnabled(!app.reducedMotion);
  window.addEventListener("pointermove", (event) => {
    app.sparkles.handleMove(event.clientX, event.clientY);
  });
}

reducedMotionQuery.addEventListener("change", () => {
  app.sparkles?.setEnabled(!app.reducedMotion);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) app.sparkles?.suspend();
});

// Debug handle for headless QA (rAF is throttled in hidden tabs).
window.__day59 = app;

document.documentElement.classList.add("js-ready");
