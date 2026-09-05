# Day 63 — Poster Machine (Generative Poster Tool)

Type a headline, pick a system and a palette, and reroll until a poster
clicks — then export it at print resolution. Every poster is a pure
function of a readable seed code (`SWS-7K2Q-C`), so pasting a code, or
opening a link that carries it in the hash, reproduces the exact same
poster on any machine at any size. The tool chrome is a neutral warm-gray
studio; the posters are the only colour in the room.

## The five systems

1. **Swiss Grid** — a strict modular grid (4/6/8/12 columns) with the
   headline set huge and broken across gridlines by per-line column
   shifts, one accent block placed by rule, rotated index labels at grid
   intersections and a single rule line.
2. **Flow Field** — 2000 short strokes riding a seeded noise field, packed
   inside an invisible letterform of the headline's first letter (a fixed
   192×256 mask sampled in fraction space) and sparse outside it.
3. **Bauhaus** — circles, semicircles, quarters, arcs, triangles and bars
   from twelve data-only arrangement rules, jittered and colour-cast per
   slot, multiplied on paper or screened on dark palettes; the headline
   runs vertically along one edge.
4. **Terrain** — 40–72 stacked ridgelines shaped by Gaussian envelopes
   across the width and through depth, painted back to front with
   paper-coloured occlusion and a depth colour ramp; the headline is
   knocked out of the flat, densest stack so it reads as negative space.
5. **Glitch Stripes** — the headline typeset huge on its own layer over a
   duotone noise field, torn by seeded disjoint slices with wraparound,
   channel-shifted tinted copies, scanlines and dark bands.

## The machinery

- Everything renders into a **1200×1600 unit** virtual page under one
  `ctx.scale()`, so the on-screen poster, the five picker minis, the
  gallery thumbnails and the 2400×3200 export share one code path.
- Each system is split into a pure `plan(rng)` and a canvas `draw()`.
  Every random decision happens in `plan()` with a **fixed draw budget**
  (tests assert it never varies with the text), so a seed means the same
  composition at every size and in every palette.
- Seeds: a 20-bit layout seed salted per system (`mulberry32` + a
  murmur-style hash), a 15-bit palette seed, and a seeded 2D simplex
  field. Codes are `SYS-LLLL-P` in Crockford base32 (no I/L/O/U;
  confusables mapped on decode).
- **Reroll** draws a new composition and a new palette identity, each
  freezable by its lock; Space rerolls too (never while typing). A ghost
  canvas gives the 150 ms crossfade.
- Eight curated palettes plus a seeded generator (scheme, hue, light or
  dark paper) repaired against the same WCAG contrast guard the curated
  set is tested with — fuzzed over 500 seeds.
- Finish (seeded grain under `overlay`, paper under `multiply` with a
  vignette) is drawn last in poster units, so export matches the screen.
- Export re-renders the seed at exactly 2× into an offscreen canvas and
  falls back to 1800×2400 if the device refuses the full size.
- The gallery keeps the last eight rerolls; thumbnails are re-rendered
  from snapshots (never a mid-fade frame) and click to restore.

## Tech

- Vanilla ES modules + Canvas 2D. No dependencies, no build step.
- Seeded PRNG, hashing and simplex noise implemented inline.
- 90 node tests over the pure logic (seeds, noise, text fitting, state
  reducer, each system's plan and geometry, palettes, seed codes,
  history, export sizing).
- Self-hosted Hanken Grotesk + Red Hat Mono (variable woff2, OFL).
- Labelled controls with `aria-pressed` / `aria-current`, a live region
  for every action, and `prefers-reduced-motion` support.

```bash
npm test
```

**Responsive:** under 900 px the studio stacks — poster stage, gallery
strip, then the panel with the seed/Reroll section sticky while you
scroll; swatches go two-up and targets grow to 44 px on touch.

**One thing learned:** "knock the headline out of the densest region"
is a trap if you read *densest* as *tallest*. In a Joy Division stack the
lines fan apart at the peak, so a knockout there is invisible; the lines
pack tightest in the flat stack just in front of the peak, and that is
where negative-space type actually reads. Also: `measureText` ignores the
canvas transform, which is exactly what makes one text-fitting pass valid
for a 447 px preview and a 2400 px export alike.

**Live demo:** <https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-63-poster-machine/>
