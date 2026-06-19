# Day 40 - WebGL Earth Globe

An interactive React Three Fiber Earth command center with generated map textures, data arcs, city markers, heatmap overlays, and time-of-day lighting.

## Features

- Generated Earth color and bump textures from `world-atlas`, `topojson-client`, and D3 geo projections.
- Atmospheric Fresnel glow, procedural cloud layer, starfield, sun marker, and day/night terminator.
- 30 clickable city markers with hover tooltips, night-side city lights, and selected-node telemetry.
- Three route datasets: Flight Routes, Trade Volume, and Internet Traffic.
- Animated great-circle route arcs with intensity colors and traveling pulse packets.
- Toggleable heatmap layer with clickable country/region hotspots.
- City search with camera fly-to, live dataset summaries, and time-of-day sun control.
- Responsive HUD layout, touch-sized controls, visible focus states, and reduced-motion support.

## Tech Stack

- React 19 + Vite
- React Three Fiber, Drei, Three.js
- GLSL shader material for atmosphere
- D3 geo, TopoJSON, world-atlas
- Lucide React icons
- Vitest

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run build
```

Built output is configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-40-earth-globe/`.
