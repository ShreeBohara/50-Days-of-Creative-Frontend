# Day 20 — Shader Playground

A live WebGL GLSL shader editor with split-view: code on the left, real-time rendered output on the right. Features syntax highlighting, debounced live compilation, error display, and 5 visually stunning preset shaders.

## Tech
- WebGL (raw, no libraries)
- GLSL fragment shaders
- Custom syntax highlighting engine
- Vanilla HTML/CSS/JS

## Features
- Split-panel editor with draggable divider
- GLSL syntax highlighting (types, keywords, built-ins, numbers, comments)
- Line numbers with scroll sync
- Tab key inserts spaces, auto-indent, auto-close brackets
- 5 preset shaders: Plasma, Mandelbrot, Raymarching, Voronoi, Noise Terrain
- Live recompilation (300ms debounce)
- Error overlay with formatted GLSL compile errors
- Copy to clipboard & fullscreen mode
- Real-time FPS counter
- Responsive — stacks vertically on mobile

## What I Learned
- Raw WebGL shader compilation pipeline: vertex/fragment shader creation, program linking, and uniform passing
- Building a custom syntax highlighter with regex tokenization for GLSL
- Signed distance functions and raymarching techniques for real-time 3D rendering in fragment shaders

## Live Demo
[→ View](https://ShreeBohara.github.io/50-Days-of-Creative-Frontend/day-20-shader-playground/)
