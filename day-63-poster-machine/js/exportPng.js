// Print-resolution export: the same seed re-rendered offscreen at exactly
// 2× poster units (2400×3200), encoded to PNG and handed to the browser as
// a download. If the device refuses a canvas that large, retry at 1800×2400.
import { POSTER_W, renderPoster } from "./poster.js";
import { slugify } from "./text.js";

export const EXPORT_WIDTH = 2400;
export const EXPORT_HEIGHT = 3200;
export const FALLBACK_WIDTH = 1800;
export const FALLBACK_HEIGHT = 2400;

export function exportScale(width = EXPORT_WIDTH) {
  return width / POSTER_W;
}

export function createExportFileName(code, headline) {
  const safeCode = String(code || "poster").replace(/[^A-Za-z0-9-]/g, "");
  return `poster-63-${safeCode}-${slugify(headline)}.png`;
}

/** Renders `state` into a fresh canvas of the given size (browser only). */
export function renderExportCanvas(state, { code = "", width = EXPORT_WIDTH, height = EXPORT_HEIGHT } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not create an export canvas");
  renderPoster(ctx, state, { scale: exportScale(width), code });
  return canvas;
}

export function releaseCanvas(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode the PNG"));
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

/** Renders and encodes; falls back to a smaller canvas when the device balks. */
export async function exportBlob(state, { code = "" } = {}) {
  const attempts = [
    { width: EXPORT_WIDTH, height: EXPORT_HEIGHT, fallback: false },
    { width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT, fallback: true },
  ];
  let lastError = null;
  for (const attempt of attempts) {
    let canvas = null;
    try {
      canvas = renderExportCanvas(state, { code, width: attempt.width, height: attempt.height });
      const blob = await canvasToBlob(canvas);
      if (blob.size < 1024) throw new Error("The export came back empty");
      return { blob, width: attempt.width, height: attempt.height, fallback: attempt.fallback };
    } catch (error) {
      lastError = error;
    } finally {
      if (canvas) releaseCanvas(canvas);
    }
  }
  throw lastError || new Error("Export failed");
}

/** Full export flow: render, encode, trigger the download. */
export async function downloadPng(state, { code = "" } = {}) {
  const result = await exportBlob(state, { code });
  const fileName = createExportFileName(code, state.text.headline);
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { ...result, fileName };
}
