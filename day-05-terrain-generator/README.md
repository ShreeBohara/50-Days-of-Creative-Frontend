# Day 05 — Procedural 3D Terrain Generator

A procedurally generated 3D terrain with height-based biome coloring, interactive parameter controls, and cinematic camera modes.

## Tech Used

- **Three.js** — 3D rendering, lighting, fog, orbit controls
- **Simplex Noise** — fractal Brownian motion (fBM) for natural terrain displacement
- **Vanilla JavaScript** — ES modules via import maps, no build step
- **CSS** — glassmorphism control panel, custom range inputs, responsive layout

## Features

- 200x200 subdivided plane with simplex noise vertex displacement
- 7-zone biome coloring with smooth gradient interpolation (deep water → snow)
- Semi-transparent animated water plane
- Interactive control panel: seed, amplitude, frequency, octaves, water level
- Three camera modes: auto-orbit, flyover, and manual
- Exponential fog for atmospheric depth
- Warm/cool lighting contrast (golden directional + blue ambient)
- Mobile-optimized with reduced geometry and bottom-sheet controls

## What I Learned

Using the same analyser pipeline — layering multiple octaves of simplex noise with lacunarity and persistence — to produce natural-looking terrain from a single noise function. Flat shading with vertex colors catches directional light on each triangle facet, creating a stylized low-poly look that reads as both geometric and organic.
