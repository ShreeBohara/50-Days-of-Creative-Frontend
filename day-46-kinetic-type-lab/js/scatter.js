/* 02 · SCATTER — a paragraph that lets go of its letters under
   scroll pressure and reassembles on the way back.

   Technique notes:
   - SplitText.create with autoSplit + onSplit: the tween is returned
     from onSplit, so a resize or late font load re-splits the text AND
     rebuilds the animation with fresh random vectors — the canonical
     fix for stale-split bugs.
   - The section pins for 150% of viewport height and the scatter is
     scrubbed, so the scroll position IS the timeline. */

export function initScatter(section, { coarse = false } = {}) {
  const copy = section.querySelector(".scatter-copy");
  const spread = coarse ? 0.5 : 1; // phones get gentler vectors

  SplitText.create(copy, {
    type: "chars,words",
    aria: "auto", // aria-label on the <p>, aria-hidden on the pieces
    autoSplit: true,
    onSplit(self) {
      return gsap.to(self.chars, {
        x: () => gsap.utils.random(-400 * spread, 400 * spread),
        y: () => gsap.utils.random(-300 * spread, 300 * spread),
        z: () => gsap.utils.random(-600 * spread, 300 * spread),
        rotationX: () => gsap.utils.random(-180, 180),
        rotationY: () => gsap.utils.random(-180, 180),
        rotation: () => gsap.utils.random(-90, 90),
        autoAlpha: 0.15,
        ease: "none",
        stagger: { each: 0.003, from: "random" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    },
  });
}
