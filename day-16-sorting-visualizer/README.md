# Day 16 — Sorting Algorithm Visualizer

A dual-panel sorting lab that compares algorithms on the same shuffled dataset with live stats, step mode, and comparison tones.

## Features

- Two synchronized sorting panels with independent algorithm choices
- Six algorithms: Bubble, Quick, Merge, Heap, Insertion, and Selection
- Shared array generator so both panels always start from the same values
- Speed control, array size control, mute toggle, and manual step mode
- Color-coded compare, swap, and sorted states for readable playback
- Pitch-mapped comparison tones built with the Web Audio API

## Tech

Vanilla HTML, CSS, JavaScript, DOM-rendered bars, async generators, and the Web Audio API.

## What I Learned

Normalizing every sorting algorithm into the same operation contract makes the animation runner, step mode, sound hooks, and visual states much easier to extend without algorithm-specific UI code.
