// ============================================================
// Synth — the pure half of the sound of Sixty-Five.
//
// Nothing here touches Web Audio, so all of it runs under Vitest
// in node: the sample data the engine builds once at unlock (white
// noise, paper-fibre dust, vinyl surface, the small room's impulse
// response), envelope shapes, the maps from gesture speed to filter
// and level, the jitter that keeps a burst of pop-ups from sounding
// like a machine gun, the stick–slip path of a creaking spine, and
// the record's generative score as a function of step and time.
// ============================================================

import { hash2, mulberry32 } from '../art/rng.js'

export { mulberry32 }

// Every one-shot envelope decays to this depth by its end time;
// TAIL is the number of time constants that takes.
export const TAIL_DB = 80
export const TAIL = (TAIL_DB / 20) * Math.LN10

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))
export const clamp01 = (x) => (x > 0 ? (x < 1 ? x : 1) : 0) // NaN → 0
export const dbToGain = (db) => 10 ** (db / 20)
export const midiHz = (m) => 440 * 2 ** ((m - 69) / 12)

// Junk in (undefined, NaN, a string) → the fallback, else clamped 0..1.
export const unit = (x, fallback = 0) => (Number.isFinite(x) ? clamp01(x) : fallback)

// Log-scale interpolation (equal steps sound equal for pitch/cutoff).
export const logLerp = (a, b, t) => a * (b / a) ** clamp01(t)

// 1 ± amount, uniformly.
export const jitter = (rnd, amount) => 1 + amount * (2 * rnd() - 1)

// The book is a small object in the middle of the screen; a sound
// "left of the spine" is a little left, not inside the left ear.
export const PAN_WIDTH = 0.6

export function toPan(pan, width = PAN_WIDTH) {
  return Number.isFinite(pan) ? clamp(pan, -1, 1) * width : 0
}

// ------------------------------------------------------------
// Sample data
// ------------------------------------------------------------

export const SAMPLE_SECONDS = { noise: 2, dust: 2, vinyl: 6, impulse: 0.005 }
export const DUST_DENSITY = 700 // fibre clicks per second

export function fillWhite(out, rng) {
  for (let i = 0; i < out.length; i += 1) out[i] = rng() * 2 - 1
  return out
}

// Sparse clicks at `density` per second, added into `out`. Each is a
// doublet (+a, −0.6a): no DC, and a brighter tick than one sample.
// Squaring a uniform skews amplitudes quiet with the odd loud one,
// like grit. Returns the number of clicks.
export function fillDust(out, sampleRate, density, rng, scale = 1) {
  const p = density / sampleRate
  let count = 0
  for (let i = 0; i < out.length; i += 1) {
    if (rng() >= p) continue
    const r = rng()
    const a = (0.2 + 0.8 * r * r) * scale * (rng() < 0.5 ? -1 : 1)
    out[i] = clamp(out[i] + a, -1, 1)
    if (i + 1 < out.length) out[i + 1] -= 0.6 * a
    count += 1
  }
  return count
}

// A record's surface: a fine bed of tiny ticks, a sparser crackle,
// and the odd pop.
export function fillVinyl(out, sampleRate, rng) {
  fillDust(out, sampleRate, 320, rng, 0.06)
  fillDust(out, sampleRate, 22, rng, 0.45)
  fillDust(out, sampleRate, 0.7, rng, 1)
  return out
}

// Everything the engine needs as raw channel data, seeded so every
// session hears the same paper. `impulse` is a single unit sample:
// rung through a resonance it makes a click whose level never
// varies (a few ms of noise through a narrow band can swing ±5 dB
// from one call to the next).
export function makeSamples(sampleRate, seed = 65) {
  const rng = mulberry32(seed)
  const n = (s) => new Float32Array(Math.max(1, Math.round(sampleRate * s)))
  const noise = fillWhite(n(SAMPLE_SECONDS.noise), rng)
  const dust = n(SAMPLE_SECONDS.dust)
  fillDust(dust, sampleRate, DUST_DENSITY, rng)
  const vinyl = fillVinyl(n(SAMPLE_SECONDS.vinyl), sampleRate, rng)
  const impulse = n(SAMPLE_SECONDS.impulse)
  impulse[0] = 1
  return { noise, dust, vinyl, impulse }
}

// Gain that makes a unit impulse through a band-pass biquad (Web
// Audio's: 0 dB at the centre) ring with a peak of ~1. Its impulse
// response is α/(1+α) · (g[n] − g[n−2]) for the two-pole g, which
// rings at ≈ 2α/(1+α), with α = sin(ω0) / 2Q.
export function clickNorm(freq, Q, sampleRate) {
  const w = (2 * Math.PI * clamp(freq, 1, sampleRate * 0.45)) / sampleRate
  const a = Math.sin(w) / (2 * Math.max(Q, 1e-3))
  return (1 + a) / (2 * a)
}

