"use strict";

const tiltCard = document.querySelector("[data-tilt-card]");
const statValues = document.querySelectorAll("[data-stat-value]");

const TILT_LIMIT = 12;
const COUNTER_DURATION = 1300;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function setCardTilt(card, event) {
  const bounds = card.getBoundingClientRect();
  const relativeX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
  const relativeY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
  const rotateY = (relativeX - 0.5) * (TILT_LIMIT * 2);
  const rotateX = (0.5 - relativeY) * (TILT_LIMIT * 2);

  card.style.setProperty("--card-rotate-x", `${rotateX.toFixed(2)}deg`);
  card.style.setProperty("--card-rotate-y", `${rotateY.toFixed(2)}deg`);
  card.style.setProperty("--pointer-x", `${(relativeX * 100).toFixed(2)}%`);
  card.style.setProperty("--pointer-y", `${(relativeY * 100).toFixed(2)}%`);
  card.style.setProperty("--shine-shift", `${(relativeX * 100).toFixed(2)}%`);
}

function resetCardTilt(card) {
  card.classList.remove("is-active");
  card.style.setProperty("--card-rotate-x", "0deg");
  card.style.setProperty("--card-rotate-y", "0deg");
  card.style.setProperty("--pointer-x", "50%");
  card.style.setProperty("--pointer-y", "50%");
  card.style.setProperty("--shine-shift", "50%");
}

function initTiltCard() {
  if (!tiltCard) {
    return;
  }

  tiltCard.addEventListener("pointerenter", () => {
    tiltCard.classList.add("is-active");
  });

  tiltCard.addEventListener("pointerdown", (event) => {
    tiltCard.classList.add("is-active");

    if (event.pointerType === "touch") {
      tiltCard.setPointerCapture(event.pointerId);
      setCardTilt(tiltCard, event);
    }
  });

  tiltCard.addEventListener("pointermove", (event) => {
    tiltCard.classList.add("is-active");
    setCardTilt(tiltCard, event);
  });

  tiltCard.addEventListener("pointerleave", () => {
    resetCardTilt(tiltCard);
  });

  tiltCard.addEventListener("pointerup", () => {
    resetCardTilt(tiltCard);
  });

  tiltCard.addEventListener("pointercancel", () => {
    resetCardTilt(tiltCard);
  });
}

function animateStatValue(element) {
  const targetText = element.dataset.target ?? element.textContent ?? "0";
  const targetValue = Number.parseInt(targetText, 10);

  if (!Number.isFinite(targetValue)) {
    element.textContent = targetText;
    return;
  }

  const minimumDigits = targetText.length;
  const startTime = window.performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = clamp(elapsed / COUNTER_DURATION, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(targetValue * eased);

    element.textContent = String(value).padStart(minimumDigits, "0");

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    }
  }

  window.requestAnimationFrame(tick);
}

function initStatCounters() {
  statValues.forEach((element, index) => {
    window.setTimeout(() => {
      animateStatValue(element);
    }, index * 110);
  });
}

initTiltCard();
initStatCounters();
