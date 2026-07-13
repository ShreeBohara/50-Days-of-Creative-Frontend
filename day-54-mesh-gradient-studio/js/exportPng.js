import { drawSurfaceEffects } from "./effects.js";
import { renderMesh } from "./renderer.js";

export const EXPORT_WIDTH = 1920;
export const EXPORT_HEIGHT = 1080;

export function createExportFileName(presetId, date = new Date()) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `mesh-54-${presetId}-${stamp}.png`;
}

export function renderExportCanvas(scene, framePoints, grainTexture, meshSource = null) {
  let source = meshSource;
  if (!source) {
    const workCanvas = document.createElement("canvas");
    workCanvas.width = EXPORT_WIDTH / 8;
    workCanvas.height = EXPORT_HEIGHT / 8;
    const workContext = workCanvas.getContext("2d", { alpha: false });
    renderMesh(workContext, workCanvas.width, workCanvas.height, scene, framePoints);
    source = workCanvas;
  }

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = EXPORT_WIDTH;
  exportCanvas.height = EXPORT_HEIGHT;
  const exportContext = exportCanvas.getContext("2d", { alpha: false });
  exportContext.imageSmoothingEnabled = true;
  exportContext.imageSmoothingQuality = "high";
  exportContext.drawImage(source, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  drawSurfaceEffects(
    exportContext,
    EXPORT_WIDTH,
    EXPORT_HEIGHT,
    scene.settings,
    grainTexture,
  );
  return exportCanvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not encode the wallpaper."));
    }, "image/png");
  });
}

export async function downloadPng({ scene, framePoints, grainTexture, meshSource }) {
  const canvas = renderExportCanvas(scene, framePoints, grainTexture, meshSource);
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = createExportFileName(scene.presetId);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return { blob, width: canvas.width, height: canvas.height };
}
