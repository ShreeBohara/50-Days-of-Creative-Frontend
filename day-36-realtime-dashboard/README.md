# Day 36 - PulseGrid Real-Time Dashboard

PulseGrid is a simulated infrastructure-monitoring command center built with React and D3. It streams correlated server metrics into live cards, a rolling multi-axis chart, capacity gauges, a historical heatmap, and a threshold-crossing alert log.

## Features

- Six streaming metric cards with trends, D3 sparklines, and labeled severity states.
- Realistic correlated telemetry with mean reversion, periodic load, bounded noise, and incident spikes.
- D3 rolling chart with CPU, memory, network in, and network out series.
- Pointer crosshair with native-unit values and keyboard-accessible legend toggles.
- Accessible 24x7 historical load heatmap with keyboard and pointer inspection.
- Animated CPU, memory, and disk radial gauges.
- Alert log that records warning and critical threshold crossings.
- Pause/resume, `0.5x` to `5x` simulation speed, and eight-second Chaos Mode.
- Validated per-metric warning and critical threshold configuration.
- Responsive layouts, visible focus states, and reduced-motion support.

## Tech Stack

- React 19 + Vite
- D3.js
- Lucide React
- Plain CSS

## Design System

| Token | Value |
| --- | --- |
| Background | `#020617` |
| Panels | `#0b1426`, `#0f1a2e` |
| Text | `#f1f5f9` |
| Muted Text | `#8fa1b8` |
| Data Accents | Cyan, violet, teal, indigo |
| Severity | Green, amber, rose |
| Typography | Fira Sans + Fira Code |

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

The production build is configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-36-realtime-dashboard/`.