// Early reflections (s, gain) of a reading nook: the desk under the
// book, a shelf, the near wall.
const EARLY = [
  [0.0025, 0.8],
  [0.006, 0.55],
  [0.0105, 0.42],
  [0.0155, 0.3],
  [0.022, 0.2],
]

// Stereo impulse response of a small, soft room (the same recipe as
// day 64's wooden room, smaller and drier). Independent noise per
// channel keeps left and right decorrelated; the tail falls 60 dB
// over rt60 while a one-pole low-pass slides from brightHz to darkHz
// (books and cloth eat the highs first); the diffuse field fades in
// over ~6 ms so the early taps stay discrete. Peak-normalised to 0.9.
export function roomImpulse({
  sampleRate,
  seconds = 0.7,
  rt60 = 0.38,
  predelay = 0.003,
  brightHz = 6500,
  darkHz = 1400,
  seed = 65,
} = {}) {
  const n = Math.round(sampleRate * seconds)
  const start = Math.min(n, Math.round(sampleRate * predelay))
  const fadeLen = Math.min(n - start, Math.round(sampleRate * 0.05))
  const decayStep = 10 ** (-3 / (rt60 * sampleRate))
  const buildStep = Math.exp(-1 / (0.006 * sampleRate))
  const channels = []

  for (let c = 0; c < 2; c += 1) {
    const rng = mulberry32(seed * 2 + c + 1)
    const out = new Float32Array(n)
    const taps = new Map()
    for (const [time, gain] of EARLY) {
      const at = start + Math.round((time + (rng() - 0.5) * 0.002) * sampleRate)
      if (at < n) taps.set(at, gain * 3 * (rng() < 0.5 ? -1 : 1))
    }

    let env = 1
    let build = 1
    let y = 0
    let a = 0
    for (let i = start; i < n; i += 1) {
      const k = i - start
      if ((k & 63) === 0) {
        const fc = brightHz * (darkHz / brightHz) ** (k / (n - start))
        a = 1 - Math.exp((-2 * Math.PI * fc) / sampleRate)
      }
      const x = (rng() * 2 - 1) * (1 - build) + (taps.get(i) ?? 0)
      y += a * (x - y)
      out[i] = y * env
      env *= decayStep
      build *= buildStep
    }

    // raised-cosine fade so the truncated tail can't click
    for (let j = 0; j < fadeLen; j += 1) {
      out[n - 1 - j] *= 0.5 - 0.5 * Math.cos((Math.PI * j) / fadeLen)
    }
    channels.push(out)
  }

  let peak = 0
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i += 1) peak = Math.max(peak, Math.abs(ch[i]))
  }
  if (peak > 0) {
    const g = 0.9 / peak
    for (const ch of channels) for (let i = 0; i < ch.length; i += 1) ch[i] *= g
  }
  return channels
}

// ------------------------------------------------------------
// Envelopes
// ------------------------------------------------------------

// Swoosh envelope for setValueCurveAtTime: a half-sine whose time
// axis is warped (x^k) so the peak lands at `peakAt` instead of the
// middle; `power` sharpens (>1) or flattens (<1) the hump. Starts
// and ends at exactly 0 so the curve can't click.
export function swooshCurve(n = 48, peakAt = 0.4, power = 1.5, scale = 1) {
  const len = Math.max(3, Math.floor(n))
  const k = Math.log(0.5) / Math.log(clamp(peakAt, 0.05, 0.95))
  const out = new Float32Array(len)
  for (let i = 1; i < len - 1; i += 1) {
    const x = i / (len - 1)
    out[i] = scale * Math.sin(Math.PI * x ** k) ** power
  }
  return out
}

// Seconds from onset until a linear-attack / exponential-decay
// envelope has fallen TAIL_DB.
export const envelopeLength = (attack, decay) => Math.max(0, attack) + Math.max(0, decay) * TAIL

// ------------------------------------------------------------
// Voice bookkeeping
// ------------------------------------------------------------

// Estimated linear level of a voice { start, end, gain } at `now`.
// One-shots decay exponentially to −TAIL_DB at their end, so their
// level in dB falls linearly across [start, end]. A voice scheduled
// in the future counts as full strength.
export function voiceLevel(v, now) {
  if (!v || !(v.end > now)) return 0
  const span = v.end - v.start
  const t = span > 0 && Number.isFinite(span) ? clamp01((now - v.start) / span) : 0
  const gain = v.gain == null || Number.isNaN(v.gain) ? 1 : Math.max(0, v.gain)
  return gain * 10 ** ((-TAIL_DB / 20) * t)
}

