// The processing pipeline. Every frame the source runs through:
//   1. downscale by pixel-size factor (chunky pixels)
//   2. grayscale / brightness / contrast adjustments on raw ImageData
//   3. palette quantization — with a dithering algorithm once one is selected
//   4. nearest-neighbor upscale (imageSmoothingEnabled = false)
// CRT post-processing is layered on top of the result elsewhere.

// Luma-weighted squared distance — green counts most, blue least, matching
// how the eye weighs brightness. Used by plain quantize and error diffusion.
export function nearestColor(r, g, b, palette) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const dist = dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114;
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return palette[best];
}

// Plain per-pixel quantize — what you get with dithering switched off.
export function quantizeNearest(img, palette) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const p = nearestColor(d[i], d[i + 1], d[i + 2], palette);
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
  }
}

// Tone adjustments, applied in place before quantization.
function adjust(img, { grayscale, brightness, contrast }) {
  const d = img.data;
  const bAdd = brightness * 1.27; // -100..100 → ±127
  const c = contrast * 2.55;      // -100..100 → ±255
  const cf = (259 * (c + 255)) / (255 * (259 - c));
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (grayscale) {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = l;
    }
    r = cf * (r - 128) + 128 + bAdd;
    g = cf * (g - 128) + 128 + bAdd;
    b = cf * (b - 128) + 128 + bAdd;
    // Uint8ClampedArray clamps on write
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

/**
 * Run the full pipeline.
 * @param source   canvas holding the capped source image
 * @param opts     { pixelSize, grayscale, brightness, contrast, palette,
 *                   ditherFn, serpentine }
 *                 ditherFn(imageData, palette, opts) mutates pixels in place;
 *                 when absent, plain nearest-color quantize is used.
 * @returns        canvas at source scale (chunky pixels already upscaled)
 */
export function runPipeline(source, opts) {
  const px = Math.max(1, Math.round(opts.pixelSize || 1));

  // 1. downscale (browser does the box filtering for us)
  const w = Math.max(1, Math.floor(source.width / px));
  const h = Math.max(1, Math.floor(source.height / px));
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(source, 0, 0, w, h);

  // 2 + 3. pixel work on ImageData
  const img = sctx.getImageData(0, 0, w, h);
  adjust(img, opts);

  // "draw" algorithms (halftone) paint the upscaled output themselves
  // instead of quantizing pixels
  if (opts.drawFn) {
    const out = document.createElement("canvas");
    out.width = w * px;
    out.height = h * px;
    opts.drawFn(img, opts.palette, out, px, opts);
    return out;
  }

  if (opts.ditherFn) {
    opts.ditherFn(img, opts.palette, opts);
  } else {
    quantizeNearest(img, opts.palette);
  }
  sctx.putImageData(img, 0, 0);

  // 4. nearest-neighbor upscale back to display scale
  const out = document.createElement("canvas");
  out.width = w * px;
  out.height = h * px;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(small, 0, 0, out.width, out.height);
  return out;
}
