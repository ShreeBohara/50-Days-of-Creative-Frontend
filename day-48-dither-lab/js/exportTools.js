// PNG export. Re-runs the pipeline against the full capped source (not the
// on-screen canvas) so the download is always a clean, full-resolution print
// of the current settings, CRT pass included.

import { runPipeline } from "./pipeline.js";
import { applyCRT } from "./crt.js";
import { DITHERERS } from "./ditherers.js";
import { resolvePalette } from "./palettes.js";

export function exportPNG(state) {
  if (!state.source) return;

  const ditherer = DITHERERS[state.algorithm] || DITHERERS.none;
  const out = runPipeline(state.source, {
    pixelSize: state.pixelSize,
    grayscale: state.grayscale,
    brightness: state.brightness,
    contrast: state.contrast,
    palette: resolvePalette(state),
    serpentine: state.serpentine,
    ditherFn: ditherer.draw ? null : ditherer.fn,
    drawFn: ditherer.draw ? ditherer.fn : null,
  });
  if (state.crt) applyCRT(out);

  out.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dither-lab_${state.algorithm}_${state.palette}_px${state.pixelSize}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
}
