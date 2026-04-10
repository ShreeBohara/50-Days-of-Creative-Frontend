# 50 Days of Creative Frontend

A daily playground for bold frontend experiments built with static HTML, CSS, and JavaScript.

Live gallery: [shreebohara.github.io/50-Days-of-Creative-Frontend](https://shreebohara.github.io/50-Days-of-Creative-Frontend/)

## Projects

| Day | Project | Description | Live | Folder |
| --- | --- | --- | --- | --- |
| 01 | Particle Text Morphing | Canvas-based particle typography that morphs between words and repels from the pointer. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-01-particle-text/) | [day-01-particle-text](./day-01-particle-text/) |
| 02 | Liquid Glass Card | Frosted glass profile card with 3D tilt, animated refraction, and a rotating conic border. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-02-liquid-glass-card/) | [day-02-liquid-glass-card](./day-02-liquid-glass-card/) |
| 03 | Cinematic Solar System | Premium React Three Fiber solar system with guided camera chapters, shader planets, and editorial planet deep dives. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-03-solar-system/) | [day-03-solar-system](./day-03-solar-system/) |
| 04 | Audio Visualizer Spectrum | Circular audio spectrum visualizer with radial FFT bars, beat-reactive pulses, and a built-in demo synth. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-04-audio-visualizer/) | [day-04-audio-visualizer](./day-04-audio-visualizer/) |
| 05 | Procedural Terrain Generator | 3D terrain with simplex noise displacement, height-based biome coloring, interactive controls, and cinematic camera modes. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-05-terrain-generator/) | [day-05-terrain-generator](./day-05-terrain-generator/) |
| 06 | Matrix Rain | Full-screen Matrix digital rain with hover-activated decode effect that reveals a hidden message letter by letter. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-06-matrix-rain/) | [day-06-matrix-rain](./day-06-matrix-rain/) |
| 07 | Fluid Simulation | Real-time 2D fluid dynamics with GPU-accelerated Navier-Stokes, mouse-injected rainbow dye that swirls and mixes organically. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-07-fluid-sim/) | [day-07-fluid-sim](./day-07-fluid-sim/) |
| 08 | Flow Field | Perlin noise generative art with thousands of particle trails, curated color palettes, and real-time controls. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-08-flow-field/) | [day-08-flow-field](./day-08-flow-field/) |
| 09 | Masonry Gallery | Infinite scroll masonry gallery with picsum.photos, viewport animations, lightbox navigation, and column toggle. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-09-masonry-gallery/) | [day-09-masonry-gallery](./day-09-masonry-gallery/) |
| 10 | Interactive Periodic Table | All 118 elements on a CSS Grid with category colors, hover tooltips, click modals, search/filter, and a temperature slider showing states of matter. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-10-periodic-table/) | [day-10-periodic-table](./day-10-periodic-table/) |
| 11 | SVG Draw-On-Scroll | Scroll-driven SVG line art that draws itself — city skylines, mountains, rockets, circuits, and waves with parallax text and section color transitions. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-11-svg-draw-on-scroll/) | [day-11-svg-draw-on-scroll](./day-11-svg-draw-on-scroll/) |
| 12 | 3D Card Deck | Ten Celestial Arcana cards in 3D perspective — fan, shuffle, flip, and cycle with cinematic CSS transitions. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-12-3d-card-deck/) | [day-12-3d-card-deck](./day-12-3d-card-deck/) |
| 13 | Interactive DNA Helix | 3D double helix with color-coded base pairs, click-to-inspect info panel, unwind/rewind morphing, and bloom glow. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-13-dna-helix/) | [day-13-dna-helix](./day-13-dna-helix/) |
| 14 | Retro Terminal Portfolio | Full-screen CRT terminal with phosphor glow, scan lines, boot sequence, and interactive portfolio commands. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-14-retro-terminal/) | [day-14-retro-terminal](./day-14-retro-terminal/) |
| 15 | Magnetic Cursor Trail | Spring-driven cursor trail with glowing pastel particles, idle orbiting, click explosions, and an afterimage toggle. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-15-magnetic-cursor/) | [day-15-magnetic-cursor](./day-15-magnetic-cursor/) |
| 16 | Sorting Algorithm Visualizer | Side-by-side sorting labs with animated bars, step mode, live stats, and pitch-mapped comparison tones. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-16-sorting-visualizer/) | [day-16-sorting-visualizer](./day-16-sorting-visualizer/) |
| 17 | Isometric City Builder | Canvas isometric grid with 8 tile types, day/night cycle, minimap, and procedural city generation. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-17-isometric-city/) | [day-17-isometric-city](./day-17-isometric-city/) |
| 18 | Gravitational N-Body Simulation | Hold-to-spawn gravity sandbox with orbital trails, merge collisions, grid warp, and solar or binary presets. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-18-nbody-gravity/) | [day-18-nbody-gravity](./day-18-nbody-gravity/) |
| 19 | Signal Atlas | Cinematic orbitable globe with linked city hubs, glowing corridors, and a live signal detail rail. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-19-signal-atlas/) | [day-19-signal-atlas](./day-19-signal-atlas/) |

## Adding a New Day

Every new day requires updates in **4 places**. Missing any one of them will cause a 404 on the live site.

### 1. Create the day folder

```
day-NN-project-name/
  index.html
  style.css
  script.js
  favicon.svg
  README.md
```

### 2. Add the card to `index.html` (gallery index)

```html
<article class="project-card" data-day="NN">
  <span class="card-num">NN</span>
  <h2>Project Title</h2>
  <p>Short description.</p>
  <footer class="card-foot">
    <span class="card-tech">Tech A, Tech B</span>
    <a class="card-link" href="./day-NN-project-name/">View</a>
  </footer>
</article>
```

Also update the **"Latest day"** link in the hero:

```html
<a class="link-secondary" href="./day-NN-project-name/">Latest day</a>
```

### 3. ⚠️ Update the deploy workflow (easy to forget — causes 404)

The file `.github/workflows/deploy-pages.yml` hardcodes every day in two spots.
**Both must be updated** or the folder will never be copied into the deployed site.

**A. Add to the `paths:` trigger** (so a push to the day folder kicks off a deploy):

```yaml
- "day-NN-project-name/**"
```

**B. Add to the `Stage static site bundle` step** (so the folder is actually included):

```bash
cp -R day-NN-project-name _site/
```

> **Why does the deploy say "success" even when a day is missing?**
> The workflow succeeds because it copies only the folders it knows about. If a new day isn't listed, it silently skips it — the build succeeds, but the URL 404s.

### 4. Add a row to this `README.md`

```markdown
| NN | Project Title | Description. | [View demo](https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-NN-project-name/) | [day-NN-project-name](./day-NN-project-name/) |
```