// Index of the voice to steal from a full pool: finished slots win
// outright, then the quietest right now, ties to whichever ends
// first. -1 only for an empty pool.
export function pickVoice(pool, now) {
  let best = -1
  let bestLevel = Infinity
  let bestEnd = Infinity
  for (let i = 0; i < pool.length; i += 1) {
    const v = pool[i]
    if (!v || !(v.end > now)) return i
    const level = voiceLevel(v, now)
    if (best === -1 || level < bestLevel || (level === bestLevel && v.end < bestEnd)) {
      best = i
      bestLevel = level
      bestEnd = v.end
    }
  }
  return best
}

// Minimum spacing per kind of sound, on the audio clock. A clock
// that runs backwards (a fresh context) never blocks.
export class MinGap {
  constructor(gaps = {}) {
    this.gaps = gaps
    this.last = new Map()
  }

  allow(key, now) {
    if (!Number.isFinite(now)) return false
    const gap = this.gaps[key] ?? 0
    const last = this.last.get(key)
    if (last !== undefined && now >= last && now - last < gap) return false
    this.last.set(key, now)
    return true
  }

  reset() {
    this.last.clear()
  }
}

// ------------------------------------------------------------
// Page turn — a stiff card sweeping through the air
// ------------------------------------------------------------

// Angular speed |dφ/dt| (rad/s) → drive 0..1. Silent under `gate`
// (a resting page jitters), then a soft knee: a lazy turn (~2 rad/s)
// sits near 0.35, a brisk one (~6) near 0.75, a flick saturates.
export const TURN = {
  gate: 0.15,
  knee: 4.5,
  minHz: 380,
  maxHz: 1900,
  maxGain: 0.45,
  curve: 1.1,
  airGain: 0.035,
  gritGain: 0.12,
}

export function turnDrive(speed, cfg = TURN) {
  const v = Number.isFinite(speed) ? Math.abs(speed) : 0
  if (v <= cfg.gate) return 0
  return 1 - Math.exp(-(v - cfg.gate) / cfg.knee)
}

// Drive → the whoosh bed's targets: the band's centre (log), its
// level (s^curve: moving air gets loud faster than it gets fast), a
// high "air" layer that only a quick turn reaches, and fibre grit
// from the page's edge. `out` lets the per-frame caller reuse one
// object.
export function turnWhoosh(speed, cfg = TURN, out = {}) {
  const s = turnDrive(speed, cfg)
  out.s = s
  out.gain = cfg.maxGain * s ** cfg.curve
  out.freq = logLerp(cfg.minHz, cfg.maxHz, s)
  out.air = cfg.airGain * s * s
  out.grit = cfg.gritGain * s
  return out
}

// Strength 0..1 of a page settling → level and slap brightness.
// Even a feather-light landing is heard, 12 dB down.
export function landLevel(strength) {
  const s = unit(strength, 0.6)
  return { s, gain: dbToGain(-12 * (1 - s)), bright: logLerp(1300, 2600, s) }
}

// ------------------------------------------------------------
// Friction beds — pull-tab, pencil
// ------------------------------------------------------------

export const FRICTION_GATE = 0.015

// Normalised speed → drive, silent at rest, rescaled so the gate
// doesn't leave a step.
export function frictionDrive(speed01) {
  const s = unit(speed01)
  return s <= FRICTION_GATE ? 0 : (s - FRICTION_GATE) / (1 - FRICTION_GATE)
}

// Paper sliding in a paper sleeve: a broad hiss whose band climbs
// with speed, fibres catching (dust, faster when faster), and a low
// rub of the tab's body in its slot.
export const SLIDE = { minHz: 900, maxHz: 2600, maxGain: 0.13, curve: 0.65, gritGain: 0.18, bodyGain: 0.3 }

export function slideHiss(speed01, cfg = SLIDE, out = {}) {
  const s = frictionDrive(speed01)
  out.s = s
  out.gain = cfg.maxGain * s ** cfg.curve
  out.freq = logLerp(cfg.minHz, cfg.maxHz, s)
  out.grit = cfg.gritGain * s
  out.rate = 0.5 + 0.9 * s
  out.body = cfg.bodyGain * s
  return out
}

// Graphite on card: brighter and grainier than the slide — the grit
// (stick–slip of the point) carries it, over a narrow hiss and the
// card's low resonance under the hand.
export const SCRATCH = { minHz: 2000, maxHz: 4200, maxGain: 0.13, curve: 0.6, gritGain: 0.45, bodyGain: 0.3 }

