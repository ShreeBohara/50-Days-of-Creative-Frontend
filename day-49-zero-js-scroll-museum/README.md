# Day 49 — Musée Zéro: The Zero-JavaScript Scroll Museum

A long scrolling museum of eight exhibits where every motion is a CSS scroll-driven animation — and the building contains **zero JavaScript**. No `<script>` tags, no bundler, nothing to hydrate; the constraint is the flex, and the footer says so. The rooms: a reading-progress "thin red line" on `scroll(root)`; a hero foyer that scales, blurs and sinks away on its own `view()` exit range; a gallery of framed SVG paintings that un-clip (`clip-path` inset → 0) as they enter; three catalogue columns where the outer two ride the room's timeline in reverse; a horizontal scroll-snap postcard rack whose cards turn to face the centre via per-card `view(x)` timelines (cover-flow with no pointer math); a catalogue essay with a sticky conic-gradient dial that fills through the chapter's `contain` range — its percentage numeral typeset by a CSS `counter()` reading an animated `@property` integer; five sticky acquisition cards that pile up, each pressed smaller by its `exit-crossing` slice of a shared timeline; and a chromatic corridor that rotates a registered `--hue` once around the colour wheel over total scroll, repainting every `oklch()` wall in the building. Gallery aesthetic — warm plaster, hairline frames, serif plaques, condensed wayfinding numerals. Unsupported browsers get a polite "the lights are off" plaque via `@supports not`, and `prefers-reduced-motion` hangs every piece in its finished state.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-49-zero-js-scroll-museum/

## Tech

HTML + CSS only (`animation-timeline: scroll()` / `view()`, named view-timelines, `animation-range`, `@property`, `scroll-snap`, `oklch`/`color-mix`), Fraunces + Archivo variable fonts (self-hosted woff2, SIL OFL)

## One Thing Learned

A named `view-timeline` is only visible to *descendants* of the element that declares it — which quietly dictates your DOM order. The sticky chapter dial works because it lives inside the element carrying `view-timeline: --chapter`; the moment the mobile layout wanted the dial rendered *before* the essay, the fix wasn't `timeline-scope` but explicit grid placement, because a grid item's sticky containing block is its grid *area* — so the dial's area must span the full row (sharing it with the tall essay column) to leave room to travel. Scroll-driven CSS replaces scroll *listeners*, but it makes layout geometry part of the animation contract.
