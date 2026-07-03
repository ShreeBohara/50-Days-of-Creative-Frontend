/* Custom cursor — a minimal dot in difference blend, fine pointers
   only. The native cursor is hidden by a class that this module adds,
   so keyboard users and touch devices never lose anything.

   The dot is two elements: GSAP moves the outer (x/y only), CSS
   transitions scale the inner — the two transforms can't fight. */

export function initCursor() {
  if (!window.matchMedia("(pointer: fine)").matches) return;

  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  dot.appendChild(document.createElement("span"));
  document.body.appendChild(dot);
  document.documentElement.classList.add("has-custom-cursor");

  const xTo = gsap.quickTo(dot, "x", { duration: 0.15, ease: "power3" });
  const yTo = gsap.quickTo(dot, "y", { duration: 0.15, ease: "power3" });

  /* Appears only after the first real move — no phantom dot at 0,0 */
  let shown = false;
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!shown) {
        shown = true;
        gsap.set(dot, { x: e.clientX, y: e.clientY });
        dot.classList.add("is-on");
      }
      xTo(e.clientX);
      yTo(e.clientY);
    },
    { passive: true }
  );

  /* Swell over interactive targets; tighten while grabbing */
  const hoverables = document.querySelectorAll(
    ".elastic-word, .mq-row, .wall-grid, a"
  );
  hoverables.forEach((el) => {
    el.addEventListener("pointerenter", () => dot.classList.add("is-hover"));
    el.addEventListener("pointerleave", () => dot.classList.remove("is-hover"));
  });

  const word = document.querySelector(".elastic-word");
  if (word) {
    word.addEventListener("pointerdown", () => dot.classList.add("is-grab"));
    window.addEventListener("pointerup", () => dot.classList.remove("is-grab"));
  }
}
