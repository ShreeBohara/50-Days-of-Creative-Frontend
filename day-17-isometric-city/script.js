/* Day 17 — Isometric City Builder */

(() => {
  "use strict";

  /* ── Constants ────────────────────────────────────────── */

  const GRID = 20;
  const TILE_W = 64;
  const TILE_H = 32;

  const GRASS_TOP = "#a8d5a2";
  const GRASS_LEFT = "#8bc285";
  const GRASS_RIGHT = "#92b88c";

  /* ── Canvas setup ────────��────────────────────────────── */

  const canvas = document.getElementById("city-canvas");
  const ctx = canvas.getContext("2d");

  let W = 0;
  let H = 0;
  let originX = 0;
  let originY = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    originX = W / 2;
    originY = 60;
  }

  /* ── Isometric math ────────���──────────────────────────── */

  function gridToScreen(col, row) {
    const x = (col - row) * (TILE_W / 2) + originX;
    const y = (col + row) * (TILE_H / 2) + originY;
    return { x, y };
  }

  /* ── Drawing ───────��──────────────────────────────���───── */

  function drawDiamond(x, y, fill) {
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0b1120");
    grad.addColorStop(1, "#111b2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawGrid() {
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const { x, y } = gridToScreen(col, row);
        drawDiamond(x, y, GRASS_TOP);

        /* subtle grid lines */
        const hw = TILE_W / 2;
        const hh = TILE_H / 2;
        ctx.beginPath();
        ctx.moveTo(x, y - hh);
        ctx.lineTo(x + hw, y);
        ctx.lineTo(x, y + hh);
        ctx.lineTo(x - hw, y);
        ctx.closePath();
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  /* ── Render loop ──────────────────────────────────────── */

  function render() {
    drawBackground();
    drawGrid();
    requestAnimationFrame(render);
  }

  /* ── Init ─────────────────────────────────────────────── */

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(render);
})();
