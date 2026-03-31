# Day 14 — Retro Terminal Portfolio

A full-screen fake terminal with a phosphor-green CRT monitor aesthetic. Type commands to navigate a portfolio.

## Features

- **CRT effects** — scan lines, phosphor glow, screen flicker, vignette
- **Boot sequence** — ASCII logo types out, system messages appear line by line
- **Typing animation** — all output appears character-by-character
- **Command prompt** — `> ` with blinking block cursor
- **Commands**: `help`, `about`, `skills`, `projects`, `contact`, `clear`, `whoami`, `theme`, `matrix`
- **ASCII skill bars** — `[████████░░] 80%`
- **Command history** — `↑` / `↓` arrows to cycle previous commands
- **Theme switching** — `theme green | amber | blue | white`
- **Matrix easter egg** — `matrix` triggers a 3-second katakana rain
- **Audio** — subtle keypress sounds with mute toggle
- **Accessible** — `prefers-reduced-motion` support, ARIA live region

## Tech

Vanilla HTML · CSS · JavaScript · VT323 (Google Fonts)
