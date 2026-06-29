# Day 44 — MERIDIAN · Procedural Cartographer

A studio for charting imaginary worlds. From a single seed MERIDIAN grows an
island world — coastlines, elevation contours, rivers, biomes and procedurally
named capes and bays — then renders it as an engraved nautical chart on aged
parchment. Tune the world's genome, browse curated atlases, crossbreed two saved
worlds into a child map, and export reproducible studies.

**Live:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-44-cartographer/

## The idea

A world is a small **genome** — sea level, coast relief, mountain bias, an island
falloff, river count, a biome palette and a naming language. From it a pure,
deterministic pipeline:

1. builds a fractal-noise height field (fBm + domain warp), masked into an island
   and normalised so sea level always divides land from water;
2. classifies every cell into a biome band;
3. traces the coastline and elevation contours with **marching squares**;
4. runs rivers downhill from the highlands to the sea;
5. engraves procedural place-names at peaks, capes, bays, islets and towns.

Because the whole pipeline is pure, any chart reproduces exactly from its
parameters — which is what powers the share links, presets and crossbreeding.

## Features

- **Genome controls** — sea level, coast relief, island bias, mountains, terrain
  detail and roughness, river count and place-name density, plus five biome
  palettes (Atlas Sepia, Verdant, Arctic, Desert, Volcanic) and four naming
  languages.
- **Engraved chart** — hillshaded hypsometric tints, marching-squares coastline
  and contour lines, bathymetric soundings, rivers, graticule, compass rose,
  scale bar and a titled cartouche. The coastline draws itself in on each new
  world (respects `prefers-reduced-motion`).
- **Atlases** — six curated worlds, each shown as a live island thumbnail.
- **New world / mutate** — fully seeded generation and bounded, reproducible
  mutation.
- **Collection** — save, rename and delete worlds, persisted to `localStorage`.
- **Blend lab** — deterministically crossbreed any two worlds with a mix slider;
  numeric genes interpolate, palette and language are inherited by a seeded coin.
- **Export & share** — download a poster-ready SVG or PNG, or copy a link whose
  hash encodes the genome so the world reopens exactly.
- **Keyboard** — `Space` new seed · `R` randomize · `M` mutate · `S` save ·
  `⌘/Ctrl+Z` undo · `⇧⌘/Ctrl+Z` redo.

## Stack

React 19 · TypeScript · Vite · Zustand · SVG · Vitest. No mapping or canvas
drawing libraries — every coastline, contour and river is plain SVG generated
from the math. The hypsometric base layer is a small hillshaded raster embedded
straight into the SVG, so exports are self-contained.

## Develop

```bash
npm install
npm run dev      # start the studio
npm test         # run the unit tests
npm run build    # type-check + production build
```

Fonts (Cormorant Garamond, Libre Baskerville, IBM Plex Mono) are bundled via
`@fontsource`, so the deployed build does not depend on the Google Fonts CDN.
