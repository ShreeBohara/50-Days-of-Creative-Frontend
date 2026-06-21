# Day 42 — FLORA LAB

FLORA LAB is a scientific-editorial botanical genetics studio for growing
impossible plants. Every specimen is rendered as deterministic SVG geometry:
the same DNA seed always recreates the same branches, leaves, and blooms.

**Live:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-42-flora-lab/

## Features

- Versioned plant DNA with architecture, foliage, bloom, and pigment traits.
- Path-keyed seeded randomness, so editing foliage never scrambles branches.
- Six curated field studies, random generation, and bounded mutation.
- Undo/redo history with keyboard shortcuts.
- A persistent 12-specimen field archive stored locally in the browser.
- Deterministic two-parent crossbreeding with three reproducible hybrids.
- Standalone SVG, 2400×3000 PNG, and shareable DNA-link exports.
- Responsive controls, keyboard focus states, live announcements, and reduced-motion support.

## Tech

React 19 · TypeScript · Vite · Zustand · SVG · Canvas · Vitest · Lucide

Fonts are bundled locally with Fontsource: Newsreader, Manrope, and IBM Plex Mono.
No server, account, external API, or runtime CDN is required.

## Develop

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

The Vite base path is configured for the nested GitHub Pages route.

## Keyboard

- `R` — generate a new seed
- `M` — apply a bounded mutation
- `Ctrl/Cmd + Z` — undo
- `Ctrl/Cmd + Shift + Z` — redo
