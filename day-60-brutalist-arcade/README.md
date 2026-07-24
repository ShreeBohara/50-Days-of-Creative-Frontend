# Day 60 — VOLTAGE ⚡ (Brutalist Arcade)

A neubrutalist landing page for a fake energy drink with three fully playable
mini-games embedded in the page sections. Thick black borders, hard 6px offset
shadows, flat loud colors, buttons that physically depress into their shadows —
and a ticker that taunts you with your own high scores.

`border-radius` is banned in this file. All of them.

## The arcade

1. **WHACK-A-DIV** — a 3×3 grid where `<div>`s pop up for 600ms shrinking to
   300ms over a 30-second round. +10 per hit with a streak multiplier
   (×2/×3/×4 at 3/6/9), squash animation, three escaped divs end the run.
   Keys 1–9 whack too.
2. **REFLEX DUEL** — red "WAIT…" flips to green "CLICK!!" after a random 1–4s
   delay; clicking early earns a rotated "TOO EAGER" stamp and a retry.
   Best-of-5 average, then judgment: SLOTH / HUMAN / CAFFEINATED / VOLTAGE.
3. **MEMORY PAIRS** — 4×4 cards over eight pixel-icon pairs (bolt, skull,
   star, eye, flame, diamond, moon, target) drawn as 8×8 SVG symbols. Move
   counter, timer, and a win burst of ~140 canvas confetti squares. Squares
   only — even the confetti obeys the no-rounding rule.

## Juice

- Every scoring event screen-shakes the page shell (2–4px, 100ms, steps())
  and fires a Web Audio square-wave blip — each game gets its own register,
  whack's pitch climbs with your streak.
- Global mute lives in a brutalist rocker switch in the top bar, persisted.
- High scores for all three games persist in localStorage with editable
  3-letter arcade initials — set via A–Z stepper slots, AAA style. A NEW BEST
  auto-opens the claim editor and the marquee ticker re-taunts with your
  initials in it.

## Tech

- Vanilla HTML/CSS/JS, zero libraries; ES modules, DOM built entirely with
  `createElement`
- Pure game rules live in `*Logic.js` modules (pop timing ramp, combo
  multiplier, non-repeating cell picker, reflex ranks, a memory flip reducer,
  initials hygiene) covered by `node --test` — 40 tests
- Namespaced localStorage wrapper survives private mode, quota errors, and
  corrupt JSON
- Self-hosted fonts: Anton (display), Public Sans variable (UI), Press Start
  2P (scores/ticker)
- WCAG bits: ticker pause control, `prefers-reduced-motion` disables shake /
  marquee / confetti / flips, keyboard-playable games, visible focus boxes

```bash
npm test
```

**Responsive:** HUD stats go 2-up, CTAs go full-width, leaderboard rows
restack, and tap targets fatten up under `pointer: coarse`.

**One thing learned:** an auto-opened initials editor must never steal focus —
the player is still standing at the game they just finished. Open it visible
but unfocused, and only focus when they click EDIT themselves.

**Live demo:** <https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-60-brutalist-arcade/>
