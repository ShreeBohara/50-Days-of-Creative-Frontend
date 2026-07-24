// VOLTAGE ⚡ — boot. Waits one rAF so layout exists before any
// viewport-dependent wiring (hidden tabs report bogus sizes otherwise).

import { initHero } from "./hero.js";
import { initTicker } from "./ticker.js";
import { initWhack } from "./whack.js";
import { initReflex } from "./reflex.js";
import { initMemory } from "./memory.js";
import { initAudio } from "./audio.js";
import { initShake } from "./shake.js";
import { initLeaderboard } from "./leaderboard.js";

function boot() {
  document.documentElement.dataset.js = "ready";

  // Debug handle for QA tooling; games register themselves here.
  window.__arcade = window.__arcade || {};

  initHero();
  initTicker();
  initWhack();
  initReflex();
  initMemory();
  initAudio();
  initShake();
  initLeaderboard();
}

requestAnimationFrame(boot);
