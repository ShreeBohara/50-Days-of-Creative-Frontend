// The on-screen poster: fits the 3:4 page into the stage, keeps the backing
// store at device resolution, and crossfades rerolls through a "ghost" copy
// of the previous frame. Renders are synchronous (never rAF-gated) so the
// poster is correct even in hidden or throttled tabs.
import { fitPoster, backingSize, renderPoster } from "./poster.js";

const STAGE_PAD = 32;
const FADE_FALLBACK_MS = 260;

export function createPosterView({
  canvas, ghost, stage, wrap, reducedMotion = () => false,
}) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const ghostCtx = ghost.getContext("2d", { alpha: false });
  let size = { width: 0, height: 0, scale: 1, cssW: 0, cssH: 0 };
  let last = null;
  let fadeTimer = 0;

  function measure() {
    const rect = stage.getBoundingClientRect();
    const { cssW, cssH } = fitPoster(rect.width, rect.height, STAGE_PAD);
    if (cssW < 8 || cssH < 8) return false;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const backing = backingSize(cssW, cssH, window.devicePixelRatio || 1, coarse ? 1.6e6 : 4.5e6);
    if (backing.width === size.width && backing.height === size.height && cssW === size.cssW) {
      return false;
    }
    size = { ...backing, cssW, cssH };
    for (const target of [canvas, ghost]) {
      target.width = backing.width;
      target.height = backing.height;
      target.style.width = `${cssW}px`;
      target.style.height = `${cssH}px`;
    }
    wrap.style.width = `${cssW}px`;
    wrap.style.height = `${cssH}px`;
    return true;
  }

  function endFade() {
    clearTimeout(fadeTimer);
    fadeTimer = 0;
    ghost.classList.remove("is-showing", "is-fading");
  }

  function render(state, code = "") {
    last = { state, code };
    if (size.width === 0 && !measure()) return null;
    return renderPoster(ctx, state, { scale: size.scale, code });
  }

  function rerender() {
    if (last) render(last.state, last.code);
  }

  /** Re-render with a 150 ms crossfade from the previous frame. */
  function crossfade(state, code = "") {
    if (reducedMotion() || size.width === 0 || !last) return render(state, code);
    endFade();
    ghostCtx.drawImage(canvas, 0, 0);
    ghost.classList.add("is-showing");
    const result = render(state, code);
    requestAnimationFrame(() => ghost.classList.add("is-fading"));
    fadeTimer = setTimeout(endFade, FADE_FALLBACK_MS);
    return result;
  }

  ghost.addEventListener("transitionend", endFade);

  const observer = new ResizeObserver(() => {
    if (measure()) {
      endFade();
      rerender();
    }
  });
  observer.observe(stage);

  return {
    canvas,
    ctx,
    measure,
    render,
    rerender,
    crossfade,
    get size() {
      return size;
    },
  };
}
