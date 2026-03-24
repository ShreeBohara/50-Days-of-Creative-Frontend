# Day 07 — Fluid Simulation

A real-time 2D fluid simulation powered by GPU-accelerated Navier-Stokes equations running entirely in WebGL fragment shaders. Mouse drag injects velocity and rainbow-cycling colored dye that swirls and mixes organically.

## Tech Used

- **WebGL 2** — fragment shaders for GPU-based simulation (advection, Jacobi pressure solve, gradient subtraction)
- **Framebuffer ping-pong** — double-buffered textures for stable iterative solving
- **GLSL shaders** — 7 shader programs embedded as JS template literals
- **Half-float textures** — `RGBA16F` / `RG16F` for high-precision simulation fields
- **Vanilla JavaScript** — no libraries or frameworks

## What I Learned

Running a full Navier-Stokes solver (advection + divergence + 20 Jacobi iterations + gradient subtraction) per frame is only feasible on the GPU. The key insight is that each solver step maps perfectly to a fragment shader operating on a fullscreen quad — the GPU processes all 256×256 grid cells in parallel. Framebuffer ping-pong (read from one texture, write to another, then swap) provides the double-buffering needed for stable iterative solvers without race conditions.
