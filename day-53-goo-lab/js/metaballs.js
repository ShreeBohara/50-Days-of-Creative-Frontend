// metaballs.js — SPECIMEN 02
// Fake-but-fast metaballs: draw soft additive circles onto a LOW-RES offscreen
// "field", read it back, threshold each pixel into a themed colour with a thin
// glowing rim, then upscale that small buffer to the display canvas (smoothed).
// Cheap enough for 60fps because the per-pixel loop runs on the tiny field.

import { el, clamp, onVisible, prefersReducedMotion } from './util.js';

// theme = [innerR,innerG,innerB], [rimR,rimG,rimB]  (rim = brighter edge glow)
export const THEMES = {
  slime:   { inner: [46, 190, 110], rim: [180, 255, 200], bg: [8, 14, 11] },
  lava:    { inner: [220, 60, 24],  rim: [255, 200, 90],  bg: [20, 6, 8] },
  mercury: { inner: [150, 170, 190], rim: [240, 248, 255], bg: [8, 10, 14] },
};

const THRESHOLD = 150;   // field value at which "goo" turns solid
const RIM = 46;          // width of the glowing edge band, in field units

function makeBlob(fw, fh, rand) {
  const r = (0.10 + rand() * 0.10) * fw;
  return {
    x: rand() * fw, y: rand() * fh,
    vx: (rand() - 0.5) * 0.6, vy: (rand() - 0.5) * 0.6,
    r,
    // per-blob pulse so radii breathe out of sync
    phase: rand() * Math.PI * 2,
    pulse: 0.06 + rand() * 0.06,
  };
}

export function mountMetaballs(stage) {
  const display = el('canvas', { class: 'mb-canvas' });
  const dctx = display.getContext('2d');

  // small offscreen buffers reused every frame
  const field = document.createElement('canvas');
  const fctx = field.getContext('2d', { willReadFrequently: true });
  const out = document.createElement('canvas');
  const octx = out.getContext('2d');

  let DW = 0, DH = 0, FW = 0, FH = 0;
  let blobs = [];
  const cursor = { x: 0, y: 0, tx: 0, ty: 0, r: 0, active: false };
  let theme = THEMES.slime;
  let running = false, visible = false, reduced = prefersReducedMotion();
  let seed = 1;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w < 2 || h < 2) return;          // not laid out yet — wait for next RO tick
    DW = w; DH = h;
    display.width = DW;
    display.height = DH;
    const prevFW = FW, prevFH = FH;
    FW = clamp(Math.round(DW / 4), 90, 240);
    FH = clamp(Math.round(FW * (DH / DW)), 40, 400);
    field.width = FW; field.height = FH;
    out.width = FW; out.height = FH;
    if (!blobs.length) {
      blobs = Array.from({ length: 8 }, () => makeBlob(FW, FH, rand));
      cursor.x = cursor.tx = FW / 2;
      cursor.y = cursor.ty = FH / 2;
    } else if (prevFW > 0 && prevFH > 0) {
      // keep blobs where they were, proportionally, after a resize
      const sx = FW / prevFW, sy = FH / prevFH;
      for (const b of blobs) { b.x *= sx; b.y *= sy; b.r *= sx; }
      cursor.x *= sx; cursor.y *= sy; cursor.tx *= sx; cursor.ty *= sy;
    }
    cursor.r = 0.16 * FW;
  }

  // paint one additive white radial blob onto the field
  function stamp(x, y, r) {
    const g = fctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.arc(x, y, r, 0, Math.PI * 2);
    fctx.fill();
  }

  let t = 0;
  function tick() {
    if (FW < 2 || FH < 2) { resize(); if (FW < 2 || FH < 2) return; } // wait for a valid size
    t += 1;

    // move wanderers
    for (const b of blobs) {
      if (!reduced) { b.x += b.vx; b.y += b.vy; }
      if (b.x < 0 || b.x > FW) b.vx *= -1;
      if (b.y < 0 || b.y > FH) b.vy *= -1;
      b.x = clamp(b.x, 0, FW); b.y = clamp(b.y, 0, FH);
    }
    // cursor blob eases toward pointer
    cursor.x += (cursor.tx - cursor.x) * 0.18;
    cursor.y += (cursor.ty - cursor.y) * 0.18;

    // draw field (additive)
    fctx.globalCompositeOperation = 'source-over';
    fctx.fillStyle = '#000';
    fctx.fillRect(0, 0, FW, FH);
    fctx.globalCompositeOperation = 'lighter';
    for (const b of blobs) {
      const rr = b.r * (1 + Math.sin(t * 0.03 + b.phase) * b.pulse);
      stamp(b.x, b.y, rr);
    }
    stamp(cursor.x, cursor.y, cursor.r * (cursor.active ? 1.15 : 1));

    // threshold pass → themed colour + rim
    const src = fctx.getImageData(0, 0, FW, FH).data;
    const img = octx.createImageData(FW, FH);
    const o = img.data;
    const [ir, ig, ib] = theme.inner;
    const [rr2, rg, rb] = theme.rim;
    const AA = 16; // soft alpha ramp just outside the threshold → smooth upscaled edges
    for (let i = 0; i < src.length; i += 4) {
      const v = src[i]; // red channel = summed field
      if (v >= THRESHOLD - AA) {
        // rim colour near the boundary, solid inner colour deeper in
        const edge = clamp((v - THRESHOLD) / RIM, 0, 1);
        o[i]     = rr2 + (ir - rr2) * edge;
        o[i + 1] = rg + (ig - rg) * edge;
        o[i + 2] = rb + (ib - rb) * edge;
        o[i + 3] = v >= THRESHOLD ? 255 : Math.round((v - (THRESHOLD - AA)) / AA * 255);
      } else {
        o[i + 3] = 0;
      }
    }
    octx.putImageData(img, 0, 0);

    // upscale smoothly to the display
    dctx.clearRect(0, 0, DW, DH);
    dctx.imageSmoothingEnabled = true;
    dctx.drawImage(out, 0, 0, DW, DH);
  }

  function frame() {
    if (!running) return;
    tick();
    requestAnimationFrame(frame);
  }

  function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function stop() { running = false; }

  // pointer / touch → cursor blob target (in field coords)
  function pointerTo(clientX, clientY) {
    const rect = display.getBoundingClientRect();
    cursor.tx = clamp(((clientX - rect.left) / rect.width) * FW, 0, FW);
    cursor.ty = clamp(((clientY - rect.top) / rect.height) * FH, 0, FH);
  }
  display.addEventListener('pointermove', (e) => { cursor.active = true; pointerTo(e.clientX, e.clientY); });
  display.addEventListener('pointerdown', (e) => { cursor.active = true; pointerTo(e.clientX, e.clientY); });
  display.addEventListener('pointerleave', () => { cursor.active = false; });

  stage.appendChild(display);
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  window.addEventListener('resize', resize);
  resize();
  start();                                   // eager — run immediately
  // IntersectionObserver only PAUSES the loop when the section is off-screen
  onVisible(stage, (on) => { visible = on; if (on) { resize(); start(); } else stop(); });

  // public API (theme selector in commit 6; step() lets tests force frames)
  return {
    setTheme(name) { if (THEMES[name]) theme = THEMES[name]; },
    get themeName() { return Object.keys(THEMES).find((k) => THEMES[k] === theme); },
    step(n = 1) { for (let k = 0; k < n; k++) tick(); },
  };
}