export function pencilScratch(speed01, cfg = SCRATCH, out = {}) {
  const s = frictionDrive(speed01)
  out.s = s
  out.gain = cfg.maxGain * s ** cfg.curve
  out.freq = logLerp(cfg.minHz, cfg.maxHz, s)
  out.grit = cfg.gritGain * s ** 0.6
  out.rate = 0.8 + 1.4 * s
  out.body = cfg.bodyGain * s
  return out
}

// ------------------------------------------------------------
// Pop-ups
// ------------------------------------------------------------

export const POP = {
  minHz: 650, // thwip band centre of the biggest card…
  maxHz: 1800, // …and the smallest
  minDur: 0.045,
  maxDur: 0.105,
  gap: 0.026, // calls closer than this ripple out…
  spread: 0.03, // …by up to this much more
  maxAhead: 0.32, // and past this the burst is full: drop
}

// One pop's recipe parameters. Bigger card: lower, longer, fuller,
// with a board knock. Every value jitters a little (rnd = 0.5 is the
// nominal sound) so a burst never repeats itself exactly.
export function popParams(size, rnd = Math.random) {
  const s = unit(size, 0.5)
  const dur = (POP.minDur + (POP.maxDur - POP.minDur) * s) * jitter(rnd, 0.12)
  return {
    size: s,
    freq: logLerp(POP.maxHz, POP.minHz, s) * jitter(rnd, 0.08),
    dur,
    gain: (0.45 + 0.55 * s) * dbToGain(1.5 * (2 * rnd() - 1)),
    snapAt: dur * (0.82 + 0.16 * rnd()),
    snapHz: logLerp(3600, 2000, s) * jitter(rnd, 0.06),
    bodyHz: logLerp(1400, 520, s) * jitter(rnd, 0.07),
  }
}

// Start time for a pop requested at `now` when the previous one was
// scheduled at `lastAt`. A lone pop goes now (plus a few ms of
// slop); one landing on the heels of another is pushed back so a
// spread opening ripples instead of stacking. -1: drop it.
export function popSlot(now, lastAt, rnd = Math.random, cfg = POP) {
  if (!Number.isFinite(now)) return -1
  const free = now + cfg.spread * 0.25 * rnd()
  if (!Number.isFinite(lastAt)) return free
  const at = Math.max(free, lastAt + cfg.gap + cfg.spread * rnd())
  return at - now > cfg.maxAhead ? -1 : at
}

// ------------------------------------------------------------
// The hardcover's spine creak
// ------------------------------------------------------------

// A creak is stick–slip: a train of tiny slips whose rate wanders.
// Returns [t, hz] breakpoints across `dur`: the rate swells toward
// the middle of the motion and wanders ±12% step to step.
export function creakPath(dur, rnd = Math.random, { minHz = 26, maxHz = 70, step = 0.03 } = {}) {
  const d = Number.isFinite(dur) && dur > 0 ? dur : 0.2
  const n = Math.max(2, Math.ceil(d / step) + 1)
  const base = logLerp(minHz, maxHz, 0.25 + 0.3 * rnd())
  const pts = []
  let wander = 1
  for (let i = 0; i < n; i += 1) {
    const x = i / (n - 1)
    const swell = 0.8 + 0.55 * Math.sin(Math.PI * x)
    pts.push([d * x, clamp(base * swell * wander, minHz, maxHz)])
    wander = clamp(wander * jitter(rnd, 0.12), 0.7, 1.4)
  }
  return pts
}

// ------------------------------------------------------------
// The record — a generative lo-fi loop
// ------------------------------------------------------------

// Four bars of swung eighths at 74 bpm, a descending chain of soft
// sevenths (Fmaj9 · Em7 · Dm9 · Cmaj9) voiced in close position so
// every voice steps down, a bass on 1 and the "and" of 3, and a
// music-box line that wanders through each chord's colour tones. The
// chords repeat; the melody is hashed from the absolute bar, so the
// record never plays the same four bars twice in a row.
export const RECORD = {
  bpm: 74,
  stepsPerBar: 8,
  bars: 4,
  swing: 0.17, // odd eighths land this fraction of a step late
  strum: 0.011, // seconds between chord notes, low to high
  seed: 0x65,
  chords: [
    { name: 'Fmaj9', bass: 41, keys: [57, 60, 64, 67], bell: [72, 74, 76, 79, 81] },
    { name: 'Em7', bass: 40, keys: [55, 59, 62, 64], bell: [71, 74, 76, 79, 83] },
    { name: 'Dm9', bass: 38, keys: [53, 57, 60, 64], bell: [69, 72, 74, 76, 77, 81] },
    { name: 'Cmaj9', bass: 36, keys: [52, 55, 59, 62], bell: [71, 72, 74, 76, 79] },
  ],
}

