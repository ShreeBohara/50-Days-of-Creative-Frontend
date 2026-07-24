// Screen shake: 2-4px, ~100ms, applied to the page shell on scoring events.
// Skipped entirely under prefers-reduced-motion.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function initShake() {
  const shell = document.getElementById("shell");
  if (!shell) return;

  function shake(px) {
    if (reduceMotion.matches) return;
    shell.style.setProperty("--shake-px", `${px}px`);
    shell.classList.remove("is-shaking");
    void shell.offsetWidth;
    shell.classList.add("is-shaking");
  }

  shell.addEventListener("animationend", (event) => {
    if (event.animationName === "screen-shake") {
      shell.classList.remove("is-shaking");
    }
  });

  document.addEventListener("voltage:hit", () => shake(2));
  document.addEventListener("voltage:miss", () => shake(4));
  document.addEventListener("voltage:gameover", () => shake(4));

  window.__arcade = window.__arcade || {};
  window.__arcade.shake = shake;
}
