# Day 54 — MESH / 54 · Mesh Gradient Studio

An immersive animated mesh-gradient generator with six reusable color points, eight curated palettes, seeded organic drift, film grain, vignette, live controls, interruptible randomization, ambient screenshot mode, 1080p PNG wallpaper export, and a pure-CSS approximation copier.

**Tech:** Vanilla HTML/CSS/JavaScript, ES modules, Canvas 2D, a locally implemented seeded simplex-noise function, and self-hosted Bricolage Grotesque + IBM Plex Mono. No runtime libraries or build step.

**One thing learned:** soft mesh gradients do not need an expensive blur filter. Drawing large screen-blended radial fields to a canvas at one-eighth size and smoothly upscaling that tiny buffer produces a silkier wash at a fraction of the cost. Keeping all positions normalized also lets the same scene render consistently to any viewport, a 1920×1080 wallpaper, or layered CSS gradients.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-54-mesh-gradient-studio/
