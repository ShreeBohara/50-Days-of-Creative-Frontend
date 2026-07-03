# Day 46 — Kinetic Typography Lab

SPECIMEN 46: a six-section type specimen where the type itself is the exhibit — a variable-font hero that swells toward your cursor, a paragraph that scatters into 3D confetti under scroll pressure, a sentence riding a live sine wave, a headline you can grab and fling, a wall of words that ripples on touch, and opposing marquees that skew with scroll velocity.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-46-kinetic-type-lab/

## Tech

Vanilla JavaScript, GSAP 3.15 (ScrollTrigger, SplitText, Draggable — the formerly-club plugins are free since 3.13), Roboto Flex variable font (self-hosted woff2, wght 100–1000 + wdth 25–151, SIL OFL), Space Mono, SVG textPath

## One Thing Learned

Animating `font-weight` and `font-stretch` as plain numbers is dramatically cheaper than rewriting the `font-variation-settings` string every frame — the browser maps them straight onto the wght/wdth axes, GSAP's quickSetter can blast them at 60fps, and sizing each letter's slot at the maximum axis state means the line never reflows, so the swell is jitter-free.
