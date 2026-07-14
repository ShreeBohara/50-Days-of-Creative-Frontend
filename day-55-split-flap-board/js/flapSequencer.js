import { getCellVariance, nextFlapCharacter, toFlapCharacter } from "./charset.js";

export function createFlapSequencer(cell, options = {}) {
  const variance = getCellVariance(options.index ?? 0);
  let targetCharacter = cell.currentCharacter;
  let speed = 1;
  let running = false;
  let destroyed = false;
  let reducedMotion = Boolean(options.reducedMotion);
  let paused = false;
  let startTimer = 0;

  function clearStartTimer() {
    window.clearTimeout(startTimer);
    startTimer = 0;
  }

  async function pump() {
    clearStartTimer();
    if (running || destroyed || paused) return;

    if (reducedMotion) {
      cell.setCharacter(targetCharacter);
      return;
    }

    running = true;
    while (!destroyed && !paused && cell.currentCharacter !== targetCharacter) {
      const nextCharacter = nextFlapCharacter(cell.currentCharacter);
      await cell.flipOnce(nextCharacter, {
        duration: (100 / speed) * variance,
        onMidpoint: (character) => options.onFlip?.({
          character,
          index: options.index ?? 0,
          row: options.row ?? 0,
          column: options.column ?? 0,
          variance,
        }),
      });

      if (reducedMotion && !destroyed) {
        cell.setCharacter(targetCharacter);
        break;
      }
    }
    running = false;

    if (!destroyed && !paused && cell.currentCharacter !== targetCharacter) {
      void pump();
    } else {
      options.onSettled?.(cell.currentCharacter);
    }
  }

  function setTarget(character, { delay = 0 } = {}) {
    const nextTarget = toFlapCharacter(character);
    if (nextTarget === targetCharacter) return false;

    targetCharacter = nextTarget;
    clearStartTimer();

    if (reducedMotion && !running) {
      cell.setCharacter(targetCharacter);
      options.onSettled?.(cell.currentCharacter);
      return true;
    }

    if (!running && !paused) {
      const safeDelay = Math.max(0, Number(delay) || 0);
      if (safeDelay) {
        startTimer = window.setTimeout(() => void pump(), safeDelay);
      } else {
        void pump();
      }
    }
    return true;
  }

  function setSpeed(nextSpeed) {
    const parsed = Number(nextSpeed);
    speed = Number.isFinite(parsed) ? Math.min(2, Math.max(0.5, parsed)) : 1;
  }

  function setReducedMotion(nextReducedMotion) {
    reducedMotion = Boolean(nextReducedMotion);
    clearStartTimer();
    if (reducedMotion) {
      cell.settle(targetCharacter);
      if (!running) options.onSettled?.(cell.currentCharacter);
    } else if (!running && !paused) {
      void pump();
    }
  }

  function setPaused(nextPaused) {
    paused = Boolean(nextPaused);
    clearStartTimer();
    if (!paused && !running) void pump();
  }

  function reschedule(delay = 0) {
    if (destroyed || running || paused || !startTimer) return false;
    clearStartTimer();
    const safeDelay = Math.max(0, Number(delay) || 0);
    if (safeDelay) startTimer = window.setTimeout(() => void pump(), safeDelay);
    else void pump();
    return true;
  }

  function destroy() {
    destroyed = true;
    clearStartTimer();
    cell.destroy();
  }

  return {
    setTarget,
    setSpeed,
    setReducedMotion,
    setPaused,
    reschedule,
    destroy,
    get targetCharacter() {
      return targetCharacter;
    },
    get currentCharacter() {
      return cell.currentCharacter;
    },
    get isRunning() {
      return running || Boolean(startTimer);
    },
    variance,
  };
}
