# Day 62 — RESONANCE (Audio-Reactive Blob)

A glossy 3D blob that dances to sound. An 82k-triangle icosphere is
displaced in the vertex shader by three layers of simplex noise, one per
frequency band: **bass swells the body**, **mids ripple the surface**,
**highs spike thin needles**. Feed it the built-in generative synth loop,
your microphone, or any dropped audio file — the same analyser bus drives
them all.

The skin is a custom ShaderMaterial: a three-stop spectral gradient
scrubbed by the bass/treble balance of whatever is playing (bass-heavy
music burns ember red, treble slides through violet into cyan), fresnel
rim glow that brightens with loudness, a grazing-angle iridescent sheen,
and needle tips pulled hot toward the treble color. A loudness-driven
bloom pass and a blurred reflector floor finish the listening-room look.

## The audio engine

- One `AudioContext`, one `AnalyserNode` (fftSize 1024), one input bus.
  Every mode — synth, mic, file — connects to the same bus, so the
  analyser never cares where sound comes from. The mic mutes the monitor
  path so it can never feed back through the speakers.
- Byte spectra are bucketed into bass (20–250 Hz), mid (250–2k), high
  (2k–8k), trimmed per band for spectral tilt, then smoothed by
  fast-attack / slow-release envelope followers — hits land instantly and
  bloom away, which is what makes the motion feel musical instead of
  jittery. Both knobs are exposed (sense / decay sliders).
- The built-in track is a 4-bar Am·Am·F·G synthwave loop (saw+sub bass,
  echoing square arp, noise hats) scheduled with a 1.25 s lookahead so
  background-tab timer throttling can't starve it.
- **SCREAM TEST** maxes every band for two seconds so you can see the
  full range without shouting at your laptop.

## Tech

- React 19 + Vite, three.js + @react-three/fiber, drei
  (OrbitControls, MeshReflectorMaterial), @react-three/postprocessing
  (mipmap Bloom), hand-written GLSL with Ashima simplex noise.
- Normals are rebuilt in the vertex shader by displacing two tangent
  neighbors and crossing the deltas, so lighting tracks the deformation.
- Three color themes (EMBER / TOXIC / GLACIER) retint the shader
  uniforms, the spectrum strip, and the UI chrome together.
- No WebGL (or a lost context) falls back to a 2D radial visualizer on
  the same engine; mobile gets a lighter tier (detail 32, no reflector,
  no MSAA). `?force2d=1` previews the fallback anywhere.
- 28 Vitest tests over the pure logic: band bucketing, envelope
  followers, synth patterns, file-type detection.

```bash
npm test
```

**One thing learned:** the analyser's default byte mapping
(−100…−30 dB) pegs at 255 for anything near full scale — a bassline
reads as a flat 1.0 until you widen `minDecibels`/`maxDecibels`, and
after that the bands still need per-band makeup gain because real
spectra tilt ~−3 dB/octave (hats measure far quieter than they sound).

**Live demo:** <https://shreebohara.github.io/50-Days-of-Creative-Frontend/day-62-audio-blob/>
