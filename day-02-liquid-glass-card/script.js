"use strict";

const tiltCard = document.querySelector("[data-tilt-card]");

const TILT_LIMIT = 12;

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
}

function resetCardTilt(card) {
  card.classList.remove("is-active");
  card.style.setProperty("--card-rotate-x", "0deg");
  card.style.setProperty("--card-rotate-y", "0deg");
  card.style.setProperty("--pointer-x", "50%");
  card.style.setProperty("--pointer-y", "50%");
}

function initTiltCard() {
  if (!tiltCard) {
    return;
  }

  tiltCard.addEventListener("pointerenter", () => {
    tiltCard.classList.add("is-active");
  });

  tiltCard.addEventListener("pointermove", (event) => {
    tiltCard.classList.add("is-active");
    setCardTilt(tiltCard, event);
  });

  tiltCard.addEventListener("pointerleave", () => {
    resetCardTilt(tiltCard);
  });
}

initTiltCard();
