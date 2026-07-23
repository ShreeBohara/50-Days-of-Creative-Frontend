# Day 59 — SHREE'S CYBER ZONE (Y2K GeoZone)

A loving, maximalist tribute to 2001 personal homepages, rebuilt with 2026-grade
vanilla code: chrome 3D type, a sparkle cursor trail, holographic stickers you
can drag anywhere, a working guestbook, a green-LCD hit counter, fake OS popup
windows with a taskbar, dueling marquees, and a bleepy Web Audio soundtrack.
Chaotic on purpose, composed by discipline.

## Ingredients (all functional, none decorative)

1. **Chrome title** — three stacked glyph layers: a dark extrusion, a
   sky-chrome `background-clip: text` fill, and an animated specular glint.
2. **Sparkle cursor trail** — pooled canvas particles (120, zero allocation in
   the hot path); the rAF loop self-stops when nothing is alive.
3. **Sticker board** — ten inline-SVG holographic stickers with a hue-rotating
   foil sheen; drag them anywhere (positions persist in localStorage as
   viewport percentages), double-click/double-tap to spin.
4. **Hit counter** — odometer-style green LCD with per-column roll stagger;
   increments every visit via localStorage.
5. **Guestbook** — sign it, delete entries, all persisted; seeded once with
   three period-correct starter entries; capped at 50.
6. **Popup windows** — `About_Me.txt` and `cool_links.htm`, draggable by their
   titlebars, minimize to a taskbar, close and reopen from desktop icons,
   managed z-order.
7. **Marquees** — welcome strip up top, "best viewed at 800×600 in Internet
   Explorer 5" down below. Pure CSS.
8. **MIDI-ish music** — square-wave arpeggio + triangle bass synthesized with
   Web Audio oscillators on a lookahead scheduler; speaker toggle.
9. **Under construction** — animated diagonal-stripe ribbon, pure CSS.
10. **Visitor map** — a fake "who's online" box with blinking dots.
    (source: trust me)

## Tech

- Vanilla HTML/CSS/JS, zero libraries; ES modules with side-effect-free tops
- One shared pointer-events drag utility powers stickers and windows
  (`setPointerCapture`, clamped positions, click-vs-drag threshold)
- Namespaced localStorage with an in-memory fallback for private mode
- Self-hosted fonts: Bungee (chrome title), Comic Neue (accents only),
  VT323 (LCDs); Verdana system stack for body text, as 2001 intended
- Full `prefers-reduced-motion` opt-out for every animation
- Pure logic (drag clamping, odometer digits, guestbook model, melody
  sequencing, storage) covered by `node --test`

```bash
npm test
```

**Responsive:** single column under 720px; popup windows become in-flow cards,
stickers shrink but stay draggable via touch.

**One thing learned:** with `color: transparent` chrome text, the extrusion
must live on its own pseudo-element *under* the fill — text-shadow on the
gradient layer bleeds straight through the transparent glyphs.

**Live demo:** <https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-59-y2k-geozone/>
