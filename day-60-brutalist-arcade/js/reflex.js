// GAME 02 — REFLEX DUEL. Red means wait. Green means click. We time you.

import { el, hudStat } from "./dom.js";
import { MIN_DELAY_MS, ROUNDS, randomDelay } from "./reflexLogic.js";

const PAD_COPY = {
  idle: { title: "ARM", sub: "CLICK TO ARM. GREEN MEANS GO." },
  wait: { title: "WAIT…", sub: "DON'T. YOU. DARE." },
  go: { title: "CLICK!!", sub: "" },
  early: { title: "RED MEANS RED.", sub: "CLICK TO RETRY THE ROUND" },
};

export function initReflex() {
  const frame = document.getElementById("reflex-frame");
  if (!frame) return;

  const state = {
    phase: "idle", // idle | wait | go | early
    round: 0, // completed rounds
    times: [],
    goAt: 0,
    armTimer: null,
  };

  // --- HUD -----------------------------------------------------------------
  const hud = el("div", "game-hud");
  const roundStat = hudStat("ROUND", `1/${ROUNDS}`);
  const lastStat = hudStat("LAST", "—");
  hud.append(roundStat.root, lastStat.root);

  // --- pad -------------------------------------------------------------------
  const pad = el("button", "reflex-pad");
  pad.type = "button";
  pad.dataset.state = "idle";
  const padTitle = el("span", "reflex-title", PAD_COPY.idle.title);
  const padSub = el("span", "reflex-sub arcade", PAD_COPY.idle.sub);
  const stamp = el("span", "reflex-stamp arcade", "TOO EAGER");
  stamp.setAttribute("aria-hidden", "true");
  pad.append(padTitle, padSub, stamp);
  pad.setAttribute("aria-live", "polite");

  // --- recorded times row -----------------------------------------------------
  const timesRow = el("div", "reflex-times");
  const slots = [];
  for (let i = 0; i < ROUNDS; i += 1) {
    const slot = el("span", "reflex-slot arcade", "···");
    slots.push(slot);
    timesRow.append(slot);
  }

  frame.append(hud, pad, timesRow);

  // --- flow ------------------------------------------------------------------
  function setPad(phase) {
    state.phase = phase;
    pad.dataset.state = phase;
    const copy = PAD_COPY[phase];
    if (copy) {
      padTitle.textContent = copy.title;
      padSub.textContent = copy.sub;
    }
  }

  function arm() {
    setPad("wait");
    state.armTimer = setTimeout(go, randomDelay());
  }

  function go() {
    state.goAt = performance.now();
    setPad("go");
  }

  function early() {
    clearTimeout(state.armTimer);
    setPad("early");
    document.dispatchEvent(
      new CustomEvent("voltage:whiff", { detail: { game: "reflex" } }),
    );
  }

  function record() {
    const ms = Math.max(1, Math.round(performance.now() - state.goAt));
    state.times.push(ms);
    slots[state.round].textContent = `${ms}MS`;
    slots[state.round].classList.add("is-filled");
    state.round += 1;
    lastStat.set(`${ms}MS`);
    lastStat.flash();
    document.dispatchEvent(
      new CustomEvent("voltage:hit", {
        detail: { game: "reflex", points: ms },
      }),
    );
    if (state.round >= ROUNDS) {
      // best-of-5 wrap-up lands in the next commit; loop for now
      resetRun();
    } else {
      roundStat.set(`${state.round + 1}/${ROUNDS}`);
      setPad("idle");
      padSub.textContent = `CLICK TO ARM ROUND ${state.round + 1}/${ROUNDS}`;
    }
  }

  function resetRun() {
    clearTimeout(state.armTimer);
    state.round = 0;
    state.times = [];
    slots.forEach((slot) => {
      slot.textContent = "···";
      slot.classList.remove("is-filled");
    });
    roundStat.set(`1/${ROUNDS}`);
    setPad("idle");
  }

  pad.addEventListener("click", () => {
    switch (state.phase) {
      case "idle":
      case "early":
        arm();
        break;
      case "wait":
        early();
        break;
      case "go":
        record();
        break;
      default:
        break;
    }
  });

  window.__arcade = window.__arcade || {};
  window.__arcade.reflex = {
    state,
    arm,
    forceGo() {
      clearTimeout(state.armTimer);
      go();
    },
    resetRun,
    minDelay: MIN_DELAY_MS,
  };
}
