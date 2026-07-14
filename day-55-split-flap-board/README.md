# Day 55 — TERMINAL / 55 · Split-Flap Departure Board

A tactile six-row mechanical departure board whose 132 desktop cells physically travel forward through a forty-character drum. It includes message composition, a changing departures programme, a drift-free local clock, rotating Platform 55 dispatches, focus typing, solve-order and speed controls, and opt-in synthesized clacks.

**Tech:** Vanilla HTML/CSS/JavaScript, browser ES modules, CSS 3D transforms, Web Audio, self-hosted Archivo + IBM Plex Mono, and dependency-free Node tests. No build step or runtime libraries.

**Responsive board:** 22 columns at 900px and above, 16 columns from 600–899px, and 12 columns below 600px. Every mode reformats its canonical source when the mechanism crosses a breakpoint.

**Controls:** Choose a display programme, tune flip speed from 0.5×–2×, switch between a left-to-right wave and simultaneous solving, enable or mute the synthesized mechanism, and press `Alt+K` for direct row-one typing.

**Accessibility:** Semantic keyboard-controlled tabs, a single readable board description, restrained live announcements, visible focus, 44px controls, dynamic reduced-motion settling, and hidden-tab timer cleanup.

Run the logic suite with:

```sh
npm test
```

**One thing learned:** the convincing part of a split-flap display is not merely `rotateX`. Each cell must preserve the active physical step while accepting a new target, update its lower face and clack at the exact midpoint, and then continue only forward through the drum. Keeping one latest target instead of pre-queuing every character makes rapid typing feel mechanical without becoming stale.

**Live demo:** https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-55-split-flap-board/
