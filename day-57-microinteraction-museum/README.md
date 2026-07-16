# Day 57 — Micro-Interaction Museum

Eight product-grade UI interactions rebuilt from first principles and presented as an
editorial collection of motion studies.

## Exhibits

- Sonner-inspired stacked toasts with depth, queue overflow, pausable lifetimes, and swipe dismissal
- Vaul-inspired bottom drawer with rubber-band drag, velocity-aware release, and page scaling
- Directional dual-spring “magic ink” tabs with complete keyboard navigation
- Measured smart button that morphs through idle, loading, and success states
- Per-digit USD ticker with stable place-value identities and animated punctuation reflow
- Pointer- and keyboard-accessible 1.2-second hold-to-confirm interaction
- Concurrent seeded heart/spark particle bursts with squash-and-stretch feedback
- Dynamic-island-style pill that interpolates across three information densities

Every exhibit has an isolated replay control, cleans up its own timers and listeners, and
preserves state meaning when reduced motion is requested.

## Tech

- React 19 + Vite 8
- Motion for React
- Plain CSS, inline SVG, and self-hosted variable fonts
- Vitest + React Testing Library

## One thing learned

The most convincing micro-interactions separate **decision logic** from **motion output**.
Drawer thresholds, queue promotion, digit identity, hold milestones, and particle vectors
are deterministic data first; springs and keyframes then make those decisions feel physical.
That split keeps rich animation testable without flattening its personality.

## Run locally

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

The production build is configured for GitHub Pages at
`/50-Days-of-Creative-Frontend/day-57-microinteraction-museum/`.

## Live demo

<https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-57-microinteraction-museum/>
