# Day 35 - Animated Pricing Page

A premium React pricing page for HelioStack with GSAP Flip plan morphs, rolling price transitions, add-on pricing, currency conversion, a feature comparison matrix, and an animated FAQ.

## Features

- Three pricing tiers: Starter, Pro, and Enterprise.
- Monthly and yearly billing toggle with a 20% annual savings state.
- GSAP Flip card reordering when yearly billing promotes Pro.
- GSAP-driven rolling price values for plan, add-on, currency, and total changes.
- Toggleable add-ons that update the selected plan total.
- Currency selector for USD, EUR, and GBP with fixed conversion rates.
- Feature comparison matrix with ScrollTrigger row reveals and checkmark pops.
- Accessible FAQ accordion with smooth height animation.
- Responsive mobile layout, visible focus states, and reduced-motion support.

## Tech Stack

- React 19 + Vite
- GSAP with Flip and ScrollTrigger
- Lucide React icons
- Plain CSS

## Design System

| Token | Value |
| --- | --- |
| Background | `#ffffff`, `#fdf4ff` |
| Text | `#1f1147` |
| Muted Text | `#74617d` |
| Accent | `#f97316` |
| Violet | `#d946ef` |
| Font | DM Sans |

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/`, configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-35-pricing-page/`.
