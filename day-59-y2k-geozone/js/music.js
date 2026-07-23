import { midiToFreq, stepDuration, stepAt, bassForStep } from "./melody.js";

// Chris-Wilson-style lookahead scheduler: a coarse setInterval walks a
// fine-grained schedule against ctx.currentTime, so main-thread jank
// can't smear the tempo.

const LOOKAHEAD_MS = 25;
const HORIZON_S = 0.12;
const MASTER_LEVEL = 0.12;

export function createMusicToggle(button) {
  let ctx = null;
  let master = null;
  let timer = 0;
  let suspendTimer = 0;
  let stepIndex = 0;
  let nextNoteTime = 0;
  let playing = false;

  function ensureContext() {
    if (ctx) return;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = MASTER_LEVEL;
    master.connect(ctx.destination);
  }

  function voice(freq, at, dur, type, level) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  function schedule() {
    const stepLen = stepDuration();
    while (nextNoteTime < ctx.currentTime + HORIZON_S) {
      const note = stepAt(stepIndex);
      if (note.midi !== null) {
        voice(midiToFreq(note.midi), nextNoteTime, stepLen * note.len * 0.9, "square", 1);
      }
      if (stepIndex % 16 === 0) {
        voice(midiToFreq(bassForStep(stepIndex)), nextNoteTime, stepLen * 14, "triangle", 0.8);
      }
      nextNoteTime += stepLen * note.len;
      stepIndex += note.len;
    }
  }

  async function start() {
    if (playing) return;
    // Flip state before the await so a mid-resume second click reads
    // "playing" and routes to stop() instead of double-starting.
    playing = true;
    button.setAttribute("aria-pressed", "true");
    clearTimeout(suspendTimer);
    ensureContext();
    // iOS hands us a suspended context; resume must happen in the gesture.
    if (ctx.state === "suspended") await ctx.resume();
    if (!playing) return; // stopped while resume() was pending
    clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(MASTER_LEVEL, ctx.currentTime);
    stepIndex = 0;
    nextNoteTime = ctx.currentTime + 0.06;
    schedule();
    timer = setInterval(schedule, LOOKAHEAD_MS);
  }

  function stop() {
    playing = false;
    button.setAttribute("aria-pressed", "false");
    clearInterval(timer);
    if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => {
        if (!playing) ctx?.suspend();
      }, 150);
    }
  }

  button.addEventListener("click", () => {
    if (playing) {
      stop();
    } else {
      start();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!ctx || !playing) return;
    if (document.hidden) {
      clearInterval(timer);
      ctx.suspend();
    } else {
      ctx.resume();
      clearInterval(timer);
      nextNoteTime = ctx.currentTime + 0.06;
      timer = setInterval(schedule, LOOKAHEAD_MS);
    }
  });

  return {
    get playing() {
      return playing;
    },
    stop,
  };
}
