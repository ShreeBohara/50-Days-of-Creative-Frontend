/* fallback.js — the no-WebGL path: mount the six generated texture
 * canvases straight into the grid. This is exactly the scaffold-commit
 * view, so losing GL degrades to a clean static gallery, not a hole.
 */

export function mountFallback(textures, frames) {
  textures.forEach(({ canvas }, i) => {
    const frame = frames[i];
    if (!frame) return;
    canvas.setAttribute("aria-hidden", "true");
    frame.appendChild(canvas);
  });

  /* effect controls make no sense without shaders */
  for (const control of document.querySelectorAll(".controls select, .controls input")) {
    control.disabled = true;
    control.title = "WebGL unavailable — shader effects are off";
  }
}
