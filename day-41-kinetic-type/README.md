# Day 41 — TYPEFORGE · Kinetic Type Studio

A type-specimen lab where a variable-font headline **morphs toward your cursor in
real time**. Drag across the letters and watch them swell, fall, ripple, glitch
or fall into focus — then snapshot the composition as a poster.

**Live:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-41-kinetic-type/

## Features

- **Cursor-reactive variable type** — a per-glyph rAF engine drives Fraunces'
  `opsz`, `wght` and `SOFT` axes (and Bricolage's `opsz`/`wght`) by pointer
  proximity, outside React's render loop for 60fps smoothness.
- **Six behaviors** — Magnet, Gravity (damped spring), Ripple (radiating weight
  waves), Glitch (chromatic-aberration jitter), Spotlight (focus pool) and
  Reveal (staggered entrance + breathe).
- **Six scenes** — curated bundles of font + palette + behavior + headline.
  Palettes set four base colors; the rest derive via `color-mix`.
- **Live controls** — editable headline, behavior switcher, and Field / Force /
  Rest-weight / Scale sliders.
- **Poster export** — download or copy the current frame as a 2× PNG.
- Responsive, keyboard-accessible, and respects `prefers-reduced-motion`.

## Tech

React 19 · Vite · variable fonts via `@fontsource-variable` (Fraunces,
Bricolage Grotesque) · `html-to-image` · IBM Plex Mono for the HUD.

## Develop

```bash
npm install
npm run dev
npm run build
```
