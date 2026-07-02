# Day 45 — VITRAIL · Procedural Stained-Glass Atelier

A cathedral glazier's workshop in the browser. From a single seed VITRAIL grows
a stained-glass window — a rose wheel, a lancet, or a three-light triptych —
tessellated into leaded panes and glazed in jewel glass. Tune the window's
genome, browse the canon, crossbreed two windows into a child, keep favourites
in the reliquary, and export poster-ready SVG/PNG or a link that regrows the
exact window.

**Live:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-45-vitrail/

## The idea

A window is a small **genome** — archetype, rotational symmetry, ring count,
pane density, tracery style, lead width, glass palette, per-pane jitter and a
medallion motif. From it a pure, deterministic pipeline:

1. **tessellates** the frame into leaded pane cells — concentric sector rings
   with petal or ogee heads for roses; a grid body under a two-centre pointed
   arch with nested head bands for lancets; three arched lights for triptychs;
2. **glazes** every pane: rings cycle through the palette from a seeded offset,
   accents strike at a seeded rhythm, and each pane's hue/lightness wobbles
   like hand-blown glass;
3. **christens** the window with a procedural title (*Rose of Saint Gudula*,
   *The Vesper Lancet*…).

Because the whole pipeline is pure, equal genomes give pixel-identical windows —
which is what powers the share links, presets and crossbreeding.

## Features

- **Genome controls** — archetype (rose / lancet / triptych), 6–16-fold
  symmetry, rings, density, tracery style (geometric / foil / flamboyant), lead
  came width, glass jitter and medallion motif (star, blossom, cross, oculus).
- **Six glass palettes** — Chartres, Sainte-Chapelle, Greenwood, Embers,
  Grisaille, Rosarium — kept as HSL glass hues so jitter behaves like real
  pot-metal glass.
- **Illumination reveal** — panes bloom ring by ring as if sun passes behind
  the glass; the sunlight overlay breathes on an 11s cycle. Both respect
  `prefers-reduced-motion`.
- **The Canon** — six curated windows rendered as live thumbnails.
- **Blend lab** — capture any two windows as parents; the lab breeds a
  deterministic child (numeric genes interpolate at seeded ratios, categorical
  genes inherit whole by a seeded coin).
- **Reliquary** — keep, rename and delete windows, persisted to `localStorage`.
- **Export & share** — standalone SVG, 2× PNG, or a `#w=` link that encodes the
  genome so the window regrows exactly.
- **Keyboard** — `Space` new seed · `R` randomize · `M` mutate. Undo/redo with
  history coalescing for slider scrubs.
- **A11y** — labelled controls, focus rings, 44px coarse-pointer targets,
  screen-reader announcements of each new window.

## Stack

React 19 · TypeScript · Vite · Zustand · SVG · Vitest. No drawing libraries —
every arc, foil and ogee is a hand-built SVG path: annular sectors, circumcircle
lobes, tangent-circle n-foils and two-centre pointed arches sampled into
polyline bands. 75 unit tests cover the geometry, tessellation, glazing,
blending, serialization and store.

## Develop

```bash
npm install
npm run dev      # start the atelier
npm test         # run the unit tests
npm run build    # production build (tsc + vite)
```

Part of [50 Days of Creative Frontend](../README.md).
