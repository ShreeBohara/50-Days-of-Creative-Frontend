"use strict";

/* Day 06 — Matrix Rain with Hover Decode Effect */

const canvas = document.querySelector("[data-rain-canvas]");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();

const ro = new ResizeObserver(() => {
  resizeCanvas();
});
ro.observe(document.documentElement);
