# Authoring a spread

Every spread of *Sixty-Five* is one file in `src/spreads/`: plain data plus
painter functions. The engine (`src/paper/`) poses it with exact rigid-paper
kinematics, the riso shop (`src/art/riso.js`) prints it, and the 3D book
renders it. `s00-opening.js` is the worked example. Read it first.

## Loop

```bash
node scripts/preview-spread.mjs <id>        # or a path: src/spreads/s03-light.js
npx vitest run src/spreads                 # the same check, as a test
```

The preview writes `_previews/<id>-3d.png` (six poses), `<id>-mech.png` (each
reader mechanism worked) and `<id>-sheet.png` (both pages plus every card's flat
net, front | back, with valley folds dashed blue, mountain folds dash-dot pink
and glue lines green). Look at the PNGs and iterate until the check prints
`✓ buildable` **and** the 3D views look like a page from a real pop-up book.

## The book

- Units are **centimetres**. A page is `W = 20` wide (spine → fore-edge) and
  `H = 26` tall (head → tail).
- **Page coordinates** are canvas-style, as the printed page looks: x right,
  y down. On `page:L`, x runs from its outer edge (0) to the spine (20). On
  `page:R`, x runs from the spine (0) to its outer edge (20). On both, y runs
  from the head (0, far from the reader) to the tail (26, nearest the reader).
- **The reader** looks from the tail, about 50° above the table. Things near
  the head stand *behind* things near the tail. The 3D camera frames roughly
  15 cm above the page, so keep pop-ups under about 15 cm tall.
- **The gutter** (the spine fold) is where pop-ups stand. Keep printed text in
  the outer two-thirds of each page and toward the tail. Art can (and should)
  run under the pop-ups.

## Pieces

Every piece is `{ id, kind, on, …, front(g), back(g), day? }`. `day: n` makes
the piece tappable: it opens that day's bookplate.

### Card coordinates

Each piece is drawn as its **flat die-cut card** (the sheet before folding),
in centimetres with y down. `outline` is a polygon `[[x, y], …]`, or a function
returning one (or `{ outline, holes }`). Use `trace()` from `../art/trace.js` to
cut any drawing (type, circles, Path2D unions) into an outline. `holes` are
die-cut windows. Outlines are clipped into panels at the folds automatically.

**front** is the printed side facing the reader once it pops up. **back** is
painted *as seen with the card flipped over left-to-right*. Undrawn = blank card.

### `vfold`: angle fold (the workhorse)

```js
{ id, kind: 'vfold', on: 'gutter' | '<vfoldId>' | '<boxId>' | '<flapId>',
  at: 13,            // cm along the mount fold (on the gutter: the page y of the hinge point)
  glue: [46, 46],    // deg from the mount fold's direction to each glue line
  angle: [90, 90],   // deg on the card between the crease and each glue line
  outline, front, back }
```

The card's crease is the line `x = 0` running **up** from the origin (y ≤ 0).
Half A (x ≤ 0) glues to the left plane and half B (x ≥ 0) to the right. Glue
line A leaves the origin at `angle[0]` from the crease, going down-left. At 90°
the card has a straight bottom edge along y = 0, and the outline must run along
it: that's where it's glued.

- `glue` < 90 aims the glue lines at the reader, so the V opens toward them.
  40–60 is typical: smaller is narrower and more frontal.
- `angle` 90 stands upright. > 90 leans back (good for backdrops, e.g. 100–110).
  < 90 leans toward the reader.
- **Closing folds the card back toward the head.** A card of height h needs its
  hinge at roughly `at ≥ h × 0.4–0.8` or it sticks out of the shut book. The
  validator tells you. Big backdrops therefore sit mid-page (at ≈ 10–12) and
  everything in front stands at 13–20.
