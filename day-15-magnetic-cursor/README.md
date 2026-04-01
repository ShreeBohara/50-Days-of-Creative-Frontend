# Day 15 — Magnetic Cursor Trail

A spring-driven particle field with magnetic following, soft bloom, orbiting idle states, and click-based scatter interactions.

## Features

- 25 layered circles with different mass, spring, damping, blur, and radius values
- Organic chain follow system driven by spring physics instead of simple lerp
- Idle clustering orbit when the cursor pauses
- Single-click explosion and double-click edge scatter with spring recovery
- Optional trail mode that leaves fading afterimages on the canvas
- Responsive glass HUD with mobile-friendly touch support
- Pastel gradient palette with additive glow and proximity connection lines

## Tech

Vanilla HTML, CSS, JavaScript, and the Canvas 2D API.

## What I Learned

Velocity-aware spring systems can feel much more organic when each follower has its own damping and mass, especially once the background rendering is tuned for afterimages instead of full clears.