// Chance of a music-box note on each eighth of the bar: shy on the
// downbeat (the chord speaks there), keen on the offbeats.
const BELL_CHANCE = [0.08, 0.15, 0.45, 0.2, 0.35, 0.15, 0.5, 0.25]

export const recordStepSeconds = (cfg = RECORD) => 60 / cfg.bpm / 2
export const recordLoopSeconds = (cfg = RECORD) => recordStepSeconds(cfg) * cfg.stepsPerBar * cfg.bars

// Seconds from the loop's start to step `step`'s grid position.
export function recordGridTime(step, cfg = RECORD) {
  const sd = recordStepSeconds(cfg)
  return step * sd + (step % 2 === 1 ? cfg.swing * sd : 0)
}

export function recordChordAt(t, cfg = RECORD) {
  const bar = Math.floor(Math.max(0, Number.isFinite(t) ? t : 0) / (recordStepSeconds(cfg) * cfg.stepsPerBar))
  return cfg.chords[bar % cfg.bars]
}

// The music-box line for absolute bar `bar`: a walk through the
// chord's bell tones, sounding where the hash says so.
export function bellLine(bar, cfg = RECORD) {
  const set = cfg.chords[bar % cfg.bars].bell
  const h = (y) => hash2(bar, y, cfg.seed)
  let idx = Math.floor(h(0) * set.length)
  const out = []
  for (let k = 0; k < cfg.stepsPerBar; k += 1) {
    const move = h(100 + k)
    idx += move < 0.35 ? -1 : move < 0.7 ? 1 : move < 0.85 ? 2 : -2
    idx = clamp(idx, 0, set.length - 1)
    const chance = BELL_CHANCE[k % BELL_CHANCE.length] * (bar % cfg.bars === cfg.bars - 1 ? 0.6 : 1)
    out.push(h(1 + k) < chance ? { midi: set[idx], vel: 0.55 + 0.35 * h(200 + k) } : null)
  }
  return out
}

// Notes that start on step `step` (absolute, from 0): each is
// { voice: 'keys' | 'bass' | 'bell', midi, at, dur, vel } where `at`
// is a small offset (strum, humanising) after the step's grid time.
export function recordNotes(step, cfg = RECORD) {
  if (!Number.isInteger(step) || step < 0) return []
  const sd = recordStepSeconds(cfg)
  const bar = Math.floor(step / cfg.stepsPerBar)
  const k = step - bar * cfg.stepsPerBar
  const chord = cfg.chords[bar % cfg.bars]
  const h = (salt) => hash2(bar, k * 64 + salt, cfg.seed)
  const out = []

  if (k === 0) {
    chord.keys.forEach((midi, i) => {
      out.push({ voice: 'keys', midi, at: i * cfg.strum + 0.004 * h(i), dur: sd * 7.7, vel: 0.72 + 0.12 * h(8 + i) - 0.05 * i })
    })
    out.push({ voice: 'bass', midi: chord.bass, at: 0, dur: sd * 3.4, vel: 0.85 })
  } else if (k === 5) {
    out.push({ voice: 'bass', midi: chord.bass + (h(20) < 0.5 ? 7 : 12), at: 0.003, dur: sd * 2.6, vel: 0.6 })
    if (h(21) < 0.55) {
      chord.keys.slice(2).forEach((midi, i) => {
        out.push({ voice: 'keys', midi, at: 0.008 * i + 0.004 * h(22 + i), dur: sd * 2.4, vel: 0.42 })
      })
    }
  }

  const bell = bellLine(bar, cfg)[k]
  if (bell) out.push({ voice: 'bell', midi: bell.midi, at: 0.012 * h(30), dur: 1.8, vel: bell.vel })
  return out
}

// Every note starting in [t0, t1) seconds after the loop's start,
// with its absolute time `t`, in time order.
export function recordEventsBetween(t0, t1, cfg = RECORD) {
  if (!(Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0)) return []
  const sd = recordStepSeconds(cfg)
  const first = Math.max(0, Math.floor(t0 / sd) - 1)
  const last = Math.ceil(t1 / sd) + 1
  const out = []
  for (let step = first; step <= last; step += 1) {
    const grid = recordGridTime(step, cfg)
    for (const n of recordNotes(step, cfg)) {
      const t = grid + n.at
      if (t >= t0 && t < t1) out.push({ ...n, t, step })
    }
  }
  return out.sort((a, b) => a.t - b.t)
}
