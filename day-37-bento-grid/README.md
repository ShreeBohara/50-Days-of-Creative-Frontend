# Day 37 - Animated Bento Grid Portfolio

A privacy-conscious, Shree-inspired creative developer portfolio arranged as a twelve-module bento grid. Every card has its own interaction language, from a live analog clock and generated contribution heatmap to an accessible project modal and pointer-driven editorial portrait.

## Features

- Explicit asymmetric four-column bento grid with tablet and mobile layouts.
- Animated identity card, live Pacific-time analog clock, and fictional map location.
- Official technology icons with individual wobble interactions.
- Featured 50 Days project preview with a keyboard-managed details modal.
- Deterministic GitHub activity heatmap and animated commit count.
- Fictional Spotify now-playing module with progress and visualizer animations.
- Rotating original quotes and a privacy-safe synthetic editorial portrait.
- Creative-experience timeline and GitHub contact CTA.
- Persisted system-aware light/dark mode.
- Staggered entry choreography, unique card hovers, touch handling, and reduced-motion support.

## Tech Stack

- React 19 + Vite
- Framer Motion
- Lucide React and React Icons
- CSS Grid and plain CSS

## Design System

| Token | Dark | Light |
| --- | --- | --- |
| Page | `#08110f` | `#edf2e8` |
| Card | `#111e1a` | `#f8fbf5` |
| Text | `#f8fafc` | `#142019` |
| Signal | `#b7ff3c` | `#77c913` |
| Typography | Archivo + Space Grotesk | Archivo + Space Grotesk |

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run build
```

The production build is configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-37-bento-grid/`.
