# Day 11 — SVG Draw-On-Scroll

A dark, editorial-styled landing page where SVG line art illustrations draw themselves as you scroll. Five scenes — city skyline, mountain range, rocket launch, neural circuit, and ocean waves — progressively reveal their strokes using `stroke-dasharray` and `stroke-dashoffset` driven by scroll position.

## Features

- **Scroll-driven SVG drawing** — each path animates with staggered delays for a layered reveal
- **Self-drawing hero title** — "DRAW" letterforms animate on page load via CSS keyframes
- **Parallax text** — scene labels, titles, and descriptions move at different scroll speeds
- **Section color transitions** — gradient blends between distinct section palettes
- **Navigation dots** — fixed right-side dots with click-to-scroll and active tracking
- **Scroll progress bar** — rainbow gradient line on the right edge
- **Grain overlay** — subtle noise texture for depth
- **SVG glow** — `drop-shadow` filter matching each section's accent color

## Tech

Vanilla HTML, CSS, JavaScript. Google Fonts (Syne + Libre Baskerville). No frameworks or build tools.
