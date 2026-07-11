# Day 52 — VOID POST · Infinite Drag Universe

An infinitely draggable universe of postcards from nowhere. Grab the void and fling it — a 5×4 field of twenty generated SVG postcards wraps seamlessly in every direction, forever. Flick for momentum, click a card to expand it, double-click to glide anywhere, or go idle and let the field wander on its own.

**Tech:** Vanilla HTML/CSS/JS. No libraries — the drag inertia (velocity sampling + friction glide), infinite modulo wrapping, FLIP expand overlay, and parallax starfield are all hand-rolled. Postcards are seeded generative SVG built with `createElementNS` (10 scene motifs × 5 palettes). Self-hosted variable fonts: Syne + Martian Mono.

**One thing learned:** if you size the recycled tile pool to a whole number of pattern repeats (10×4 slots for a 5×4 pattern), each pool slot can keep the same postcard for its entire life — infinite scrolling then needs zero content reassignment, just `((pos + offset) % poolSize + poolSize) % poolSize` per tile per frame.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-52-infinite-drag-universe/
