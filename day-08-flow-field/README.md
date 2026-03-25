# Day 08 — Flow Field

Generative art powered by Perlin noise: thousands of particles trace organic
paths through an evolving vector field, building up luminous trail patterns
on a dark canvas. Choose from four curated color palettes and tune the noise
parameters in real time.

## Tech Used

- **Canvas 2D API** — particle rendering with additive blending and
  semi-transparent fade for persistent trails
- **Perlin noise** — classic improved noise (inline, no library) with
  3D sampling for time-evolving fields
- **Vanilla JavaScript** — no frameworks or dependencies

## What I Learned

Using `globalCompositeOperation: 'lighter'` for additive blending creates
a natural glow effect where overlapping particle trails intensify, producing
rich, luminous patterns without any post-processing.
