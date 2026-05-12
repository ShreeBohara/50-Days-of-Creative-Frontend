# Day 33 — Animated Portfolio with Page Transitions

A designer/developer portfolio site with buttery page transitions, project case studies with scroll animations, an interactive about section, and attention to micro-interactions.

## Features

- **4 Pages** — Home, Work, Project Detail, About
- **Page Transitions** — AnimatePresence exit/enter slide animations
- **Shared Layout** — Project card thumbnail morphs into detail hero via layoutId
- **Custom Cursor** — 30px circle with mix-blend-mode difference, scales on interactive elements
- **Clip-Path Name Reveal** — Character-by-character wipe animation on Home
- **Typewriter Tagline** — Progressive text reveal with blinking cursor
- **Floating Shapes** — Continuously animated geometric background elements
- **Magnetic Buttons** — CTAs that subtly follow mouse within bounds
- **Hover Overlays** — Clip-path reveal on project cards
- **Animated Skill Bars** — Width animation triggered on viewport entry
- **Timeline Draw-In** — Vertical line draws itself, events pop in
- **Parallax Gallery** — Images move at different speeds on scroll
- **Branded Loader** — SVG stroke-draw text animation on initial load
- **Full-Screen Mobile Menu** — Clip-path circle reveal with staggered links
- **Responsive** — Mobile-first with breakpoints at 480px, 768px, 1024px

## Tech Stack

- React 19 + Vite
- Framer Motion (page transitions, layout animations, springs)
- React Router DOM (HashRouter for GitHub Pages)
- Lucide React (icons)
- Vanilla CSS (design system with custom properties)

## Design System

| Token | Value |
|-------|-------|
| Primary | `#18181B` |
| Accent | `#2563EB` |
| Background | `#FAFAFA` |
| Heading Font | Archivo |
| Body Font | Space Grotesk |

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/`, configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-33-animated-portfolio/`.
