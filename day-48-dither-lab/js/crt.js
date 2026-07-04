// CRT post-pass, layered over the processed image when toggled on:
//   1. RGB fringe — red/blue channels slide apart, visible on hard edges
//   2. bloom     — blurred additive re-draw so bright pixels glow
//   3. scanlines — dark raster lines at a period scaled to the image
//   4. vignette  — radial falloff imitating a curved tube
// Everything mutates the canvas in place.

export function applyCRT(canvas) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // -- 1. rgb fringe (exact channel shift on pixels) -------------------------
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d); // frozen copy to sample from
  const shift = Math.max(1, Math.round(w / 640));
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = (row + x) * 4;
      const xr = x + shift < w ? x + shift : w - 1;
      const xb = x - shift >= 0 ? x - shift : 0;
      d[i] = src[(row + xr) * 4];         // red leans right
      d[i + 2] = src[(row + xb) * 4 + 2]; // blue leans left
    }
  }
  ctx.putImageData(img, 0, 0);

  // -- 2. bloom ----------------------------------------------------------------
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext("2d");
  tctx.filter = `blur(${Math.max(2, Math.round(w / 320))}px)`;
  tctx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = "lighter"; // additive: bright areas dominate
  ctx.globalAlpha = 0.3;
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();

  // -- 3. scanlines ---------------------------------------------------------------
  const period = Math.max(3, Math.floor(h / 240));
  const thickness = Math.max(1, Math.round(period * 0.4));
  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  for (let y = 0; y < h; y += period) {
    ctx.fillRect(0, y, w, thickness);
  }

  // -- 4. barrel vignette ------------------------------------------------------------
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.72
  );
  g.addColorStop(0, "rgba(0, 0, 0, 0)");
  g.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
