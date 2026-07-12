# Day 53 — GOO LAB · Liquid Effects Collection

A specimen cabinet of five liquid effects on one scrollable page: a gooey radial menu whose items ooze out of a button on liquid necks, cursor-following canvas metaballs (lava / mercury / slime themes), a replayable liquid loader that drips → splits → orbits → merges → resolves into a checkmark, melting "GOOEY" text with a live viscosity slider, and an ambient lava-lamp section — all grown from one small SVG goo filter.

**Tech:** Vanilla HTML/CSS/JS, ES modules, no libraries. Four of the five specimens share a single SVG `<filter id="goo">` (Gaussian blur → `feColorMatrix` alpha-contrast → composite); the viscosity slider drives a second filter's `stdDeviation` live. The metaballs are canvas, not SVG. Self-hosted variable fonts: Baloo 2 (rounded display) + Spline Sans Mono.

**One thing learned:** the classic goo look is *one* filter — blur everything, then use `feColorMatrix` to crank the alpha channel's contrast (`… 0 0 0 19 -9`) so soft edges snap back to hard ones after overlaps have already merged. But that only works because SVG composites overlapping shapes; true metaballs need the opposite — additively **sum** soft circles onto an offscreen buffer, then threshold the summed field into colour with a thin anti-aliased alpha ramp so the low-res buffer upscales smooth. Same visual language, two completely different engines.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-53-goo-lab/
