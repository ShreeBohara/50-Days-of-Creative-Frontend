/* 06 · MARQUEE — two opposing infinite loops; hovering a row slows
   it, and scroll velocity skews the type.

   Technique notes:
   - Each track holds exactly two copies of its chunk and animates by
     xPercent ±50 — relative percent keeps the wrap seam sub-pixel
     perfect at any viewport width.
   - The reverse row runs a forward-playing fromTo (-50 → 0) instead
     of a negative timeScale, so slowing a row can never flip its
     direction (the classic opposing-marquee bug).
   - Skew is applied at ROW level (2 transforms per frame, not per
     letter) — visually identical for a uniform skew, ~40× cheaper.
     GSAP composes skewX with the loop's xPercent, so they don't fight. */

const LOOP_SECONDS = 22;
const SLOW = 0.18;
const MAX_SKEW = 12; // degrees

export function initMarquee(section) {
  const rows = [...section.querySelectorAll(".mq-row")];
  const loops = rows.map((row) => {
    const track = row.querySelector(".mq-track");
    const forward = (+row.dataset.dir || 1) > 0;
    return forward
      ? gsap.to(track, {
          xPercent: -50,
          ease: "none",
          repeat: -1,
          duration: LOOP_SECONDS,
        })
      : gsap.fromTo(
          track,
          { xPercent: -50 },
          { xPercent: 0, ease: "none", repeat: -1, duration: LOOP_SECONDS }
        );
  });

  /* Hover (or touch-press) eases a row toward slow motion; leaving
     restores full speed. timeScale stays positive either way. */
  rows.forEach((row, i) => {
    const slow = () =>
      gsap.to(loops[i], { timeScale: SLOW, duration: 0.5, overwrite: true });
    const restore = () =>
      gsap.to(loops[i], { timeScale: 1, duration: 0.7, overwrite: true });
    row.addEventListener("pointerenter", slow);
    row.addEventListener("pointerleave", restore);
    row.addEventListener("pointerdown", slow);
    row.addEventListener("pointerup", restore);
    row.addEventListener("pointercancel", restore);
  });

  /* Scroll-velocity skew with self-decay: each new velocity spike only
     wins if it beats what's still decaying. */
  const tracks = rows.map((r) => r.querySelector(".mq-track"));
  const setters = tracks.map((t) => gsap.quickSetter(t, "skewX", "deg"));
  const clampSkew = gsap.utils.clamp(-MAX_SKEW, MAX_SKEW);
  const proxy = { skew: 0 };

  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onUpdate(self) {
      const s = clampSkew(self.getVelocity() / -300);
      if (Math.abs(s) > Math.abs(proxy.skew)) {
        proxy.skew = s;
        gsap.to(proxy, {
          skew: 0,
          duration: 0.8,
          ease: "power3",
          overwrite: true,
          onUpdate: () => setters.forEach((set) => set(proxy.skew)),
        });
      }
    },
    /* Two infinite tweens must not run for the whole session — freeze
       the loops whenever the section is off screen. */
    onToggle: (self) =>
      loops.forEach((tl) => (self.isActive ? tl.play() : tl.pause())),
  });

  loops.forEach((tl) => tl.pause()); // wait for the section to arrive
}
