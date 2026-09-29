# Day 64 — Kintsugi

**Hold it. Drop it. Mend it in gold.**

A hand-thrown shino tea bowl rests on a hinoki tray under a silk cloth. Pull the cloth off, lift the bowl, and let it fall: it breaks where it hit. Fit the pieces back from the foot outward, brush the cracks with urushi lacquer, sift gold dust over them as the bowl turns, and burnish the gold until it shines. Kintsugi (金継ぎ) is the Japanese practice of mending pottery with lacquer and powdered gold. The repair isn't hidden; it becomes part of the object's story.

[Live demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-64-kintsugi/)

## The ritual

| Stage | You | What happens |
| --- | --- | --- |
| Veil | Drag the silk (or press Enter) | Live Verlet cloth slides off the bowl; the scene loads beneath it — no spinner |
| Hold | Press and drag the bowl · tap to ring it | It rises on a spring, lags and leans into your motion; height shows in cm; the wheel or a second finger twists it |
| Break | Let go high | Physics measures the real impact speed: under ~9 cm it's set down, then a hairline, a break, or (thrown) a shatter; time freezes while cracks race outward from the actual contact point |
| Mend | Drag each piece near its place | Pieces orient themselves; a screen-space magnet pulls them home, but only beside a placed neighbour — you rebuild from the foot out (M fits the next one) |
| Lacquer | Take the brush, brush the cracks | Urushi wets the crack where you touch and runs along it both ways |
| Gild | Take the jar, hold to sift | The bowl turns under the jar; gold runs down both walls and sticks to wet lacquer |
| Burnish | Rub with the agate | Matte powder becomes polished metal |
| Keep | Admire, F to turn it over | A colophon (`8 pieces · 1407 mm of gold · 28 Sep 2026 · 21:16`), the kiln seal on the foot, your last six bowls on the tray, and a share link that puts your bowl on a friend's shelf |

Keyboard: Space lifts/lets go · arrows, W/S, Q/E move and twist · T rings · M mends · B J A take the tools · hold Space to work · F S R once kept · hold Alt or L for a 6× loupe. Every step is announced to screen readers.

## How it's built

**Everything 3D comes from Python scripts run in headless Blender** (`blender -b --factory-startup -P …`). Nothing was sculpted by hand, and every asset rebuilds deterministically.

- `blender/bowl_shape.py`: one closed cross-section (inner well, rolled rim, outer wall, trimmed foot ring) lathed into a watertight chawan. It then gets a hand-made character: throwing wobble, a slight oval, a thumb dent and an uneven rim. The glaze is synthesised in numpy directly in UV space: the milky shino body, pooling in the well, orange hi-iro where the glaze runs thin, pinholes, crawled islands and drips, an iron-speckled clay foot, and a 陶 kiln seal stamped into the normal map.
- `blender/build_fracture.py`: breaks the bowl 12 ways (6 impact zones × drop/shatter). It Boolean-intersects power-diagram cells with the bowl, and a weighted seed keeps the foot ring whole as the anchor. Cut faces are found geometrically, so each one knows its neighbour. Crack edges wander via tangent noise, applied identically in every piece that shares them, so pieces still fit exactly. Every crack is then chained, resampled at 1.5 mm, and given a crack-race distance from the impact. Bad draws are re-seeded.
- `blender/build_tray_tools.py`: the hinoki tray (a rolled rim swept along a rounded rectangle, with kaki-shibu-stained grain), the fude brush, the powder jar with a hinged lid, the agate burnisher, and the shoji gobo that the key light projects.
- `blender/render_fallback.py`: a Cycles turntable of a mended bowl with raised gold seams. It's used as the no-WebGL fallback and as the social card.
- `scripts/pack.mjs`: gltf-transform meshopt compression plus WebP textures. `scripts/check-assets.mjs` gates CI: shard counts, symmetric adjacency connected from the anchor, seam integrity, and size budgets.

**Runtime**: React 19, React Three Fiber 9, drei 10, Rapier (via @react-three/rapier) and postprocessing (N8AO, bloom, SMAA, AgX). Physics is stepped by hand, so time can stop for the moment of impact. The seams are one ribbon geometry, widened in the shader. Each seam's state (lacquered interval, gold, polish) lives in a single float texel. All sound is synthesized with Web Audio (no samples): modal-synthesis ring tones pitched by where you strike, HRTF-panned shard clatter, crack, brush, sift, burnish, and a small synthesized room reverb.

Imperative controllers (`bowlHold.js`, `fitting.js`, `craft.js`, `veil.js`) keep per-frame mutation out of React. Pure logic (`src/logic/`: impact severity, zones, seam graphs, fit rules, share codes with a Reed–Solomon check symbol, the phase machine, gestures, colophon) is covered by Vitest.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173/50-Days-of-Creative-Frontend/day-64-kintsugi/
npm test             # 282 unit tests (logic, audio, cloth)
npm run lint
```

Useful URL flags: `?debug=1` (exposes `window.__d64`), `?tier=C` (phone quality), `?nowebgl=1` (the fallback page), `?fx=noao,nobloom,nograin`.

### Rebuild the 3D assets

Needs [Blender](https://www.blender.org/download/) 4.5 or newer (built on 5.2 LTS). The generated models are committed, so CI never needs Blender.

```bash
npm run assets       # bowl, 12 fractures, tray + tools, gobo; then pack
blender -b --factory-startup -P blender/build_bowl.py -- --preview   # look-dev renders in blender/_previews/
blender -b --factory-startup -P blender/render_fallback.py           # fallback video + social card (needs ffmpeg)
```

## Credits

- HDRI: [Pine Attic](https://polyhaven.com/a/pine_attic) by Sergej Majboroda, Poly Haven (CC0).
- Fonts: Shippori Mincho (Fontdasu, OFL) and Chivo Mono (Omnibus-Type, OFL), via @fontsource.
- Kintsugi is a centuries-old Japanese craft. This piece is an homage: real kintsugi uses natural urushi lacquer, which takes weeks to cure between coats.
