# Day 24 — Spotify-Style Music Player UI

A fully designed Spotify-like music player interface built with React, featuring animated album art, a waveform progress bar, playlist management, smooth page transitions, and a vinyl record Now Playing view.

## Features

- **Dark Spotify Theme** — True dark `#121212` background with green `#1DB954` accent
- **Home View** — Time-based greeting, quick picks grid, horizontal scroll album rows
- **Playlist View** — Gradient header from album colors, track list with hover states
- **Now Playing** — Full-screen overlay with spinning vinyl record and blurred background
- **Waveform Progress** — 80-bar generated waveform visualization with click-to-seek
- **Web Audio** — Real oscillator tone on play/pause (subtle sine wave)
- **Micro-interactions** — Like heart bounce, marquee text, equalizer animation
- **Responsive** — Mobile bottom nav, compact player bar, tablet collapsed sidebar

## Tech Stack

| Tech | Purpose |
|------|---------|
| React 19 | Component architecture |
| Vite 8 | Build tool |
| Framer Motion | Animations & page transitions |
| Lucide React | Icon library |
| Web Audio API | Oscillator for play state |
| CSS Custom Properties | Design tokens |

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Built output in `dist/` is configured for GitHub Pages deployment.
