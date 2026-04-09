# Day 18 — Gravitational N-Body Simulation

Interactive gravity sandbox with hold-to-spawn bodies, merge collisions, orbital trails, grid warp, and curated presets.

## Tech

Canvas API, vanilla JavaScript, Velocity Verlet integration, pointer events

## One Thing Learned

Velocity Verlet keeps orbital motion noticeably more stable than naive Euler stepping, especially once time scaling and close gravitational encounters enter the picture.
