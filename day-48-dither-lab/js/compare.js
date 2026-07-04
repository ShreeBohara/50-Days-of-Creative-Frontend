// Split-view comparison. The original sits above the processed canvas,
// clipped to the left of the seam; dragging the seam (or pressing/dragging
// anywhere on the image, or arrow keys on the seam) moves the split.
// Pointer Events give mouse + touch + pen in one code path.

export function initCompare(stack, divider, state) {
  const setSplit = (frac) => {
    state.split = Math.min(0.99, Math.max(0.01, frac));
    stack.style.setProperty("--split", `${(state.split * 100).toFixed(2)}%`);
  };

  const splitFromEvent = (e) => {
    const rect = stack.getBoundingClientRect();
    setSplit((e.clientX - rect.left) / rect.width);
  };

  let dragging = false;

  stack.addEventListener("pointerdown", (e) => {
    // primary button / touch only
    if (e.button !== undefined && e.button !== 0) return;
    dragging = true;
    stack.setPointerCapture(e.pointerId);
    stack.classList.add("is-dragging");
    splitFromEvent(e);
    e.preventDefault();
  });

  stack.addEventListener("pointermove", (e) => {
    if (dragging) splitFromEvent(e);
  });

  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    stack.classList.remove("is-dragging");
    if (stack.hasPointerCapture(e.pointerId)) stack.releasePointerCapture(e.pointerId);
  };
  stack.addEventListener("pointerup", stop);
  stack.addEventListener("pointercancel", stop);

  // keyboard access on the seam itself
  divider.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { setSplit(state.split - 0.03); e.preventDefault(); }
    if (e.key === "ArrowRight") { setSplit(state.split + 0.03); e.preventDefault(); }
    if (e.key === "Home") { setSplit(0.01); e.preventDefault(); }
    if (e.key === "End") { setSplit(0.99); e.preventDefault(); }
  });

  setSplit(state.split);
}
