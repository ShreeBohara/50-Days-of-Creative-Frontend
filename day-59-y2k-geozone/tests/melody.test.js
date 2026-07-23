import test from "node:test";
import assert from "node:assert/strict";
import { BPM, STEPS_PER_BEAT, SONG, BASS, midiToFreq, stepDuration, songSteps, stepAt, bassForStep } from "../js/melody.js";

test("A440 and octave doubling", () => {
  assert.equal(midiToFreq(69), 440);
  assert.ok(Math.abs(midiToFreq(81) - 880) < 1e-9);
  assert.ok(Math.abs(midiToFreq(57) - 220) < 1e-9);
});

test("a 16th step at 140bpm lasts 60/140/4 seconds", () => {
  assert.ok(Math.abs(stepDuration(BPM, STEPS_PER_BEAT) - 60 / 140 / 4) < 1e-12);
});

test("the song is a whole number of 16-step bars", () => {
  assert.equal(songSteps(SONG) % 16, 0);
});

test("stepAt wraps cleanly past the end and for negative indexes", () => {
  const total = songSteps(SONG);
  assert.deepEqual(stepAt(0), SONG[0]);
  assert.deepEqual(stepAt(total), SONG[0]);
  assert.deepEqual(stepAt(total * 3 + 1), stepAt(1));
  assert.deepEqual(stepAt(-1), stepAt(total - 1));
});

test("bass follows the bar of the wrapped step index", () => {
  assert.equal(bassForStep(0), BASS[0]);
  assert.equal(bassForStep(16), BASS[1]);
  assert.equal(bassForStep(songSteps(SONG) + 16), BASS[1]);
});
