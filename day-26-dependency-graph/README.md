# Day 26 — Animated Dependency Graph

Interactive force-directed dependency explorer for a mock npm application graph.

## Features

- 49 deterministic npm-style packages with 80 dependency edges
- D3 force simulation with charge, collision, link distance, and center gravity
- SVG package nodes sized by graph importance and colored by category
- Curved Bezier dependency links with direction markers
- Drag nodes to pin and reheat the simulation
- Hover or focus a node to highlight connected packages and dim unrelated paths
- Click a package to inspect version, category, description, dependencies, and dependents
- Double-click expandable packages to load hidden dependency bundles
- Search packages by name, id, or description and zoom to the first match
- D3 zoom and pan with reset controls, label toggle, legend, and responsive mobile inspector

## Tech Stack

- React 19 + Vite 8
- D3 force, drag, and zoom
- Lucide React icons
- Fira Sans + Fira Code

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/`, configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-26-dependency-graph/`.
