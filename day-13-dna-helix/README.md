# Day 13 — Interactive DNA Helix

A 3D double helix DNA strand rendered with Three.js. Base pairs are color-coded by nucleotide type (A-T, G-C). Click any base pair to inspect it, or use the unwind/rewind controls to morph between helix and flat ladder forms.

## Features

- Two backbone strands spiraling as parametric tubes
- 36 base pairs with biologically accurate pairing (A-T / G-C)
- Color-coded nucleotide spheres at connection points
- Click-to-inspect with glassmorphism info panel
- Sequence bar for quick navigation
- Smooth unwind/rewind morph animation
- Ambient floating particles with additive blending
- UnrealBloomPass post-processing for bioluminescent glow
- Auto-rotation with toggle control
- Responsive layout with mobile bottom-sheet panel

## Tech

Three.js (ES module via importmap), vanilla JavaScript, CSS glassmorphism, Syne + Space Mono fonts.

## What I Learned

Parametric helix geometry, real-time tube geometry rebuilding during morph animations, Three.js raycasting for object selection, and UnrealBloomPass post-processing for glow effects.

## Live Demo

[View on GitHub Pages](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-13-dna-helix/)
