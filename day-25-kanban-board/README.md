# Day 25 — Drag-and-Drop Kanban Board

A Trello/Linear-style animated kanban board with silky cross-column drag-and-drop, inline editing, real-time search, and full persistence.

## Features

- **4 default columns** (Backlog, In Progress, Review, Done) — fully customizable
- **Drag & drop** cards between columns with Framer Motion layout animations
- **Drop zone indicators** with glowing insertion lines and pulsing empty zones
- **Inline editing** — double-click card titles or column headers to rename
- **Add Card form** — inline form with label color picker and priority selector
- **Card detail modal** — full editing (title, description, label, priority, due date, subtasks)
- **Label colors** (6 colors) and **priority badges** (Low/Medium/High/Urgent)
- **Real-time search** with text highlighting and dimmed non-matching cards
- **Filter panel** — filter by label color and/or priority level
- **Column features** — collapse/expand, rename, add/delete columns
- **LocalStorage persistence** — board state survives page reload
- **Responsive** — mobile snap-scroll columns, compact topbar
- **Keyboard support** — ESC cancels drag/edit, Enter confirms

## Tech Stack

- React 19 + Vite 8
- Framer Motion (drag, layout animations, AnimatePresence)
- Zustand (state management with persist middleware)
- Lucide React (icons)
- Plus Jakarta Sans (typography)

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is in `dist/`, configured for GitHub Pages at `/50-Days-of-Creative-Frontend/day-25-kanban-board/`.
