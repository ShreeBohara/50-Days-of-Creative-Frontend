// ============================================================
// Audio engine — one AudioContext, one AnalyserNode, one bus.
//
// Routing:
//
//   input source ──▶ bus (gain) ──▶ analyser        (measured)
//                     └───────────▶ monitor ──▶ speakers
//
// Every input mode (synth loop, microphone, mp3) connects to the
// same bus, so the analyser never cares where sound comes from.
// The monitor gain is the ONLY path to the speakers — the mic
// mutes it to avoid a feedback loop, the synth and files open it.
//
// The engine is a module singleton mutated imperatively; React
// reads `engine.levels` inside useFrame instead of re-rendering
// at audio rate.
// ============================================================

import { makeBins, computeBands } from './bands.js'
import { follow } from './envelope.js'
import { debugBands } from '../debug.js'

const FFT_SIZE = 1024

export const engine = {
  ctx: null,
  analyser: null,
  bus: null,
  monitor: null,
  freqData: null,
  bins: null,
  mode: 'idle', // 'idle' | 'synth' | 'mic' | 'file'

  // smoothed levels, read by the render loop every frame
  levels: { bass: 0, mid: 0, high: 0, loud: 0 },
  // last raw (pre-envelope) frame, for the spectrum strip label
  raw: { bass: 0, mid: 0, high: 0, loud: 0 },

  // user controls
  sensitivity: 1.15, // multiplies raw band energy
  release: 0.22, // envelope release time constant (seconds)

  screamUntil: 0, // performance.now()/1000 deadline for the scream test
  _lastSample: 0,
}

// Lazily create the AudioContext — must be called from a user
// gesture the first time or the context starts suspended.
export function ensureContext() {
  if (engine.ctx) return engine.ctx
  const Ctx = window.AudioContext || window.webkitAudioContext
  const ctx = new Ctx()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = FFT_SIZE
  // light hardware-side smoothing; the musical feel comes from our
  // attack/release envelopes on top
  analyser.smoothingTimeConstant = 0.45

  const bus = ctx.createGain()
  const monitor = ctx.createGain()
  bus.connect(analyser)
  bus.connect(monitor)
  monitor.connect(ctx.destination)

  engine.ctx = ctx
  engine.analyser = analyser
  engine.bus = bus
  engine.monitor = monitor
  engine.freqData = new Uint8Array(analyser.frequencyBinCount)
  engine.bins = makeBins(ctx.sampleRate, FFT_SIZE)
  return ctx
}

export function setSensitivity(value) {
  engine.sensitivity = value
}

export function setRelease(value) {
  engine.release = value
}

// Max all bands for 2 seconds so people see the full range.
export function screamTest() {
  engine.screamUntil = performance.now() / 1000 + 2
}

const clamp01 = (x) => Math.min(1, Math.max(0, x))

// Called once per rendered frame. Reads the analyser, buckets to
// bands, applies sensitivity + scream override, then envelopes.
export function sampleLevels(nowSec) {
  const dt = Math.min(0.1, Math.max(0.001, nowSec - engine._lastSample))
  engine._lastSample = nowSec

  let target
  if (debugBands.enabled) {
    // QA path: forced values replace the analyser entirely
    target = {
      bass: debugBands.bass,
      mid: debugBands.mid,
      high: debugBands.high,
      loud: debugBands.loud,
    }
  } else if (engine.analyser && engine.mode !== 'idle') {
    engine.analyser.getByteFrequencyData(engine.freqData)
    const bands = computeBands(engine.freqData, engine.bins)
    const s = engine.sensitivity
    target = {
      bass: clamp01(bands.bass * s),
      mid: clamp01(bands.mid * s),
      high: clamp01(bands.high * s),
      loud: clamp01(bands.loud * s),
    }
  } else {
    target = { bass: 0, mid: 0, high: 0, loud: 0 }
  }

  if (performance.now() / 1000 < engine.screamUntil) {
    target = { bass: 1, mid: 1, high: 1, loud: 1 }
  }

  engine.raw = target

  const opts = { attack: 0.03, release: engine.release }
  const L = engine.levels
  L.bass = follow(L.bass, target.bass, dt, opts)
  L.mid = follow(L.mid, target.mid, dt, opts)
  L.high = follow(L.high, target.high, dt, opts)
  L.loud = follow(L.loud, target.loud, dt, opts)
  return L
}
