/* Day 17 — Isometric City Builder */

(() => {
  "use strict";

  /* ── Constants ────────────────────────────────────────── */

  const GRID = 20;
  const TILE_W = 64;
  const TILE_H = 32;

  const UNIT_H = 20;

  const TILES = {
    grass:               { h: 0, top: "#a8d5a2", left: "#8bc285", right: "#92b88c" },
    road:                { h: 0, top: "#c4bfb6", left: "#a8a49c", right: "#b0aca4" },
    water:               { h: 0, top: "#7ec8e3", left: "#5eb0cc", right: "#6ab8d4" },
    park:                { h: 0, top: "#c5e8a0", left: "#a5cc80", right: "#b0d88c" },
    tree:                { h: 1, top: "#6dbf67", left: "#4fa34a", right: "#58ad52" },
    "building-small":    { h: 1, top: "#f0e4d7", left: "#c4b8ab", right: "#d8ccbf", win: true },
    "building-tall":     { h: 2, top: "#e0d4f5", left: "#b0a4c8", right: "#c8bce0", win: true },
    "building-skyscraper": { h: 4, top: "#d4e7fa", left: "#9cb7d4", right: "#b8cfe8", win: true },
  };

  /* ── State ───────────────────────────────────────────── */

  const grid = Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => "grass")
  );

  let hoverCol = -1;
  let hoverRow = -1;
  let selectedTile = "grass";
  let nightTarget = 0;
  let nightLerp = 0;
  let stars = [];

  /* ── Canvas setup ─────────────────────────────────────── */

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

  function screenToGrid(px, py) {
    const sx = px - originX;
    const sy = py - originY;
    const col = Math.floor((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
    const row = Math.floor((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return { col: -1, row: -1 };
    return { col, row };
  }

  /* ── Color utilities ──────────────────────────────────── */

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  function tintNight(hex, t) {
    if (t <= 0) return hex;
    const [r, g, b] = hexToRgb(hex);
    const nr = Math.round(r * (1 - t * 0.6) + 15 * t);
    const ng = Math.round(g * (1 - t * 0.6) + 20 * t);
    const nb = Math.round(b * (1 - t * 0.55) + 50 * t);
    return rgbToHex(
      Math.max(0, Math.min(255, nr)),
      Math.max(0, Math.min(255, ng)),
      Math.max(0, Math.min(255, nb))
    );
  }

  function generateStars() {
    stars = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.6 + 0.3,
      });
    }
  }

  /* ── Drawing ──────────────────────────────────────────── */

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

  function drawIsometricBox(x, y, unitH, top, left, right) {
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    const lift = unitH * UNIT_H;

    /* left face */
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh - lift);
    ctx.lineTo(x - hw, y - lift);
    ctx.closePath();
    ctx.fillStyle = left;
    ctx.fill();

    /* right face */
    ctx.beginPath();
    ctx.moveTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x, y + hh - lift);
    ctx.lineTo(x + hw, y - lift);
    ctx.closePath();
    ctx.fillStyle = right;
    ctx.fill();

    /* top face (lifted) */
    ctx.beginPath();
    ctx.moveTo(x, y - hh - lift);
    ctx.lineTo(x + hw, y - lift);
    ctx.lineTo(x, y + hh - lift);
    ctx.lineTo(x - hw, y - lift);
    ctx.closePath();
    ctx.fillStyle = top;
    ctx.fill();
  }

  function drawTree(x, y) {
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;

    /* trunk — small brown box */
    const trunkH = 10;
    ctx.beginPath();
    ctx.moveTo(x - 4, y);
    ctx.lineTo(x, y + 3);
    ctx.lineTo(x, y + 3 - trunkH);
    ctx.lineTo(x - 4, y - trunkH);
    ctx.closePath();
    ctx.fillStyle = tintNight("#9e7b5a", nightLerp);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x, y + 3);
    ctx.lineTo(x, y + 3 - trunkH);
    ctx.lineTo(x + 4, y - trunkH);
    ctx.closePath();
    ctx.fillStyle = tintNight("#b08968", nightLerp);
    ctx.fill();

    /* canopy — ellipse */
    ctx.beginPath();
    ctx.ellipse(x, y - 18, 12, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = tintNight("#6dbf67", nightLerp);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y - 20, 10, 8, 0, 0, Math.PI * 2);
    ctx.fillStyle = tintNight("#82d47c", nightLerp);
    ctx.fill();
  }

  function drawWindows(x, y, unitH) {
    if (nightLerp < 0.15) return;
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    const lift = unitH * UNIT_H;
    const alpha = Math.min(1, (nightLerp - 0.15) / 0.5);
    const winW = 4;
    const winH = 3;

    ctx.save();
    ctx.globalAlpha = alpha;

    /* windows on left face */
    const rows = Math.max(1, unitH);
    for (let r = 0; r < rows; r++) {
      const baseY = y - r * UNIT_H - 6;
      for (let w = 0; w < 2; w++) {
        const frac = (w + 1) / 3;
        const wx = x - hw * (1 - frac) + frac * 0;
        const wy = baseY - hh * frac + hh * (1 - frac);

        /* glow */
        ctx.fillStyle = `rgba(255,216,115,0.3)`;
        ctx.fillRect(wx - winW / 2 - 1, wy - winH / 2 - 1, winW + 2, winH + 2);
        /* window */
        ctx.fillStyle = "#ffd873";
        ctx.fillRect(wx - winW / 2, wy - winH / 2, winW, winH);
      }
    }

    /* windows on right face */
    for (let r = 0; r < rows; r++) {
      const baseY = y - r * UNIT_H - 6;
      for (let w = 0; w < 2; w++) {
        const frac = (w + 1) / 3;
        const wx = x + hw * frac;
        const wy = baseY + hh * frac - hh;

        ctx.fillStyle = `rgba(255,216,115,0.3)`;
        ctx.fillRect(wx - winW / 2 - 1, wy - winH / 2 - 1, winW + 2, winH + 2);
        ctx.fillStyle = "#ffd873";
        ctx.fillRect(wx - winW / 2, wy - winH / 2, winW, winH);
      }
    }

    ctx.restore();
  }

  function drawShadow(x, y, unitH) {
    if (unitH <= 0) return;
    const hw = TILE_W / 2;
    const hh = TILE_H / 2;
    const off = unitH * 4;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.moveTo(x + off, y - hh + off);
    ctx.lineTo(x + hw + off, y + off);
    ctx.lineTo(x + off, y + hh + off);
    ctx.lineTo(x - hw + off, y + off);
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();
  }

  function drawBackground() {
    const dayTop = [11, 17, 32];
    const dayBot = [17, 27, 46];
    const nightTop = [4, 6, 16];
    const nightBot = [6, 10, 22];
    const t = nightLerp;
    const topR = Math.round(dayTop[0] * (1 - t) + nightTop[0] * t);
    const topG = Math.round(dayTop[1] * (1 - t) + nightTop[1] * t);
    const topB = Math.round(dayTop[2] * (1 - t) + nightTop[2] * t);
    const botR = Math.round(dayBot[0] * (1 - t) + nightBot[0] * t);
    const botG = Math.round(dayBot[1] * (1 - t) + nightBot[1] * t);
    const botB = Math.round(dayBot[2] * (1 - t) + nightBot[2] * t);

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, rgbToHex(topR, topG, topB));
    grad.addColorStop(1, rgbToHex(botR, botG, botB));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    /* stars at night */
    if (t > 0.1) {
      ctx.save();
      ctx.globalAlpha = (t - 0.1) / 0.9;
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,240,${s.a})`;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawGrid() {
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        const type = grid[row][col];
        const tile = TILES[type];
        const { x, y } = gridToScreen(col, row);

        if (tile.h > 0) {
          drawShadow(x, y, tile.h);
        }

        const nt = nightLerp;
        const tt = tintNight(tile.top, nt);
        const tl = tintNight(tile.left, nt);
        const tr = tintNight(tile.right, nt);

        if (type === "tree") {
          drawDiamond(x, y, tintNight(TILES.grass.top, nt));
          drawTree(x, y);
        } else if (tile.h > 0) {
          drawIsometricBox(x, y, tile.h, tt, tl, tr);
          if (tile.win) drawWindows(x, y, tile.h);
        } else {
          drawDiamond(x, y, tt);
        }

        /* subtle grid lines for flat tiles */
        if (tile.h === 0) {
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

        /* hover highlight */
        if (col === hoverCol && row === hoverRow) {
          drawDiamond(x, y, "rgba(255,255,255,0.18)");
        }
      }
    }
  }

  /* ── Render loop ──────────────────────────────────────── */

  let lastTime = 0;

  function render(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;

    /* animate day/night */
    if (nightLerp !== nightTarget) {
      const speed = 2.5;
      if (nightLerp < nightTarget) nightLerp = Math.min(nightTarget, nightLerp + dt * speed);
      else nightLerp = Math.max(nightTarget, nightLerp - dt * speed);
    }

    drawBackground();
    drawGrid();
    requestAnimationFrame(render);
  }

  /* ── Mouse ─────────────────────────────────────────────── */

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const g = screenToGrid(e.clientX - rect.left, e.clientY - rect.top);
    hoverCol = g.col;
    hoverRow = g.row;
  });

  canvas.addEventListener("mouseleave", () => {
    hoverCol = -1;
    hoverRow = -1;
  });

  canvas.addEventListener("click", () => {
    if (hoverCol >= 0 && hoverRow >= 0) {
      grid[hoverRow][hoverCol] = selectedTile;
    }
  });

  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (hoverCol >= 0 && hoverRow >= 0) {
      grid[hoverRow][hoverCol] = "grass";
    }
  });

  /* ── Toolbar ─────────────────────────────────────────── */

  const toolBtns = document.querySelectorAll(".tool-btn");
  const daynightIcon = document.querySelector(".daynight-icon");

  toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      toolBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedTile = btn.dataset.tile;
    });
  });

  document.querySelector('[data-action="daynight"]').addEventListener("click", () => {
    nightTarget = nightTarget === 0 ? 1 : 0;
    daynightIcon.classList.toggle("night", nightTarget === 1);
  });

  /* ── Init ─────────────────────────────────────────────── */

  resize();
  generateStars();
  window.addEventListener("resize", resize);
  requestAnimationFrame(render);
})();
