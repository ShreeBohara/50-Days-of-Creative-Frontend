import test from "node:test";
import assert from "node:assert/strict";

import { createFlapSequencer } from "../js/flapSequencer.js";

function createFakeCell() {
  let currentCharacter = " ";
  let pending = null;
  const durations = [];

  return {
    get currentCharacter() {
      return currentCharacter;
    },
    get pending() {
      return pending;
    },
    durations,
    flipOnce(nextCharacter, { duration, onMidpoint }) {
      durations.push(duration);
      return new Promise((resolve) => {
        pending = {
          nextCharacter,
          complete() {
            currentCharacter = nextCharacter;
            pending = null;
            onMidpoint?.(nextCharacter);
            resolve(currentCharacter);
          },
        };
      });
    },
    setCharacter(character) {
      currentCharacter = character;
    },
    settle(character) {
      currentCharacter = character;
      if (pending) {
        const active = pending;
        pending = null;
        active.complete = () => {};
      }
    },
    destroy() {
      pending = null;
    },
  };
}

test("rapid retargeting finishes the captured step and continues forward", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout, clearTimeout };
  const cell = createFakeCell();
  const sequencer = createFlapSequencer(cell, { index: 4 });

  assert.equal(sequencer.setTarget("C"), true);
  const activeStep = cell.pending;
  assert.equal(activeStep.nextCharacter, "A");
  assert.equal(sequencer.setTarget(" "), true);
  assert.equal(activeStep.nextCharacter, "A");
  activeStep.complete();
  await Promise.resolve();
  assert.equal(cell.pending.nextCharacter, "B");
  assert.equal(sequencer.setTarget(" "), false);
  sequencer.destroy();
  globalThis.window = previousWindow;
});

test("speed changes affect later captured durations while remaining bounded", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout, clearTimeout };
  const cell = createFakeCell();
  const sequencer = createFlapSequencer(cell, { index: 1 });
  sequencer.setSpeed(2);
  sequencer.setTarget("A");
  assert.ok(cell.durations[0] >= 45 && cell.durations[0] <= 55);
  sequencer.destroy();
  globalThis.window = previousWindow;
});
