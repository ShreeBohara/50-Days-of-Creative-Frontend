# Day 58 — One Year of Coffee

An eight-chapter scrollytelling essay that turns 1,000 fictional coffee receipts
into one persistent field of Canvas particles. The same dots become a cloud, a
40×25 receipt grid, five drink clusters, monthly stacks, a 24-hour ring, a weekly
trend, a seven-cup outlier, and finally a coffee-cup constellation.

## Story chapters

1. **One Year of Coffee** — an ambient cloud introduces the full dataset.
2. **Every dot is a coffee** — a chronological grid supports pointer, touch, and keyboard inspection.
3. **Five drinks, one habit** — labeled clusters preserve every espresso, latte, filter, cappuccino, and decaf.
4. **It became routine** — monthly stacks reveal the rising habit and December vacation gap.
5. **I am a morning person** — a 24-hour density ring highlights the derived peak hour.
6. **The trend was up** — 52 weekly cups-per-day averages collapse into a line and area chart.
7. **That one Tuesday** — the field dims around exactly seven purchases on September 16.
8. **A year, held in one cup** — all particles resolve into a cup, handle, saucer, and steam.

Every number in the copy, labels, tooltips, and finale comes from the same
`summarizeDataset()` result. The seeded generator always produces exactly 1,000
chronological 2025 purchases while preserving the intended morning, Monday,
later-year, vacation-gap, and outlier patterns.

## Tech

- Semantic HTML and responsive CSS with self-hosted Newsreader and Archivo fonts
- Dependency-free JavaScript ES modules
- DPR-aware Canvas particle rendering with interruptible, time-based easing
- IntersectionObserver, ResizeObserver, and a keyboard-accessible progress rail
- Node's built-in test runner

## Accessibility and motion

The Canvas exposes a live text description for every chapter. The receipt grid
supports arrow keys, Home, End, and Escape; all navigation controls meet the 44px
touch target; and focus remains visible inside the clipped visualization. Motion
can be paused manually, snaps under `prefers-reduced-motion`, suspends in hidden
tabs, and stops requesting frames when the particles settle.

## Run locally

Serve the repository root so relative gallery links behave like GitHub Pages:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173/day-58-scrollytelling-coffee/>.

## Verify

```bash
cd day-58-scrollytelling-coffee
npm test
npm run check
```

## One thing learned

Scrollytelling feels continuous when particles keep their identity. A scene
change should only assign new targets; it should never recreate the dots. That
small architectural rule makes reverse scrolling, rapid chapter skips, resize,
and reduced-motion snapping all agree with the same data story.

## Live demo

<https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-58-scrollytelling-coffee/>
