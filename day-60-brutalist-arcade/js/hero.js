// Hero behavior: hovering the CTA for 3s+ makes it shake until you flee.

const SHAKE_AFTER_MS = 3000;

export function initHero() {
  const cta = document.getElementById("hero-cta");
  if (!cta) return;

  let timer = null;

  function arm() {
    if (timer !== null) return;
    timer = setTimeout(() => {
      cta.classList.add("is-shaking");
    }, SHAKE_AFTER_MS);
  }

  function disarm() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    cta.classList.remove("is-shaking");
  }

  cta.addEventListener("mouseenter", arm);
  cta.addEventListener("mouseleave", disarm);
  cta.addEventListener("blur", disarm);

  cta.addEventListener("click", () => {
    disarm();
    const arcade = document.getElementById("whack");
    if (arcade) arcade.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
