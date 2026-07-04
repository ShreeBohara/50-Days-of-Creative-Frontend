// Procedural default image — a smooth-gradient sunset still, drawn on canvas.
// Gradients are exactly what dithering algorithms are best at chewing through,
// and generating it keeps the repo free of binary image assets.

// Small deterministic PRNG so the stars/reflections are identical every load.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawSampleScene(width = 960, height = 720) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const rand = mulberry32(48);

  const horizon = Math.round(height * 0.62);
  const sunX = width * 0.66;
  const sunY = horizon - height * 0.1;
  const sunR = height * 0.13;

  // -- sky ------------------------------------------------------------------
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0.0, "#14103c");
  sky.addColorStop(0.35, "#472a63");
  sky.addColorStop(0.62, "#93405a");
  sky.addColorStop(0.85, "#d96b41");
  sky.addColorStop(1.0, "#f2b447");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  // -- stars (fade out toward the sunset glow) -------------------------------
  for (let i = 0; i < 140; i++) {
    const x = rand() * width;
    const y = rand() * horizon * 0.55;
    const a = (1 - y / (horizon * 0.6)) * (0.35 + rand() * 0.55);
    ctx.fillStyle = `rgba(240, 236, 220, ${a.toFixed(3)})`;
    const s = rand() < 0.12 ? 3 : rand() < 0.5 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }

  // -- sun with soft halo -----------------------------------------------------
  const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 3.2);
  halo.addColorStop(0, "rgba(255, 214, 130, 0.85)");
  halo.addColorStop(0.4, "rgba(255, 170, 90, 0.30)");
  halo.addColorStop(1, "rgba(255, 170, 90, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, horizon);

  const sun = ctx.createRadialGradient(
    sunX - sunR * 0.25, sunY - sunR * 0.3, sunR * 0.1,
    sunX, sunY, sunR
  );
  sun.addColorStop(0, "#fff3c8");
  sun.addColorStop(0.7, "#ffcf6a");
  sun.addColorStop(1, "#f59b3f");
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // -- mountain ridges ---------------------------------------------------------
  const ridge = (baseY, amp, color, seed) => {
    const r = mulberry32(seed);
    const offset = r() * 100;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= width; x += 8) {
      const t = x / width;
      const y =
        baseY -
        amp * (0.55 + 0.45 * Math.sin(t * 5.1 + offset)) *
        (0.6 + 0.4 * Math.sin(t * 13.7 + offset * 2.3));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, horizon);
    ctx.closePath();
    ctx.fill();
  };
  ridge(horizon - height * 0.02, height * 0.16, "#552b47", 7);
  ridge(horizon, height * 0.09, "#2b1430", 13);

  // -- water -------------------------------------------------------------------
  const sea = ctx.createLinearGradient(0, horizon, 0, height);
  sea.addColorStop(0, "#d67a3f");
  sea.addColorStop(0.25, "#8f3f4e");
  sea.addColorStop(0.7, "#301c46");
  sea.addColorStop(1, "#150e2e");
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, width, height - horizon);

  // sun reflection — jittered horizontal slivers that narrow with depth
  for (let y = horizon + 4; y < height; y += 5) {
    const depth = (y - horizon) / (height - horizon);
    const w = sunR * 2.4 * (1 - depth * 0.75) * (0.5 + rand() * 0.6);
    const x = sunX + (rand() - 0.5) * 46 * depth;
    ctx.fillStyle = `rgba(255, 196, 110, ${(0.5 * (1 - depth * 0.8)).toFixed(3)})`;
    ctx.fillRect(x - w / 2, y, w, 2.4);
  }

  // -- sailboat silhouette -------------------------------------------------------
  const bx = width * 0.3;
  const by = horizon + (height - horizon) * 0.32;
  ctx.fillStyle = "#100a20";
  ctx.beginPath(); // hull
  ctx.moveTo(bx - 34, by);
  ctx.lineTo(bx + 34, by);
  ctx.lineTo(bx + 22, by + 12);
  ctx.lineTo(bx - 22, by + 12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // main sail
  ctx.moveTo(bx + 2, by - 4);
  ctx.lineTo(bx + 2, by - 52);
  ctx.lineTo(bx - 26, by - 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath(); // jib
  ctx.moveTo(bx + 8, by - 4);
  ctx.lineTo(bx + 8, by - 44);
  ctx.lineTo(bx + 28, by - 4);
  ctx.closePath();
  ctx.fill();

  return canvas;
}
