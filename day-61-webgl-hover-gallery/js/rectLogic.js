/* rectLogic.js — pure geometry: DOM rect -> clip space, cover-fit UV
 * crop, rect interpolation and hit tests. No DOM, no GL — everything
 * here runs under plain `node --test`.
 *
 * Spaces:
 *   document rect  — CSS px, y from the top of the DOCUMENT (stable
 *                    across scroll; measured once per layout change)
 *   viewport rect  — CSS px, y from the top of the VIEWPORT
 *   clip rect      — WebGL clip space, (x,y) = bottom-left of the
 *                    plane, y pointing UP
 */

/* viewport rect -> clip-space rect (x, y, w, h). The y flip happens
 * here: clip y is the plane's BOTTOM edge because clip space points up
 * while CSS points down. */
export function rectToClip(rect, vw, vh) {
  return {
    x: (rect.x / vw) * 2 - 1,
    y: 1 - ((rect.y + rect.h) / vh) * 2,
    w: (rect.w / vw) * 2,
    h: (rect.h / vh) * 2,
  };
}

/* document rect -> viewport rect for the current scroll offset */
export function viewportRect(docRect, scrollX, scrollY) {
  return {
    x: docRect.x - scrollX,
    y: docRect.y - scrollY,
    w: docRect.w,
    h: docRect.h,
  };
}

/* CSS background-size:cover, as a UV window into the texture.
 * Returns {scale:[sx,sy], offset:[ox,oy]} such that
 * sample = offset + planeUV * scale crops the texture (aspect texAspect)
 * to the plane's aspect without stretching. */
export function coverUV(planeW, planeH, texAspect = 1) {
  const ratio = planeW / planeH / texAspect;
  if (ratio >= 1) {
    /* plane is wider than the texture: full width, crop rows */
    const sy = 1 / ratio;
    return { scale: [1, sy], offset: [0, (1 - sy) / 2] };
  }
  /* plane is taller: full height, crop columns */
  return { scale: [ratio, 1], offset: [(1 - ratio) / 2, 0] };
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpRect(from, to, t) {
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    w: lerp(from.w, to.w, t),
    h: lerp(from.h, to.h, t),
  };
}

/* pointer (viewport CSS px) -> plane-local UV, clamped to [0,1] */
export function localMouseUV(mx, my, rect) {
  const u = (mx - rect.x) / rect.w;
  const v = (my - rect.y) / rect.h;
  return {
    u: Math.min(1, Math.max(0, u)),
    v: Math.min(1, Math.max(0, v)),
  };
}

/* inclusive point-in-rect test in viewport CSS px */
export function hitTest(mx, my, rect) {
  return (
    mx >= rect.x && mx <= rect.x + rect.w &&
    my >= rect.y && my <= rect.y + rect.h
  );
}

/* inflate a rect about its center (the idle "breathing") */
export function inflateRect(rect, factor) {
  const w = rect.w * factor;
  const h = rect.h * factor;
  return {
    x: rect.x - (w - rect.w) / 2,
    y: rect.y - (h - rect.h) / 2,
    w,
    h,
  };
}