- **Layering:** a V-fold `on: '<vfoldId>'` glues across the *valley* of that
  card (its `at` runs up the parent's crease). A V-fold `on: '<boxId>'` stands
  on the box's raised top crease and behaves exactly like one on the gutter,
  only higher.
- Asymmetric `glue`/`angle` values lean a card sideways. Use them for variety.

### `box`: parallel-fold platform

```js
{ id, kind: 'box', on: 'gutter' | '<vfoldId>' | '<boxId>' | '<flapId>',
  span: [15, 21],    // from…to along the mount fold (page y on the gutter)
  a: 4, b: 4, h: 3,  // glued a cm out on the left plane, b on the right; walls rise h
  outline?, front, back }
```

The card is a strip: x runs wallA [0, h] → topA [h, h+a] → topB → wallB
[…, 2h+a+b], and y is the span. The walls stay parallel to the fold's bisector
and the top halves parallel to their pages. Its top crease is a raised gutter:
mount V-folds on it for figures standing on a stage.

### `tent`: two-wall parallel fold

`{ kind: 'tent', on, span: [y0, y1], a, b, la, lb }`: glued at a and b, walls
of length la and lb meeting at a ridge (mountain). Its walls face sideways, so
use them for roofs, waves and hills seen from the reader's angle.

### Reader mechanisms (on a plane: `'page:L'`, `'page:R'`, or `'<piece>.<panel>'`)

- **`flap`**: `{ at: [x, y], rot, size: [w, h] | outline, open?: deg }`. The hinge
  is the card's own x-axis (y = 0) and the body hangs at y > 0. The reader lifts
  it by dragging. Fully open, it lies face-down showing its **back**, so print
  the surprise on the back *and* on the page underneath. Pieces glued `on:
  '<flapId>'` pop up as it lifts (a hidden V-fold). That's the best trick.
- **`wheel`** (volvelle): `{ at, radius, outline?, turn? }`. A disc riveted at
  its centre, spun by dragging. Print things that change as it turns.
- **`slider`** (pull-tab): `{ at, travel: [dx, dy], size | outline }`. The
  reader pulls it 0 → 1 along `travel`. Let its handle overhang the page edge
  and print `PULL` on it.
- **`flat`**: `{ at, rot, size | outline }`. A card glued flat. Give it
  `drive: { by: '<sliderId|wheelId|flapId>', move: [dx, dy], turn: deg }` to
  move with a mechanism. Stack a `flat` with a die-cut **window** (holes) on top
  of a slider declared *before* it, and the pulled strip slides beneath the
  window.

Reader mechanisms are checked at the page's working angle. Every chapter needs
**at least one** mechanism worth discovering.

## Painters and the riso shop

Pages, fronts and backs are painters `(g) => { … }` drawing in that surface's
centimetre coordinates. Everything prints in **riso inks** that overprint by
multiplying, so pink over yellow is orange, blue over yellow is green, and
blue over pink is purple. Use only your chapter's inks (`CHAPTERS[i].inks`).

| call | does |
| --- | --- |
| `g.ink(name, (ctx) => …)` | draw anything into one ink's layer; ctx is in cm. Opaque = solid ink. |
| `g.tone(v)` | a fill/stroke style for a v·100 % tint, which prints as halftone dots |
| `g.fill(ink, polyOrPath2D, tone=1)` · `g.stroke(ink, shape, width, tone)` · `g.circle(ink, cx, cy, r, tone)` | shapes |
| `g.ramp(ink, shape, x0,y0,x1,y1, t0,t1)` · `g.glow(ink, shape, cx,cy,r, t0,t1)` | halftone gradients |
| `g.knock(ink, (ctx) => …)` | erase that ink under a shape, so a colour prints clean instead of overprinting |
| `g.text(ink, str, x, y, { kind, size, weight, italic, align, tracking, tone, maxWidth })` | one line of type (size in cm; 1 cm ≈ 28 pt) |
| `g.para(ink, str, x, y, width, opts)` → height | ragged paragraph |
| `g.measure(str, opts)` → cm · `g.font(kind, sizePx)` | type metrics |
| `g.rng` | seeded random (`range`, `int`, `pick`, `chance`, `gauss`) |

Type: `kind: 'display'` is **Caprasimo** (warm, heavy; for titles and big
numerals), `'serif'` is **Newsreader** (text; weights 400–700, italic), and
`'mono'` is **Fragment Mono** (labels, captions, tiny caps with `tracking`).
Text sizes: body 0.36–0.45, captions 0.24–0.3, titles 1.2–2.6.

From `furniture.js`: `M` (margins), `folio`, `runningHead`, `dayIndex` (the
printed, tappable index of your days: **every chapter must list all of its days
with it or by hand-made `spots`**), `starburst`, `ngon`, `scatter`.

### Art direction

This is a small-press pop-up book, printed riso on cream stock with white card
pieces. Think Sabuda's paper engineering meets a riso zine: bold flat shapes,
generous halftone tints, overprint colour mixing, slightly off-register layers
(the shop adds that, plus grain), confident type. Each spread should feel like
a *scene* about its chapter, made of paper, with clear foreground, middle and
backdrop layers, not a diagram. Reference the actual days: their motifs, names
and numbers. Print on both sides of anything the reader will see from behind.
Leave quiet paper around the type. Avoid tiny fussy detail (it all prints at
riso resolution), photo-realism, gradients-for-everything and clip-art clichés.
