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
    status: 'Ready',
    generator: null,
    running: false,
    done: false,
    startedAt: 0,
    barElements: [],
    transientIndices: [],
    sortedIndices: new Set()
  };
}

/* Every sorter emits the same operation shape so the runner can stay generic. */
const SORTERS = {
  bubble: bubbleSort,
  quick: quickSort,
  merge: mergeSort,
  heap: heapSort,
  insertion: insertionSort,
  selection: selectionSort
};

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

function sortedOperation(indices) {
  const normalized = [...indices].sort((left, right) => left - right);
  return {
    type: 'sorted',
    indices: normalized,
    sortedIndices: normalized
  };
}

async function* bubbleSort(source) {
  const values = [...source];
  const settled = new Set();

  for (let end = values.length - 1; end > 0; end -= 1) {
    for (let index = 0; index < end; index += 1) {
      yield { type: 'compare', indices: [index, index + 1] };

      if (values[index] > values[index + 1]) {
        [values[index], values[index + 1]] = [values[index + 1], values[index]];
        yield { type: 'swap', indices: [index, index + 1], values: [values[index], values[index + 1]] };
      }
    }

    settled.add(end);
    yield sortedOperation(settled);
  }

  settled.add(0);
  yield sortedOperation(settled);
}

async function* insertionSort(source) {
  const values = [...source];

  for (let index = 1; index < values.length; index += 1) {
    const current = values[index];
    let position = index - 1;

    while (position >= 0) {
      yield { type: 'compare', indices: [position, position + 1] };

      if (values[position] <= current) {
        break;
      }

      values[position + 1] = values[position];
      yield { type: 'overwrite', indices: [position + 1], values: [values[position + 1]] };
      position -= 1;
    }

    values[position + 1] = current;
    yield { type: 'overwrite', indices: [position + 1], values: [current] };
  }

  yield sortedOperation(values.map((_, index) => index));
}

async function* selectionSort(source) {
  const values = [...source];
  const settled = new Set();

  for (let index = 0; index < values.length; index += 1) {
    let minIndex = index;

    for (let candidate = index + 1; candidate < values.length; candidate += 1) {
      yield { type: 'compare', indices: [minIndex, candidate] };

      if (values[candidate] < values[minIndex]) {
        minIndex = candidate;
      }
    }

    if (minIndex !== index) {
      [values[index], values[minIndex]] = [values[minIndex], values[index]];
      yield { type: 'swap', indices: [index, minIndex], values: [values[index], values[minIndex]] };
    }

    settled.add(index);
    yield sortedOperation(settled);
  }
}

async function* heapify(values, length, root) {
  let largest = root;
  const left = (root * 2) + 1;
  const right = left + 1;

  if (left < length) {
    yield { type: 'compare', indices: [largest, left] };
    if (values[left] > values[largest]) {
      largest = left;
    }
  }

  if (right < length) {
    yield { type: 'compare', indices: [largest, right] };
    if (values[right] > values[largest]) {
      largest = right;
    }
  }

  if (largest !== root) {
    [values[root], values[largest]] = [values[largest], values[root]];
    yield { type: 'swap', indices: [root, largest], values: [values[root], values[largest]] };
    yield* heapify(values, length, largest);
  }
}

async function* heapSort(source) {
  const values = [...source];
  const settled = new Set();

  for (let index = Math.floor(values.length / 2) - 1; index >= 0; index -= 1) {
    yield* heapify(values, values.length, index);
  }

  for (let end = values.length - 1; end > 0; end -= 1) {
    [values[0], values[end]] = [values[end], values[0]];
    yield { type: 'swap', indices: [0, end], values: [values[0], values[end]] };
    settled.add(end);
    yield sortedOperation(settled);
    yield* heapify(values, end, 0);
  }

  settled.add(0);
  yield sortedOperation(settled);
}

async function* partition(values, low, high) {
  const pivot = values[high];
  let split = low - 1;

  for (let cursor = low; cursor < high; cursor += 1) {
    yield { type: 'compare', indices: [cursor, high] };

    if (values[cursor] < pivot) {
      split += 1;

      if (split !== cursor) {
        [values[split], values[cursor]] = [values[cursor], values[split]];
        yield { type: 'swap', indices: [split, cursor], values: [values[split], values[cursor]] };
      }
    }
  }

  split += 1;

  if (split !== high) {
    [values[split], values[high]] = [values[high], values[split]];
    yield { type: 'swap', indices: [split, high], values: [values[split], values[high]] };
  }

  return split;
}

async function* quickSortRange(values, low, high) {
  if (low > high) {
    return;
  }

  if (low === high) {
    yield sortedOperation([low]);
    return;
  }

  const pivotIndex = yield* partition(values, low, high);
  yield sortedOperation([pivotIndex]);
  yield* quickSortRange(values, low, pivotIndex - 1);
  yield* quickSortRange(values, pivotIndex + 1, high);
}

async function* quickSort(source) {
  const values = [...source];
  yield* quickSortRange(values, 0, values.length - 1);
  yield sortedOperation(values.map((_, index) => index));
}

