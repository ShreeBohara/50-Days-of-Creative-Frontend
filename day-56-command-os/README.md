# Day 56 - CommandOS (⌘K Command Palette)

CommandOS is a polished ⌘K command palette built from scratch — no `cmdk`, no UI kit —
over a demo product dashboard, in the Raycast / Linear keyboard-first tradition.

## Features

- Open with ⌘K / Ctrl+K or the search field; close on ESC or backdrop click, with a
  scale + fade animation driven purely by a `data-state` flip (no rAF, so it never
  stalls in a background tab).
- From-scratch fuzzy search: a subsequence scorer with consecutive-run, word-boundary,
  and start-of-string bonuses (label-first, keyword fallback) with matched characters
  highlighted. Covered by a Vitest suite.
- Grouped results — Recent / Actions / Navigation / Documents / Theme — with full keyboard
  control: ↑↓ (and Ctrl+n/p) move with scroll-into-view, Enter runs, ⌘+number jumps to a
  group, Backspace on an empty query steps out of a nested page.
- Commands actually change the dashboard: toggle the sidebar, navigate, open a document,
  copy the page link, and create a document (animated row entrance).
- Nested pages with an accent breadcrumb chip: "Change theme…" (Appearance + Accent, with
  live hover/keyboard preview on the whole dashboard) and "Assign to…" (people, with a
  shimmer loading state).
- Recents persisted to `localStorage`, an empty state with a fallback action, and toast
  confirmations for actions.
- Responsive: a full-screen sheet on mobile. Accessible: combobox + `aria-activedescendant`,
  Tab trap, focus restore on close, and reduced-motion support.

## One thing learned

Cross-document React portals still route synthetic events through the React tree, but
mounting/animating a portal must never depend on `requestAnimationFrame` — it's throttled
in background tabs, which silently prevented the palette from opening. Keeping the palette
mounted and animating from a `data-state` attribute (plus CSS `visibility`) made open/close
reliable everywhere.

## Tech Stack

- React 19 + Vite 8
- Custom fuzzy matcher (no library)
- Vitest
- Plain CSS (self-hosted Inter + Geist Mono via `@fontsource`)

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

The production build is configured for GitHub Pages at
`/50-Days-of-Creative-Frontend/day-56-command-os/`.

## Live Demo

<https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-56-command-os/>
