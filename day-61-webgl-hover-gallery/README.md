# Day 61 — Aperture 61 (WebGL Hover Gallery)

A minimal photography portfolio where none of the photographs exist. Six
"frames" are generated at load on offscreen canvases (gradient landscapes,
a duotone bust, Bauhaus geometry, a starfield, leaf shadows), uploaded to
the GPU once, and rendered as textured planes on a single fullscreen WebGL
canvas that sits behind the page — each plane pixel-locked to its DOM grid
slot on every scroll and resize.

Hovering pushes the image through the active fragment shader; clicking
tweens the plane to fullscreen while the distortion settles to zero.
Raw WebGL1, no libraries, no photographs harmed.

## The lenses

1. **Ripple** — concentric sine rings radiate from the cursor,
   aspect-corrected so they stay circular; the splash calms with time
   since entry and stirs back up with cursor speed.
2. **Flow RGB** — noise-driven UV drift toward the cursor with the red
   and blue channels sampled at separated offsets; fast swipes tear the
   chromatic fringe apart.
3. **Pixelate** — a fixed mosaic grid (density set by cursor velocity)
   crossfaded in by cursor proximity; an *invert field* checkbox flips it
   so the edges shatter and the cursor carries a window of clarity.
4. **Melt** — rows below the cursor sample compressed toward the cursor
   row, so the paint drips downward at per-column noise rates, with a
   wet-sheen darkening at full stretch.

## The machinery

- One unit quad, five tiny programs (passthrough + four effects), all
  compiled at boot — switching lenses is a `useProgram` rebind.
- Layout is measured only when it can change (boot, resize, font load,
  document-size change); every tick derives viewport rects from the
  document-space cache plus `scrollY`. Zero per-frame layout reads.
- Hover is a hit-test inside the tick, not `pointerenter` — per-plane
  `u_mouse` / `u_hover` / `u_sinceEnter` ease through frame-rate-independent
  exponential smoothing, and `u_velocity` feeds a spike-and-drain tracker.
- Click-to-expand tweens the plane's rect to fullscreen (`easeInOutQuart`,
  650 ms out / 480 ms back) while hover scales to zero; landing back in
  the grid fires a burst of the active effect. ESC or any click returns.
- Planes breathe ±2 % on a phase-offset sine so the grid never sits still.
- No WebGL? The generated canvases mount straight into the grid as a
  static gallery and the controls disable themselves.

## Tech

- Vanilla ES modules + raw WebGL1 + GLSL. No dependencies at all.
- Textures are pure data: recipes are op-lists (`textureRecipes.js`)
  interpreted onto 1024² canvases, so the "photos" are unit-testable.
- 43 node tests over the pure logic (rect→clip mapping, cover-crop UVs,
  easing/hover/velocity state machines, recipe validation, registry).
- Touch: tap pulses the effect in place, second tap expands.
  `prefers-reduced-motion` freezes breathing and the ambient clock,
  caps hover, and swaps the tween for a quick 150 ms cut.
- Self-hosted Gloock + DM Mono (woff2, OFL), soft lens cursor via
  `mix-blend-mode: difference` on fine pointers only.

```bash
npm test
```

**Responsive:** the asymmetric 12-column editorial grid collapses to a
single column under 720 px, offsets flatten, and touch targets grow on
coarse pointers.

**One thing learned:** reversed `smoothstep` edges are undefined behavior
in GLSL — `smoothstep(0.55, 0.05, x)` really does return 0 on some
drivers, so falloff fields must be written `1.0 - smoothstep(lo, hi, x)`.
Also: a spatially-varying pixelation cell count dissolves the mosaic
(neighboring texels snap to different lattices) — keep the grid fixed per
frame and crossfade the *amount* instead.

**Live demo:** <https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-61-webgl-hover-gallery/>
