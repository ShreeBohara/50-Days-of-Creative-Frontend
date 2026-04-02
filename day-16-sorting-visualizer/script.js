'use strict';

/* DOM references for the layout. */
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
  titles: {
    left: document.getElementById('panel-left-title'),
    right: document.getElementById('panel-right-title')
  },
  panels: {
    left: document.querySelector('[data-bars="left"]'),
    right: document.querySelector('[data-bars="right"]')
  },
  stats: {
    left: {
      comparisons: document.querySelector('[data-stat="comparisons-left"]'),
      writes: document.querySelector('[data-stat="writes-left"]'),
      elapsed: document.querySelector('[data-stat="elapsed-left"]'),
      status: document.querySelector('[data-stat="status-left"]')
    },
    right: {
      comparisons: document.querySelector('[data-stat="comparisons-right"]'),
      writes: document.querySelector('[data-stat="writes-right"]'),
      elapsed: document.querySelector('[data-stat="elapsed-right"]'),
      status: document.querySelector('[data-stat="status-right"]')
    }
  }
};

/* Available algorithms land in the UI early so the layout feels real before the runners exist. */
const ALGORITHM_OPTIONS = [
  { value: 'bubble', label: 'Bubble Sort' },
  { value: 'quick', label: 'Quick Sort' },
  { value: 'merge', label: 'Merge Sort' },
  { value: 'heap', label: 'Heap Sort' },
  { value: 'insertion', label: 'Insertion Sort' },
  { value: 'selection', label: 'Selection Sort' }
];

const state = {
  arraySize: 96,
  speed: 32,
  mute: false,
  stepMode: false,
  baseArray: [],
  panels: {
    left: createPanelState('left', 'bubble'),
    right: createPanelState('right', 'quick')
  }
};

function createPanelState(side, algorithm) {
  return {
    side,
    algorithm,
    values: [],
    comparisons: 0,
    writes: 0,
    elapsedMs: 0,
    status: 'Ready'
  };
}

function populateAlgorithmSelects() {
  for (const panel of Object.values(state.panels)) {
    const select = dom.algorithms[panel.side];
    const optionsMarkup = ALGORITHM_OPTIONS
      .map((option) => {
        const selected = option.value === panel.algorithm ? ' selected' : '';
        return `<option value="${option.value}"${selected}>${option.label}</option>`;
      })
      .join('');

    select.innerHTML = optionsMarkup;
  }
}

function algorithmLabel(value) {
  return ALGORITHM_OPTIONS.find((option) => option.value === value)?.label || value;
}

function createBaseArray(size) {
  const values = Array.from({ length: size }, (_, index) => index + 1);

  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }

  return values;
}

function cloneBaseArrayToPanels() {
  for (const panel of Object.values(state.panels)) {
    panel.values = [...state.baseArray];
    panel.comparisons = 0;
    panel.writes = 0;
    panel.elapsedMs = 0;
    panel.status = 'Ready';
    updatePanelView(panel);
  }
}

function createBar(value, maxValue, index) {
  const element = document.createElement('div');
  element.className = 'sort-bar';
  element.style.setProperty('--value', ((value / maxValue) * 100).toFixed(3));
  element.dataset.index = String(index);
  element.setAttribute('aria-hidden', 'true');
  return element;
}

function renderBars(panel) {
  const container = dom.panels[panel.side];
  const fragment = document.createDocumentFragment();
  const maxValue = panel.values.length || 1;

  for (const [index, value] of panel.values.entries()) {
    fragment.appendChild(createBar(value, maxValue, index));
  }

  container.replaceChildren(fragment);
}

function renderStats(panel) {
  const stats = dom.stats[panel.side];
  stats.comparisons.textContent = panel.comparisons.toLocaleString();
  stats.writes.textContent = panel.writes.toLocaleString();
  stats.elapsed.textContent = `${Math.round(panel.elapsedMs)} ms`;
  stats.status.textContent = panel.status;
  dom.titles[panel.side].textContent = algorithmLabel(panel.algorithm);
}

function updatePanelView(panel) {
  renderStats(panel);
  renderBars(panel);
}

function syncControls() {
  dom.speedSlider.value = String(state.speed);
  dom.speedOutput.value = `${state.speed}x`;
  dom.speedOutput.textContent = `${state.speed}x`;
  dom.sizeSlider.value = String(state.arraySize);
  dom.sizeOutput.value = String(state.arraySize);
  dom.sizeOutput.textContent = String(state.arraySize);
  dom.muteToggle.checked = state.mute;
  dom.stepModeToggle.checked = state.stepMode;
}

function initialize() {
  populateAlgorithmSelects();
  syncControls();
  state.baseArray = createBaseArray(state.arraySize);
  cloneBaseArrayToPanels();
}

initialize();
