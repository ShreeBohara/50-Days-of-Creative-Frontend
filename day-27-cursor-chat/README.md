# Day 27 — Multi-Tab Cursor Chat Room

A local Figma-style multiplayer presence demo built with React, Zustand, and the BroadcastChannel API.

## Features

- Per-tab generated collaborator identity with editable display name and unique color
- BroadcastChannel room protocol for join, hello, cursor, typing, chat, reaction, idle, and leave events
- Normalized cursor coordinates so different browser sizes stay in sync
- Remote SVG cursors with name tags, typing dots, idle badges, pop-in, and poof-out states
- Short fading cursor trails for remote collaborators
- Click-to-send emoji reactions plus a right-click radial reaction picker
- Floating chat bubbles that appear near the sender's cursor and fade after 5 seconds
- Connected users panel with live, idle, and leaving states
- Responsive mobile layout with a touch-friendly reaction button
- Accessible focus states, reduced-motion handling, and 44px minimum touch targets

## Tech Stack

- React 19 + Vite 8
- Zustand
- BroadcastChannel API
- Lucide React icons
- CSS animations

## Run Locally

```bash
npm install
npm run dev
```

Open the same local URL in two or more tabs to test multiplayer presence.

## Build

```bash
npm run build
```

Output is in `dist/`, configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-27-cursor-chat/`.
