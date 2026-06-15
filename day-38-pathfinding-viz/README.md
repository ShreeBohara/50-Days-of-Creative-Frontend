# Day 38 - Route Lab Pathfinding Visualizer

Route Lab is a high-DPI Canvas pathfinding workspace for drawing terrain, generating mazes, and comparing search algorithms on one shared map.

## Features

- Single-channel and synchronized side-by-side comparison modes.
- A* Manhattan, A* Euclidean, Dijkstra, BFS, DFS, and Greedy Best-First search.
- Wall, weighted terrain, endpoint placement, and eraser tools with mouse, touch, and keyboard input.
- Purple-to-blue exploration ripples followed by a sequential glowing gold route trace.
- Random Walls, Recursive Division, Recursive Backtracker, and Spiral maze generators.
- Compact, standard, and dense grid presets.
- Live nodes visited, path length, weighted route cost, computation time, and run status.
- Cancellable visualization speed from instant to 50ms per step.
- Responsive mobile grid scrolling, visible focus states, live announcements, and reduced-motion support.

## Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Visualize or cancel |
| `C` | Clear visualization path |
| `R` | Generate random walls |
| Arrow keys | Move the focused Canvas cursor |
| `Enter` | Apply the selected terrain tool |

## Tech Stack

- React 19 + Vite 8
- High-DPI HTML Canvas
- Lucide React
- Vitest
- Plain CSS

## Run Locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run lint
npm run test
npm run build
```

The production build is configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-38-pathfinding-viz/`.

