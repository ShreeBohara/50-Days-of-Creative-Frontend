# Day 44 — MERIDIAN · Procedural Cartographer

A studio for charting imaginary worlds. From a single seed MERIDIAN grows an
island world — coastlines, elevation contours, rivers, biomes and procedurally
named capes and bays — then renders it as an engraved nautical chart on aged
parchment. Tune the world's genome, browse curated atlases, crossbreed two saved
worlds into a child map, and export reproducible studies.

**Live:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-44-cartographer/

## The idea

A world is a small **genome** — sea level, relief, mountain bias, an island
falloff, river count, a biome palette and a naming language. From it a pure,
deterministic pipeline builds a fractal-noise height field, classifies it into
biomes, traces the coastline and contour lines with marching squares, runs
rivers downhill to the sea, and engraves place-names. Because the whole pipeline
is pure, any chart reproduces exactly from its parameters — which is what powers
the share links, presets and crossbreeding.

## Stack

React 19 · TypeScript · Vite · Zustand · SVG · Vitest. No mapping or canvas
drawing libraries — every coastline, contour and river is plain SVG generated
from the math.

## Develop

```bash
npm install
npm run dev      # start the studio
npm test         # run the unit tests
npm run build    # type-check + production build
```

Fonts (Cormorant Garamond, Libre Baskerville, IBM Plex Mono) are bundled via
`@fontsource`, so the deployed build does not depend on the Google Fonts CDN.
