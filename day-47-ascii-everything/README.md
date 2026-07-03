# Day 47 — ASCII Everything

SIG-47: a real-time ASCII renderer styled as a phosphor terminal instrument — point your webcam, drop an image, or watch the built-in metaball demo dissolve into live text. Character ramps (classic / blocks / binary / custom), resolution and contrast controls, five phosphor modes that retint the entire rig (green, amber, white, source colors, Game Boy), a CRT scanline pass, copy-the-frame-as-text, and PNG export. Even the page title is generated ASCII, sampled from a hidden canvas at load.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-47-ascii-everything/

## Tech

Vanilla JavaScript, Canvas 2D (no libraries), `getUserMedia`, Clipboard API, JetBrains Mono variable font (self-hosted woff2, SIL OFL)

## One Thing Learned

A monospace grid is only a grid if every glyph advances exactly one cell — custom ramps (blocks, symbols, emoji) can fall back to a different font with a different advance width and silently shear all the columns. Measuring each ramp glyph once with `ctx.measureText` and switching from the fast one-`fillText`-per-row path to per-cell placement when widths disagree keeps arbitrary user ramps aligned without giving up the fast path for plain ASCII.
