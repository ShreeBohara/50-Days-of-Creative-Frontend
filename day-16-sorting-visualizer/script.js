'use strict';

/* DOM references for the layout. Behavior is added incrementally in later commits. */
const dom = {
  sortButton: document.querySelector('[data-sort]'),
  generateButton: document.querySelector('[data-generate]'),
  stepModeToggle: document.querySelector('[data-step-mode]'),
  stepButton: document.querySelector('[data-step]'),
  muteToggle: document.querySelector('[data-mute]'),
  speedSlider: document.querySelector('[data-speed]'),
  speedOutput: document.querySelector('[data-speed-output]'),
  sizeSlider: document.querySelector('[data-size]'),
  sizeOutput: document.querySelector('[data-size-output]'),
  algorithms: {
    left: document.querySelector('[data-algorithm="left"]'),
    right: document.querySelector('[data-algorithm="right"]')
  },
  panels: {
    left: document.querySelector('[data-bars="left"]'),
    right: document.querySelector('[data-bars="right"]')
  }
};
