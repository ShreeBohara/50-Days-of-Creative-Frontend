/* cursor.js — the soft lens cursor. A DOM div (not GL) so it survives
 * context loss, rides above the expanded plane, and blends with the
 * page chrome via mix-blend-mode: difference.
 *
 * Only mounted for fine pointers that can hover — touch devices keep
 * their native behavior (style.css hides the native cursor in the
 * same media query that this check mirrors).
 *
 * Position updates per tick on the OUTER element; the INNER dot
 * carries the scale-up-over-planes transition so the CSS transition
 * never fights the per-frame translate.
 */

export function createCursor({ interactions }) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return { update() {} };
  }

  const el = document.createElement("div");
  el.className = "cursor";
  el.setAttribute("aria-hidden", "true");
  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  el.appendChild(dot);
  document.body.appendChild(el);

  function update() {
    const { x, y } = interactions.mouse;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    dot.classList.toggle("is-over", interactions.hoveredIndex() !== null);
  }

  return { update };
}
