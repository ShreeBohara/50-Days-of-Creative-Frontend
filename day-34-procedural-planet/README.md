# Day 34 — Procedural Planet Generator

A full-screen React Three Fiber planet generator with custom GLSL terrain, clouds, atmosphere, night-side city lights, and live sun/seed controls.

## Features

- **Shader Terrain** — 128-segment sphere displaced with seeded simplex/fbm noise.
- **Height Biomes** — Deep ocean, shallow water, beach, grass, forest, stone, snow, and polar snow blending.
- **Water Specular** — Ocean areas pick up tight highlights while land stays matte.
- **Atmosphere** — Transparent Fresnel shell with adjustable thickness and sun wrap.
- **Cloud Layer** — Procedural animated noise clouds rotating above the surface.
- **Day/Night** — Directional sun shading with warm city-light clusters on the dark side.
- **Controls** — Seed input, ocean level, mountain height, cloud density, atmosphere thickness, rotation speed, sun azimuth/elevation, randomize, and reset.
- **Responsive HUD** — Desktop side panel and mobile bottom sheet with touch-friendly controls.
- **Accessibility** — Labeled inputs, visible focus states, and reduced-motion support.

## Tech Stack

- React 19 + Vite
- React Three Fiber
- Drei
- Three.js
- Custom GLSL shaders
- Lucide React icons

## Design System

| Token | Value |
| --- | --- |
| Background | `#0B0B10` |
| Text | `#F8FAFC` |
| Accent | `#3B82F6` |
| HUD Accent | `#00FFFF` |
| Heading Font | Exo |
| Body/Data Font | Roboto Mono |

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/`, configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-34-procedural-planet/`.
