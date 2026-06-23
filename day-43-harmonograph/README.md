# Day 43 — PENDULA · Harmonograph Studio

A virtual [harmonograph](https://en.wikipedia.org/wiki/Harmonograph): a Victorian
drawing machine where damped pendulums trace mesmerizing curves. Tune the
pendulums, watch a glowing pen draw the figure, browse presets, crossbreed two
figures, and export reproducible studies — all in an ink-blueprint studio.

**Live:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-43-harmonograph/

## The idea

Each axis is the sum of two damped sinusoids:

```
x(t) = Σ ampᵢ · sin(freqᵢ · t + phaseᵢ) · e^(−dampingᵢ · t)
y(t) = Σ ampⱼ · sin(freqⱼ · t + phaseⱼ) · e^(−dampingⱼ · t)
```

The whole model is pure and deterministic, so any figure can be reproduced from
its parameters — that is what powers the share links, presets and crossbreeding.

## Features

- **Live pendulum + global controls** — frequency, amplitude, phase, damping per
  pendulum, plus duration, resolution, line weight, glow and six ink palettes.
- **Animated pen draw** — the figure is traced by a glowing pen (respects
  `prefers-reduced-motion`, which renders it instantly).
- **Presets** — six curated figures, each shown as a live mini-thumbnail.
- **Randomize & mutate** — seeded generation and bounded, reproducible nudges.
- **Collection** — save, rename and delete figures, persisted to `localStorage`.
- **Blend lab** — deterministically crossbreed any two figures with a mix slider.
- **Export & share** — download a poster-ready SVG or PNG, or copy a link whose
  hash encodes the figure so it reopens exactly.
- **Keyboard** — `Space` replay · `R` randomize · `M` mutate · `S` save ·
  `⌘/Ctrl+Z` undo · `⇧⌘/Ctrl+Z` redo.

## Stack

React 19 · TypeScript · Vite · Zustand · SVG · Vitest. No canvas/runtime drawing
libraries — every curve is plain SVG generated from the math.

## Develop

```bash
npm install
npm run dev      # start the studio
npm test         # run the unit tests
npm run build    # type-check + production build
```

Fonts (Fraunces, Spline Sans Mono) are bundled via `@fontsource`, so the deployed
build does not depend on the Google Fonts CDN.
