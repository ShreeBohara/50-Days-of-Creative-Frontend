# Day 65 — Sixty-Five

**A pop-up book of the whole series, printed in riso and cut to fold.**

The finale. A hardcover lies on a cutting mat. Lift the cover and the book opens on a die-cut "65" standing in front of a sunburst. Turn the stiff card pages (drag one by its edge, tap it, or use the arrow keys) and each spread pops up a paper diorama of one chapter of the sixty-four days before it: a night sky with an orbit wheel, standing letterforms, a stained-glass window, a garden, a record player, an arcade, a stack of app windows, a coffee cup, and a tea bowl mended in gold. Every day is printed in its chapter and opens its own live demo when tapped. The last page, Day 66, is a blank card that stands up for you to draw on.

[Live demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-65-pop-up-book/)

## Paper that really folds

Every pop-up is a rigid mechanism whose only degree of freedom is the angle of the fold it is glued across. They are solved in closed form each frame, never animated by hand (`src/paper/kinematics.js`):

- **V-folds**: a creased card glued to both pages along lines through one point of a fold. The crease keeps a fixed angle to both glue lines, a spherical four-bar, so it is the intersection of two cones. The solver picks the root on the fold's interior.
- **Boxes** (parallel folds): two parallelograms. The walls stay parallel to the fold's bisector and each half of the top stays parallel to its page, so the top's crease is a raised copy of the gutter.
- **Tents**: a triangle whose base shortens as the book closes, solved by circle intersection.
- **Lift-flaps, wheels and pull-tabs**: driven by the reader. A flap's hinge is itself a fold, so a V-fold glued across it pops up as the flap lifts.

Pieces mount on the folds other pieces make: a figure on a box's top, a card in a V-fold's valley, a pop-up hidden under a flap. Each spread is a tree solved top-down. A page turn closes one spread exactly as it opens the next, because the leaf being turned belongs to both.

`src/paper/validate.js` sweeps every spread from shut to flat open and refuses anything you couldn't build from real card. No piece may stretch. No paper may pass through a page or another piece. Everything must fold flat inside the shut book. Every card must touch its glue lines and stay one piece across its creases. The tests run it on every spread.

Dragging uses the same closed forms backwards. The page, flap, wheel or tab under your finger has one degree of freedom, so the controller searches for the value that puts the grabbed point of paper under the pointer.

## A small riso press in JavaScript

Every printed surface (pages, both sides of every card, the cover) is painted as separate **ink layers** and then printed by `src/art/riso.js`:

- tints become halftone dots on each drum's own screen angle;
- solids pick up drum mottle and the odd starved dot;
- each ink lands slightly off register;
- inks overprint by multiplying, so pink over yellow prints orange.

Die-cut outlines are traced from drawings (type, shapes) with marching squares and Ramer–Douglas–Peucker (`src/art/trace.js`). Printing runs in a pool of two Web Workers (the whole book prints in about 4 s). The press prints thumbnails of the whole book first, keeps them for good, holds full prints only for the spreads near the reader, and uploads at most one texture per frame, never while paper is moving. Every shader program the book needs is compiled before the cover can be lifted, and the canvas renders only while something changes.

## Things to find

- **X-ray** (button or X): the paper engineer's view. Every fold is drawn live on the moving paper: valleys blue, mountains pink, glue green, hinges yellow. **Download die-cut sheet** prints the spread's pieces flat at true size with their folds and glue tabs, so you can build it from real card.
- **Contents**: jump to any chapter or day (the book riffles to it).
- **Bookplates**: tap any printed day in a chapter's index, or a piece that depicts a day.
- **Try**: every spread's tabs, wheels and flaps are also listed as buttons, so a keyboard or a curious reader can work them without hunting.
- **Day 66**: draw on the blank card. It stays in your browser.
- All sound is synthesized with Web Audio: page lift and whoosh, landing, pops, flaps, the wheel's detents, pull-tab friction, pencil on card, and a record that plays when you spin it.

## Run it

```bash
npm install
npm run dev                                    # http://localhost:5173/50-Days-of-Creative-Frontend/day-65-pop-up-book/
npm test                                       # 151 tests: kinematics, validator, every spread, the press, the book model, sound
npm run spread -- sky                          # preview a spread without a browser → _previews/
npm run lint
```

URL flags: `?debug=1` (exposes `window.__d65`, with `pump(n)`, `snap()`, `tour()` and `mechs(k)` for QA in a paused tab), `?perf=1` (frame pacing: `__perf.table()`), `?tier=C` (phone quality), `?nowebgl=1` (the fallback page).

### Making a spread

See [`src/spreads/AUTHORING.md`](src/spreads/AUTHORING.md). A spread is plain data plus painter functions. `node scripts/preview-spread.mjs <id>` renders it posed at six angles, its mechanisms worked, and its flat die-cut sheet, and prints the buildability check.

## Credits

- Fonts: Caprasimo (Phaedra Charles & Flavia Zimbardi, OFL), Newsreader (Production Type, OFL), Fragment Mono (Wei Huang, OFL), via @fontsource.
- Riso ink colours follow Riso's published swatches; the press itself is an homage, not a simulation of any real machine.
- Pop-up engineering after the vocabulary of Carter & Diaz, *The Elements of Pop-Up*.