async function* mergeRange(values, start, mid, end) {
  const left = values.slice(start, mid + 1);
  const right = values.slice(mid + 1, end + 1);
  let leftIndex = 0;
  let rightIndex = 0;
  let target = start;

  while (leftIndex < left.length && rightIndex < right.length) {
    const leftValue = left[leftIndex];
    const rightValue = right[rightIndex];
    yield { type: 'compare', indices: [start + leftIndex, (mid + 1) + rightIndex] };

    if (leftValue <= rightValue) {
      values[target] = leftValue;
      leftIndex += 1;
    } else {
      values[target] = rightValue;
      rightIndex += 1;
    }

    yield { type: 'overwrite', indices: [target], values: [values[target]] };
    target += 1;
  }

  while (leftIndex < left.length) {
    values[target] = left[leftIndex];
    leftIndex += 1;
    yield { type: 'overwrite', indices: [target], values: [values[target]] };
    target += 1;
  }

  while (rightIndex < right.length) {
    values[target] = right[rightIndex];
    rightIndex += 1;
    yield { type: 'overwrite', indices: [target], values: [values[target]] };
    target += 1;
  }
}

async function* mergeSortRange(values, start, end) {
  if (start >= end) {
    return;
  }

  const mid = Math.floor((start + end) / 2);
  yield* mergeSortRange(values, start, mid);
  yield* mergeSortRange(values, mid + 1, end);
  yield* mergeRange(values, start, mid, end);
}

async function* mergeSort(source) {
  const values = [...source];
  yield* mergeSortRange(values, 0, values.length - 1);
  yield sortedOperation(values.map((_, index) => index));
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
    panel.sortedIndices = new Set();
    panel.transientIndices = [];
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
  const bars = [];

  for (const [index, value] of panel.values.entries()) {
    const bar = createBar(value, maxValue, index);
    bars.push(bar);
    fragment.appendChild(bar);
  }

  panel.barElements = bars;
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

function setBarValue(panel, index, value) {
  const bar = panel.barElements[index];
  const maxValue = panel.values.length || 1;
  panel.values[index] = value;

  if (!bar) {
    return;
  }

  bar.style.setProperty('--value', ((value / maxValue) * 100).toFixed(3));
}

function clearTransientStates(panel) {
  for (const index of panel.transientIndices) {
    const bar = panel.barElements[index];
    bar?.classList.remove('is-compare', 'is-swap');
  }

  panel.transientIndices = [];
}

function applySortedState(panel) {
  for (const index of panel.sortedIndices) {
    panel.barElements[index]?.classList.add('is-sorted');
  }
}

function setOperationState(panel, operation) {
  clearTransientStates(panel);

  if (operation.type === 'compare') {
    panel.transientIndices = [...operation.indices];
    for (const index of panel.transientIndices) {
      panel.barElements[index]?.classList.add('is-compare');
    }
  }

  if (operation.type === 'swap' || operation.type === 'overwrite') {
    panel.transientIndices = [...operation.indices];
    for (const index of panel.transientIndices) {
      panel.barElements[index]?.classList.add('is-swap');
    }
  }

  if (operation.sortedIndices?.length) {
    panel.sortedIndices = new Set([...panel.sortedIndices, ...operation.sortedIndices]);
    applySortedState(panel);
  }
}

function applyOperation(panel, operation) {
  if (operation.type === 'compare') {
    panel.comparisons += 1;
    return;
  }

  if (operation.type === 'swap') {
    panel.writes += 1;
    operation.indices.forEach((index, position) => {
      setBarValue(panel, index, operation.values[position]);
    });
    return;
  }

  if (operation.type === 'overwrite') {
    panel.writes += 1;
    setBarValue(panel, operation.indices[0], operation.values[0]);
  }
}

function sortDelay() {
  return Math.max(4, Math.round(280 / state.speed));
}

function sleep(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function preparePanelForRun(panel) {
  panel.values = [...state.baseArray];
  panel.comparisons = 0;
  panel.writes = 0;
  panel.elapsedMs = 0;
  panel.status = 'Sorting';
  panel.generator = SORTERS[panel.algorithm](panel.values);
  panel.running = true;
  panel.done = false;
  panel.startedAt = performance.now();
  panel.sortedIndices = new Set();
  panel.transientIndices = [];
  updatePanelView(panel);
}

async function runPanel(panel) {
  while (panel.running && panel.generator) {
    const { value, done } = await panel.generator.next();

    if (done) {
      panel.running = false;
      panel.done = true;
      panel.elapsedMs = performance.now() - panel.startedAt;
      panel.status = 'Complete';
      clearTransientStates(panel);
      applySortedState(panel);
      renderStats(panel);
      return;
    }

    setOperationState(panel, value);
    applyOperation(panel, value);
    panel.elapsedMs = performance.now() - panel.startedAt;
    renderStats(panel);
    await sleep(sortDelay());
    clearTransientStates(panel);
  }
}

async function runSinglePanelDemo() {
  const panel = state.panels.left;

  if (panel.running) {
    return;
  }

  preparePanelForRun(panel);
  await runPanel(panel);
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
  dom.sortButton.addEventListener('click', () => {
    void runSinglePanelDemo();
  });
}

initialize();
