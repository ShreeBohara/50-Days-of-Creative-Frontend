# Day 48 — Dither Lab

A one-hour photo lab for the 1-bit era: drop in any picture and print it through real dithering algorithms implemented from scratch on Canvas `ImageData` — Floyd–Steinberg and Atkinson error diffusion (with serpentine scan), ordered Bayer 4×4 / 8×8 matrices, newspaper halftone dots, and a blunt 1-bit threshold. Curated retro palettes (Game Boy, CGA neon, sepia, amber terminal, custom 2–6 inks) drive both the quantization *and* the page chrome — the UI accent retints itself to match the active palette. Split-view compare with a draggable seam, pixel-size / brightness / contrast controls, a CRT pass (RGB fringe, bloom, scanlines, vignette), style randomizer, and full-resolution PNG export. The default sunset is drawn procedurally on canvas, so the lab works before any upload.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-48-dither-lab/

## Tech

Vanilla JavaScript, Canvas 2D (no libraries), Pointer Events, Doto + IBM Plex Mono (self-hosted woff2, SIL OFL)

## One Thing Learned

Error diffusion can't run on the `Uint8ClampedArray` it reads from: pushed error must go *negative* and *past 255* on neighboring pixels to balance out, and the clamped array silently truncates those overshoots, visibly flattening shadows and highlights. Carrying the working image in a `Float32Array` and only clamping at the moment each pixel is matched against the palette keeps the diffusion exact — and is also what makes Atkinson's deliberately "lossy" 6/8 kernel read as airy contrast instead of banding.
