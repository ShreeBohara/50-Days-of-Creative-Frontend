import { getStaggerDelay, toFlapCharacter } from "./charset.js";
import { createFlapCell } from "./flapCell.js";
import { createFlapSequencer } from "./flapSequencer.js";

export const BOARD_ROWS = 6;
export const BOARD_COLUMNS = Object.freeze([12, 16, 22]);

export function getColumnsForWidth(width) {
  const safeWidth = Number(width) || 0;
  if (safeWidth >= 900) return 22;
  if (safeWidth >= 600) return 16;
  return 12;
}

export function normalizeColumnCount(value) {
  const parsed = Number(value);
  if (BOARD_COLUMNS.includes(parsed)) return parsed;
  return BOARD_COLUMNS.reduce((closest, columns) => (
    Math.abs(columns - parsed) < Math.abs(closest - parsed) ? columns : closest
  ), 22);
}

export function normalizeBoardLines(lines, { rows = BOARD_ROWS, columns = 22 } = {}) {
  const source = Array.isArray(lines) ? lines : [];
  return Array.from({ length: rows }, (_, row) => {
    const characters = Array.from(String(source[row] ?? ""))
      .slice(0, columns)
      .map(toFlapCharacter);
    return characters.join("").padEnd(columns, " ");
  });
}

export function flattenBoardLines(lines) {
  return lines.flatMap((line) => Array.from(line));
}

export function diffBoardFrames(previousFrame, nextFrame) {
  const changed = [];
  const length = Math.max(previousFrame.length, nextFrame.length);
  for (let index = 0; index < length; index += 1) {
    if (previousFrame[index] !== nextFrame[index]) changed.push(index);
  }
  return changed;
}

export function createSplitFlapBoard(root, options = {}) {
  if (!root) throw new Error("A board root element is required");

  const rows = BOARD_ROWS;
  let columns = normalizeColumnCount(options.columns ?? 22);
  let speed = 1;
  let staggered = true;
  let reducedMotion = Boolean(options.reducedMotion);
  let paused = false;
  let destroyed = false;
  let sequencers = [];
  let requestedLines = normalizeBoardLines([], { rows, columns });
  let requestedFrame = flattenBoardLines(requestedLines);

  function build() {
    sequencers.forEach((sequencer) => sequencer.destroy());
    sequencers = [];
    root.replaceChildren();
    root.style.setProperty("--columns", String(columns));
    root.dataset.columns = String(columns);

    const fragment = document.createDocumentFragment();
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const index = row * columns + column;
        const cell = createFlapCell(" ");
        const sequencer = createFlapSequencer(cell, {
          index,
          row,
          column,
          reducedMotion,
          onFlip: options.onFlip,
        });
        sequencer.setSpeed(speed);
        sequencer.setPaused(paused);
        sequencers.push(sequencer);
        fragment.append(cell.element);
      }
    }
    root.append(fragment);
    requestedLines = normalizeBoardLines([], { rows, columns });
    requestedFrame = flattenBoardLines(requestedLines);
  }

  function setBoard(lines) {
    if (destroyed) return 0;
    const nextLines = normalizeBoardLines(lines, { rows, columns });
    const nextFrame = flattenBoardLines(nextLines);
    const changedIndices = diffBoardFrames(requestedFrame, nextFrame);
    requestedLines = nextLines;
    requestedFrame = nextFrame;

    for (const index of changedIndices) {
      const row = Math.floor(index / columns);
      const column = index % columns;
      sequencers[index].setTarget(nextFrame[index], {
        delay: getStaggerDelay(row, column, staggered),
      });
    }

    options.onFrameRequested?.(requestedLines.slice(), changedIndices.slice());
    return changedIndices.length;
  }

  function setColumns(nextColumns) {
    const normalizedColumns = normalizeColumnCount(nextColumns);
    if (destroyed || normalizedColumns === columns) return false;
    columns = normalizedColumns;
    build();
    options.onColumnsChange?.(columns);
    return true;
  }

  function setSpeed(nextSpeed) {
    const parsed = Number(nextSpeed);
    speed = Number.isFinite(parsed) ? Math.min(2, Math.max(0.5, parsed)) : 1;
    sequencers.forEach((sequencer) => sequencer.setSpeed(speed));
    return speed;
  }

  function setStagger(nextStaggered) {
    staggered = Boolean(nextStaggered);
    return staggered;
  }

  function setReducedMotion(nextReducedMotion) {
    reducedMotion = Boolean(nextReducedMotion);
    sequencers.forEach((sequencer) => sequencer.setReducedMotion(reducedMotion));
  }

  function setPaused(nextPaused) {
    paused = Boolean(nextPaused);
    sequencers.forEach((sequencer) => sequencer.setPaused(paused));
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    sequencers.forEach((sequencer) => sequencer.destroy());
    sequencers = [];
    root.replaceChildren();
  }

  build();

  return {
    setBoard,
    setColumns,
    setSpeed,
    setStagger,
    setReducedMotion,
    setPaused,
    destroy,
    get columns() {
      return columns;
    },
    get rows() {
      return rows;
    },
    get requestedLines() {
      return requestedLines.slice();
    },
    get isStaggered() {
      return staggered;
    },
  };
}
