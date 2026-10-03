// ============================================================
// Audio engine — every sound in Sixty-Five is synthesized here.
// No samples: card, air, graphite and the little record are all
// filtered noise, a few oscillators and envelopes.
//
//   one-shot voice ─▶ stereo pan ────────────────┐
//   beds: page air · pull-tab · pencil ─▶ pan ───┤
//   record: keys ▸ tremolo ┐                     │
//           bass, bells ───┴▶ lo-fi ▸ wow ─┐     │
//           crackle, hiss ─────────────────┴─────┤
//                                                ▼
//                                               mix ─┬─ dry 0.88 ────────────┐
//                                                    └─ room IR ─ wet 0.12 ──┤
//                                                                            ▼
//                                          compressor ─▶ master ─▶ destination
//
// One AudioContext, built lazily by unlock() inside a user gesture;
// nothing exists before that, and every call is a silent no-op
// until then (or when muted, or where there is no Web Audio). A
// voice is a one-shot subgraph whose sources all stop at known clock
// times, so bookkeeping is a list of end times: finished voices are
// reaped whenever a new one starts, and past MAX_VOICES the quietest
// is faded out and stolen.
//
// Beds are persistent patches for per-frame calls (turnMove, slide,
// scratch): a call only glides a few params; a watchdog releases the
// patch once the calls stop. The record runs its own lookahead
// scheduler while it spins.
// ============================================================

import {
  MinGap,
  clamp,
  clickNorm,
  creakPath,
  dbToGain,
  envelopeLength,
  jitter,
  landLevel,
  makeSamples,
  midiHz,
  pencilScratch,
  pickVoice,
  popParams,
  popSlot,
  recordGridTime,
  recordNotes,
  roomImpulse,
  slideHiss,
  swooshCurve,
  toPan,
  turnWhoosh,
} from './synth.js'

const STORAGE_KEY = 'd65.sound'
const MASTER_GAIN = 0.5
const WET = 0.12
const MAX_VOICES = 16

// A stolen voice fades with this time constant and its sources stop
// 6τ in (−52 dB).
const STEAL_TAU = 0.01
const STEAL_STOP = STEAL_TAU * 6

// A context made inside the first gesture may report 'suspended'
// until its resume() settles; sounds from that gesture still go.
const RESUME_GRACE_MS = 400
const SUSPEND_AFTER_MUTE_MS = 300

// Beds: skip param writes smaller than this (in drive units), and
// release the patch this long after the last moving call.
const BED_EPS = 0.004
const BED_IDLE_MS = 300

// Per-kind minimum spacing (s) so a nervous hand can't stack voices.
const GAPS = { turnStart: 0.05, turnLand: 0.06, flap: 0.06, tick: 0.02, cover: 0.2, chime: 0.3 }

// The record. Lookahead covers a background tab's 1 Hz timers.
const RECORD_LOOKAHEAD = 1.5
const RECORD_TICK_MS = 200
const RECORD_LEVEL = 0.5
const RECORD_FADE_IN = 0.9
const RECORD_FADE_OUT = 0.6
const KEYS_GAIN = 0.085
const BASS_GAIN = 0.09
const BELL_GAIN = 0.16
const CRACKLE_GAIN = 0.7
const HISS_GAIN = 0.012
// Tape-style wow: everything musical passes a short delay whose time
// an LFO wobbles (±1.1 ms at 0.55 Hz ≈ ±4 cents), and on stop the
// delay lengthens so the record winds down a little as it fades.
const WOW_BASE = 0.02
const WOW_DEPTH = 0.0011
const WIND_DOWN = 0.05

// Music-box tine: fundamental, a soft octave from the comb, and the
// tine's own bright mode (≈ 5.95×) that dies almost at once.
const MUSIC_BOX = [
  [1, 1, 0.55],
  [2, 0.1, 0.18],
  [5.95, 0.06, 0.03],
]
const CHIME_NOTES = [
  [76, 0], // E5
  [79, 0.15], // G5
  [84, 0.33], // C6
]

const clock = () => (globalThis.performance ? globalThis.performance.now() : Date.now())

// ------------------------------------------------------------
// Node helpers
// ------------------------------------------------------------

function biquad(c, type, freq, Q = 0.7) {
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = clamp(freq, 10, c.sampleRate * 0.45)
  f.Q.value = Q
  return f
}

function gainNode(c, value) {
  const g = c.createGain()
  g.gain.value = value
  return g
}

// A stereo panner feeding `dest`, or null where StereoPannerNode is
// missing (very old Safari) — callers then connect straight through.
function stereo(c, pan, dest) {
  if (typeof c.createStereoPanner !== 'function') return null
  const p = c.createStereoPanner()
  p.pan.value = pan
  p.connect(dest)
  return p
}

function makeBuffer(c, channels) {
  const buf = c.createBuffer(channels.length, channels[0].length, c.sampleRate)
  channels.forEach((data, i) => buf.getChannelData(i).set(data))
  return buf
}

function loopSource(c, buffer, t, rate = 1) {
  const src = c.createBufferSource()
  src.buffer = buffer
  src.loop = true
  src.playbackRate.value = rate
  src.start(t, Math.random() * buffer.duration)
  return src
}

// One sine (or other waveform) partial: linear attack, exponential
// decay with time constant `decay` to −80 dB, stopped 50 ms later.
// Optional pitch glide at the start. Returns its peak gain (0 if
// the request was out of range and nothing was made).
function partial(c, dest, hold, { t, freq, gain, attack = 0.002, decay = 0.1, glideTo = 0, glideTime = 0.03, type = 'sine', detune = 0 }) {
  if (!(freq > 20 && freq < c.sampleRate * 0.45) || !(gain > 1e-5) || !(decay > 0)) return 0
  const peakAt = t + Math.max(attack, 0.0005)
  const endAt = t + envelopeLength(Math.max(attack, 0.0005), decay)
  const osc = c.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (glideTo > 20) osc.frequency.exponentialRampToValueAtTime(glideTo, t + glideTime)
  if (detune) osc.detune.value = detune
  const env = c.createGain()
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(gain, peakAt)
  env.gain.exponentialRampToValueAtTime(gain * 1e-4, endAt)
  osc.connect(env).connect(dest)
  osc.start(t)
  hold(osc, endAt + 0.05)
  return gain
}

// ------------------------------------------------------------
// Voice — the handle one-shot recipes build on
// ------------------------------------------------------------

class Voice {
  constructor(c, start, out, panner, bufs) {
    this.ctx = c
    this.start = start // absolute clock time the voice begins
    this.end = start // latest stop time of any of its sources
    this.gain = 0 // rough peak level, for voice stealing
    this.out = out
    this.panner = panner
    this.noise = bufs.noise
    this.dust = bufs.dust
    this.impulse = bufs.impulse
    this.sources = []
    this.stops = [] // each source's scheduled stop, parallel to `sources`
    this.stolen = false
    this.hold = this.hold.bind(this)
  }

  hold(node, stopAt) {
    node.stop(stopAt)
    this.sources.push(node)
    this.stops.push(stopAt)
    if (stopAt > this.end) this.end = stopAt
  }

  tone(o) {
    this.gain += partial(this.ctx, this.out, this.hold, { ...o, t: this.start + Math.max(0, o.at ?? 0) })
  }

  // A filtered noise grain with the same attack / exponential-decay
  // envelope. `buffer` defaults to white noise; `rate` > 1 plays it
  // faster (for dust: denser, brighter clicks).
  grain({ gain, at = 0, attack = 0.0008, decay = 0.004, type = 'bandpass', freq = 2000, Q = 1, rate = 1, buffer = this.noise }) {
    if (!(gain > 1e-5) || !(decay > 0)) return
    const c = this.ctx
    const t = this.start + Math.max(0, at)
    const peakAt = t + Math.max(attack, 0.0002)
    const endAt = t + envelopeLength(Math.max(attack, 0.0002), decay)
    const src = this.source(buffer, at, endAt - t, rate)
    const env = c.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(gain, peakAt)
    env.gain.exponentialRampToValueAtTime(gain * 1e-4, endAt)
    src.connect(biquad(c, type, freq, Q)).connect(env).connect(this.out)
    this.gain += gain
  }

  // A unit impulse rung through a band-pass: a click whose ring peaks
  // at ~`gain`, identical every time but for the freq you pass.
  click({ gain, at = 0, freq, Q = 1 }) {
    if (!(gain > 1e-5) || !(freq > 20)) return
    const c = this.ctx
    const t = this.start + Math.max(0, at)
    const f = clamp(freq, 20, c.sampleRate * 0.45)
    const src = c.createBufferSource()
    src.buffer = this.impulse
    src.start(t)
    this.hold(src, t + 0.06) // the filter rings on after its source stops
    src.connect(biquad(c, 'bandpass', f, Q)).connect(gainNode(c, gain * clickNorm(f, Q, c.sampleRate))).connect(this.out)
    this.gain += gain
  }

  // Noise through a filter whose centre glides from → to (→ end), under
  // a swoosh-shaped envelope: the sound of card moving through air.
  swish({ gain, dur, at = 0, from, to, end = 0, peakAt = 0.4, power = 1.4, Q = 0.8, type = 'bandpass', rate = 1, buffer = this.noise }) {
    if (!(gain > 1e-5) || !(dur > 0.01)) return
    const c = this.ctx
    const t = this.start + Math.max(0, at)
    const hz = (f) => clamp(f, 30, c.sampleRate * 0.45)
    const src = this.source(buffer, at, dur, rate)
    const filter = biquad(c, type, hz(from), Q)
    filter.frequency.setValueAtTime(hz(from), t)
    if (end > 0) {
      filter.frequency.exponentialRampToValueAtTime(hz(to), t + dur * clamp(peakAt, 0.05, 0.95))
      filter.frequency.exponentialRampToValueAtTime(hz(end), t + dur)
    } else {
      filter.frequency.exponentialRampToValueAtTime(hz(to), t + dur)
    }
    const env = gainNode(c, 0)
    env.gain.setValueCurveAtTime(swooshCurve(32, peakAt, power, gain), t, dur)
    src.connect(filter).connect(env).connect(this.out)
    this.gain += gain
  }

  // A spine creak: a band-limited pulse train (one pulse per slip)
  // whose rate follows `path`, rung through two narrow resonances of
  // the board, under a soft swell.
  creak({ gain, dur, at = 0, path, f1, f2 }) {
    if (!(gain > 1e-5) || !(dur > 0.02) || !path?.length) return
    const c = this.ctx
    const t = this.start + Math.max(0, at)
    const osc = c.createOscillator()
    if (pulseWave && typeof osc.setPeriodicWave === 'function') osc.setPeriodicWave(pulseWave)
    else osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(path[0][1], t)
    for (let i = 1; i < path.length; i += 1) osc.frequency.linearRampToValueAtTime(path[i][1], t + path[i][0])
    const hp = biquad(c, 'highpass', 450, 0.7)
    const env = gainNode(c, 0)
    env.gain.setValueCurveAtTime(swooshCurve(24, 0.35, 0.8, gain), t, dur)
    osc.connect(hp)
    hp.connect(biquad(c, 'bandpass', f1, 6)).connect(env)
    hp.connect(biquad(c, 'bandpass', f2, 8)).connect(gainNode(c, 0.6)).connect(env)
    env.connect(this.out)
    osc.start(t)
    this.hold(osc, t + dur + 0.05)
    this.gain += gain
  }

  // A started buffer source for `len` seconds from a random offset (so
  // repeated grains never share the same noise), stopped 50 ms after.
  source(buffer, at, len, rate = 1) {
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = rate
    const t = this.start + Math.max(0, at)
    const span = len * rate
    if (span >= buffer.duration - 0.01) src.loop = true
    const offset = src.loop ? 0 : Math.random() * (buffer.duration - span - 0.01)
    src.start(t, offset)
    this.hold(src, t + len + 0.05)
    return src
  }
}

// ------------------------------------------------------------
// One-shot recipes
// ------------------------------------------------------------

const rnd = () => Math.random()

// Fingers lifting a stiff page off the stack: the edge letting go
// of the sheet beneath (a soft peel and a few fibre ticks), the card
// flexing, then the first breath of air as it rises.
function playTurnStart(v) {
  v.grain({ gain: 0.38, attack: 0.007, decay: 0.014, type: 'bandpass', freq: 1150 * jitter(rnd, 0.1), Q: 0.8 })
  v.grain({ buffer: v.dust, rate: 1.1, gain: 0.25, at: 0.006, attack: 0.002, decay: 0.012, type: 'bandpass', freq: 3000, Q: 0.8 })
  v.grain({ gain: 1.1, attack: 0.005, decay: 0.012, type: 'lowpass', freq: 360, Q: 0.7 })
  v.swish({ at: 0.03, dur: 0.24, from: 600, to: 1600 * jitter(rnd, 0.08), end: 1000, peakAt: 0.42, power: 1.3, gain: 0.32, Q: 1 })
}

// The page settling onto the stack: a padded thud of sheet on sheet
// (an impulse through a low resonance, so it lands the same every
// time), air squeezed out from under it (a soft low "fwup"), the
// paper slap, a felt thump through the boards, and the last of the
// air along the fore-edge.
function playTurnLand(v, strength) {
  const { s, gain: l, bright } = landLevel(strength)
  v.click({ at: 0.004, gain: 0.16 * l, freq: 150 + 70 * s, Q: 1 })
  v.grain({ gain: 1 * l, attack: 0.006, decay: 0.016, type: 'lowpass', freq: 260 + 300 * s, Q: 0.7 })
  v.grain({ at: 0.006, gain: (0.18 + 0.25 * s) * l, attack: 0.0008, decay: 0.0035, type: 'bandpass', freq: bright * jitter(rnd, 0.08), Q: 0.8 })
  v.tone({ at: 0.004, freq: 92, glideTo: 68, glideTime: 0.04, gain: 0.16 * l * s, attack: 0.003, decay: 0.026 })
  v.swish({ at: 0.012, dur: 0.16, from: 1100, to: 520, peakAt: 0.25, power: 1.2, gain: 0.12 * l, Q: 0.7 })
}

// A pop-up springing upright: "thwip" — the card's face cutting the
// air, a band of noise that climbs fast and falls back — then the
// fold locking flat: a crisp click over a few ms of panel flex, and
// for a big card a knock into the page it stands on.
function playPop(v, p) {
  v.swish({ dur: p.dur, from: p.freq * 0.55, to: p.freq * 1.35, end: p.freq * 0.9, peakAt: 0.7, power: 1.8, gain: 1.12 * p.gain, Q: 1.8 })
  v.click({ at: p.snapAt, gain: 0.28 * p.gain, freq: p.snapHz, Q: 0.9 })
  v.click({ at: p.snapAt, gain: 0.28 * p.gain, freq: p.bodyHz, Q: 4.5 })
  v.grain({ at: p.snapAt, gain: 0.085 * p.gain, attack: 0.0003, decay: 0.0012, type: 'highpass', freq: 2500, Q: 0.7 })
  if (p.size > 0.25) {
    v.grain({ at: p.snapAt + 0.0015, gain: 1.7 * p.gain * p.size, attack: 0.001, decay: 0.006, type: 'lowpass', freq: 300, Q: 0.7 })
  }
}

// Lift-the-flap. Open: the flap unsticks, swings up, and its crease
// flexes at the top. Closed: it falls and pats onto the page.
function playFlap(v, open) {
  if (open) {
    v.grain({ buffer: v.dust, rate: 1.1, gain: 0.36, attack: 0.001, decay: 0.008, type: 'bandpass', freq: 2600, Q: 0.8 })
    v.swish({ at: 0.012, dur: 0.22, from: 550, to: 1400 * jitter(rnd, 0.08), end: 900, peakAt: 0.45, power: 1.3, gain: 0.38, Q: 0.9 })
    v.click({ at: 0.19, gain: 0.12, freq: 950 * jitter(rnd, 0.08), Q: 2.2 })
  } else {
    v.swish({ dur: 0.14, from: 1500 * jitter(rnd, 0.08), to: 620, peakAt: 0.7, power: 1.4, gain: 0.2, Q: 0.85 })
    v.grain({ at: 0.13, gain: 1, attack: 0.002, decay: 0.01, type: 'lowpass', freq: 480, Q: 0.7 })
    v.grain({ at: 0.13, gain: 0.16, attack: 0.0006, decay: 0.0028, type: 'bandpass', freq: 1900, Q: 0.9 })
  }
}

// One detent of a paper volvelle over its rivet: a dry "tk" with the
// card disc's low body under it. Alternate detents sit a hair apart
// in pitch and every one jitters, so a fast spin purrs rather than
// buzzes. Under 40 ms all in.
let tickFlip = false
function playTick(v) {
  tickFlip = !tickFlip
  const g = dbToGain(1.2 * (2 * rnd() - 1))
  v.click({ gain: 0.1 * g, freq: (tickFlip ? 2700 : 2450) * jitter(rnd, 0.05), Q: 1.1 })
  v.click({ gain: 0.09 * g, freq: 620 * jitter(rnd, 0.06), Q: 4 })
  v.grain({ gain: 0.03 * g, attack: 0.0002, decay: 0.0008, type: 'highpass', freq: 3000, Q: 0.7 })
}

// The hardcover board: the spine creaks as it starts to move, book
// cloth rubs at the joint, and `landIn` seconds later the board
// lands — a deep, padded thump (heavier closing, with the page block
// trapping air).
function playCover(v, open, landIn) {
  const creakDur = clamp(landIn * 0.8, 0.14, 0.6)
  const path = creakPath(creakDur, rnd, open ? undefined : { minHz: 22, maxHz: 52 })
  v.creak({ dur: creakDur, gain: open ? 0.4 : 0.3, path, f1: (open ? 880 : 760) * jitter(rnd, 0.06), f2: 1500 * jitter(rnd, 0.06) })
  v.swish({ dur: creakDur + 0.05, from: 450, to: 900, end: 600, peakAt: 0.4, power: 1, gain: 0.06, Q: 0.7 })
  const heavy = open ? 1 : 1.1
  v.click({ at: landIn, gain: 0.36 * heavy, freq: open ? 110 : 95, Q: 1.1 })
  v.grain({ at: landIn, gain: 1.9 * heavy, attack: 0.007, decay: open ? 0.026 : 0.032, type: 'lowpass', freq: open ? 230 : 290, Q: 0.7 })
  v.tone({ at: landIn, freq: open ? 80 : 72, glideTo: open ? 58 : 52, glideTime: 0.06, gain: 0.22 * heavy, attack: 0.004, decay: 0.045 })
  v.grain({ at: landIn + 0.003, gain: 0.2, attack: 0.001, decay: 0.006, type: 'bandpass', freq: 1050, Q: 0.9 })
}

// A small find: three music-box notes rising to the tonic.
function playChime(v) {
  for (const [midi, at] of CHIME_NOTES) {
    const f = midiHz(midi) * jitter(rnd, 0.002)
    for (const [ratio, g, decay] of MUSIC_BOX) v.tone({ at, freq: f * ratio, gain: 0.066 * g, attack: 0.0015, decay: decay * 1.3 })
    v.grain({ at, gain: 0.03, attack: 0.0002, decay: 0.0005, type: 'highpass', freq: 3500, Q: 0.7 })
  }
}

// ------------------------------------------------------------
// Engine state
// ------------------------------------------------------------

let ctx = null
let muted = readMuted()
let broken = false
let warned = false
let resumeUntil = 0
let suspendTimer = 0
let master = null
let mix = null
let bufs = null // { noise, dust, vinyl, impulse } AudioBuffers
let pulseWave = null
let voices = []
let beds = null // { turn, slide, scratch }
let session = null // the spinning record, if audible
let recordOn = false // what the scene asked for
let lastPopAt = -Infinity
let turnPan = 0
const gaps = new MinGap(GAPS)

// scratch objects for the per-frame maps
const turnParams = {}
const slideParams = {}
const scratchParams = {}

function readMuted() {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

function writeMuted() {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, muted ? 'off' : 'on')
  } catch {
    // private mode / blocked storage: the setting just won't persist
  }
}

function warnOnce(err) {
  if (!warned) console.warn('[audio]', err)
  warned = true
}

// ------------------------------------------------------------
// Context and graph
// ------------------------------------------------------------

function createContext() {
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!Ctor) return null
  try {
    return new Ctor({ latencyHint: 'interactive' })
  } catch {
    try {
      return new Ctor()
    } catch {
      return null
    }
  }
}

// A band-limited impulse train (equal-amplitude cosine harmonics):
// one click per period, the excitation for the spine's stick–slip.
function makePulseWave(c) {
  if (typeof c.createPeriodicWave !== 'function') return null
  const n = 64
  const real = new Float32Array(n + 1)
  const imag = new Float32Array(n + 1)
  for (let k = 1; k <= n; k += 1) real[k] = 1
  try {
    return c.createPeriodicWave(real, imag)
  } catch {
    return null
  }
}

function build(c) {
  const sr = c.sampleRate
  const data = makeSamples(sr)
  bufs = {
    noise: makeBuffer(c, [data.noise]),
    dust: makeBuffer(c, [data.dust]),
    vinyl: makeBuffer(c, [data.vinyl]),
    impulse: makeBuffer(c, [data.impulse]),
  }
  pulseWave = makePulseWave(c)

  master = gainNode(c, muted ? 0 : MASTER_GAIN)

  // gentle: a couple of dB off a pile-up (a spread's pop-ups landing
  // on a page turn), nothing on a single page.
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.knee.value = 10
  comp.ratio.value = 2.5
  comp.attack.value = 0.004
  comp.release.value = 0.25
  comp.connect(master).connect(c.destination)

  mix = c.createGain()
  const room = c.createConvolver()
  room.buffer = makeBuffer(c, roomImpulse({ sampleRate: sr }))
  mix.connect(gainNode(c, 1 - WET)).connect(comp)
  mix.connect(room).connect(gainNode(c, WET)).connect(comp)

  beds = { turn: new Bed(turnPatch), slide: new Bed(slidePatch), scratch: new Bed(scratchPatch) }
  globalThis.document?.addEventListener?.('visibilitychange', onVisibility)
}

function ready() {
  if (!ctx || muted) return false
  if (ctx.state === 'running') return true
  return ctx.state === 'suspended' && clock() < resumeUntil
}

// Swallow a promise rejection (and cope with old webkit returning nothing).
function settle(p) {
  if (p && typeof p.catch === 'function') p.catch(() => {})
}

function resume() {
  if (ctx.state === 'running' || ctx.state === 'closed') return
  resumeUntil = clock() + RESUME_GRACE_MS
  try {
    settle(ctx.resume())
  } catch {
    // some webkit builds throw outside a gesture; the next unlock() retries
  }
}

function suspendSoon() {
  clearTimeout(suspendTimer)
  suspendTimer = setTimeout(() => {
    suspendTimer = 0
    if (ctx && muted && ctx.state === 'running') settle(ctx.suspend())
  }, SUSPEND_AFTER_MUTE_MS)
}

// The context is created here even when muted — this is the call that
// runs inside a user gesture, so a later unmute only has to resume it.
// If building the graph fails the engine stays silent for the session
// rather than throwing out of every pointerdown.
function unlock() {
  if (!ctx) {
    if (broken) return false
    const c = createContext()
    if (!c) return false
    try {
      build(c)
    } catch (err) {
      broken = true
      console.warn('[audio] disabled:', err)
      beds = null
      try {
        settle(c.close())
      } catch {
        // nothing left to release
      }
      return false
    }
    ctx = c
  }
  if (ctx.state === 'closed') return false
  if (muted) {
    if (ctx.state === 'running' && !suspendTimer) suspendSoon()
    return true
  }
  clearTimeout(suspendTimer)
  suspendTimer = 0
  resume()
  if (recordOn && !session) startRecord()
  return true
}

function setMuted(value) {
  muted = !!value
  writeMuted()
  // no context yet: the next unlock() builds one at the right level
  if (!ctx || ctx.state === 'closed') return
  master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.04)
  if (muted) {
    hush()
    suspendSoon()
  } else {
    unlock()
  }
}

// Fade every bed and stop the record's sound (the record stays "on":
// unmuting or coming back to the tab picks it up again).
function hush() {
  if (beds) for (const b of Object.values(beds)) b.fade()
  if (session) {
    session.stop()
    session = null
  }
}

// A hidden tab stops sending frames; don't leave a bed hanging or a
// record scheduling into a throttled timer.
function onVisibility() {
  if (globalThis.document.hidden) hush()
  else if (recordOn && !session && ready()) startRecord()
}

function dispose() {
  hush()
  recordOn = false
  clearTimeout(suspendTimer)
  suspendTimer = 0
  globalThis.document?.removeEventListener?.('visibilitychange', onVisibility)
  if (ctx) {
    try {
      settle(ctx.close())
    } catch {
      // already gone
    }
  }
  ctx = null
  master = null
  mix = null
  bufs = null
  pulseWave = null
  beds = null
  voices = []
  lastPopAt = -Infinity
  turnPan = 0
  broken = false
  gaps.reset()
}

// ------------------------------------------------------------
// Voice lifecycle
// ------------------------------------------------------------

function release(v) {
  v.out.disconnect()
  v.panner?.disconnect()
  v.sources.length = 0
  v.stops.length = 0
}

// Drop finished voices, detaching their (already stopped) subgraphs.
function reap(now) {
  let keep = 0
  for (const v of voices) {
    if (v.end > now) voices[keep++] = v
    else release(v)
  }
  voices.length = keep
}

function steal(v, now) {
  v.stolen = true
  v.out.gain.setTargetAtTime(0, now, STEAL_TAU)
  const stopAt = now + STEAL_STOP
  v.sources.forEach((s, i) => {
    // a later stop() replaces the earlier one, so only ever shorten
    if (v.stops[i] <= stopAt) return
    try {
      s.stop(stopAt)
      v.stops[i] = stopAt
    } catch {
      // older webkit throws on a second stop(); it ends on its own schedule
    }
  })
  v.end = Math.min(v.end, stopAt)
  v.gain = 0
}

function openVoice(pan, at) {
  const now = ctx.currentTime
  reap(now)
  const live = voices.filter((v) => !v.stolen)
  if (live.length >= MAX_VOICES) steal(live[pickVoice(live, now)], now)
  const out = ctx.createGain()
  const panner = stereo(ctx, toPan(pan), mix)
  out.connect(panner ?? mix)
  return new Voice(ctx, Math.max(now, at ?? now), out, panner, bufs)
}

// A sound effect must never take an interaction down with it, so a
// recipe that throws is logged once and otherwise ignored.
function emit(pan, play, at) {
  if (!ready()) return
  const v = openVoice(pan, at)
  try {
    play(v)
  } catch (err) {
    warnOnce(err)
  }
  if (!v.sources.length) {
    release(v)
    return
  }
  voices.push(v)
}

// ------------------------------------------------------------
// Beds — persistent patches driven per frame
// ------------------------------------------------------------

// Stop a released patch's sources after its fade, then detach it.
function retire(at, sources, outs) {
  for (const s of sources) {
    try {
      s.stop(at + 0.4)
    } catch {
      // already stopped
    }
  }
  setTimeout(() => {
    for (const o of outs) o?.disconnect()
  }, 600)
}

// Lifecycle around a patch factory make(t) → { set(p, t), pan(x, t),
// release(t) }. drive() with p.s > 0 opens the patch if needed and
// glides it (skipping changes too small to hear); p.s = 0 glides it
// silent. A watchdog releases the patch BED_IDLE_MS after the last
// moving call, so a lost pointerup or a page that stopped reporting
// can never leave a hiss hanging.
class Bed {
  constructor(make) {
    this.make = make
    this.live = null
    this.level = 0
    this.pan = NaN
    this.last = 0
    this.timer = 0
    this.check = this.check.bind(this)
  }

  get running() {
    return this.live !== null
  }

  drive(p, pan) {
    const t = ctx.currentTime
    if (!(p.s > 0)) {
      if (this.live && this.level > 0) {
        this.live.set(p, t)
        this.level = 0
      }
      return
    }
    if (!this.live) {
      this.live = this.make(t)
      this.level = 0
      this.pan = NaN
    }
    if (Math.abs(p.s - this.level) > BED_EPS) {
      this.live.set(p, t)
      this.level = p.s
    }
    // (this.pan starts NaN, and NaN > x is false: hence the negation)
    if (Number.isFinite(pan) && !(Math.abs(pan - this.pan) <= 0.01)) {
      this.live.pan(pan, t)
      this.pan = pan
    }
    this.last = clock()
    if (!this.timer) this.timer = setTimeout(this.check, BED_IDLE_MS)
  }

  quiet(p) {
    if (this.live && this.level > 0) {
      this.live.set(p, ctx.currentTime)
      this.level = 0
    }
  }

  fade() {
    clearTimeout(this.timer)
    this.timer = 0
    if (!this.live) return
    try {
      this.live.release(ctx.currentTime)
    } catch (err) {
      warnOnce(err)
    }
    this.live = null
    this.level = 0
  }

  // One pending timer at most: when it fires it re-arms for whatever
  // is left of the idle window, rather than a clear/set per frame.
  check() {
    this.timer = 0
    if (!ctx) return
    const idle = clock() - this.last
    if (idle >= BED_IDLE_MS - 1) this.fade()
    else this.timer = setTimeout(this.check, BED_IDLE_MS - idle)
  }
}

// The turning page's air: a band of noise that brightens and swells
// with angular speed, a high "air" layer only a quick turn reaches,
// and fibre grit from the sweeping edge.
function turnPatch(t) {
  const noise = loopSource(ctx, bufs.noise, t)
  const fibres = loopSource(ctx, bufs.dust, t, 0.9)
  const band = biquad(ctx, 'bandpass', 380, 0.75)
  const air = biquad(ctx, 'bandpass', 4200, 0.7)
  const edge = biquad(ctx, 'bandpass', 1800, 1.2)
  const body = gainNode(ctx, 0)
  const airy = gainNode(ctx, 0)
  const grit = gainNode(ctx, 0)
  const out = gainNode(ctx, 1)
  const panner = stereo(ctx, turnPan, mix)
  out.connect(panner ?? mix)
  noise.connect(band).connect(body).connect(out)
  noise.connect(air).connect(airy).connect(out)
  fibres.connect(edge).connect(grit).connect(out)
  return {
    set(p, at) {
      band.frequency.setTargetAtTime(p.freq, at, 0.07)
      body.gain.setTargetAtTime(p.gain, at, 0.06)
      airy.gain.setTargetAtTime(p.air, at, 0.08)
      grit.gain.setTargetAtTime(p.grit, at, 0.06)
    },
    pan(x, at) {
      panner?.pan.setTargetAtTime(x, at, 0.08)
    },
    release(at) {
      for (const g of [body, airy, grit]) g.gain.setTargetAtTime(0, at, 0.04)
      retire(at, [noise, fibres], [out, panner])
    },
  }
}

// Pull-tab: paper sliding in a paper sleeve.
function slidePatch(t) {
  const noise = loopSource(ctx, bufs.noise, t)
  const fibres = loopSource(ctx, bufs.dust, t, 0.5)
  const hiss = biquad(ctx, 'bandpass', 900, 0.6)
  const catches = biquad(ctx, 'bandpass', 2200, 1.2)
  const rub = biquad(ctx, 'bandpass', 320, 0.9)
  const hissG = gainNode(ctx, 0)
  const gritG = gainNode(ctx, 0)
  const bodyG = gainNode(ctx, 0)
  const out = gainNode(ctx, 1)
  out.connect(mix)
  noise.connect(hiss).connect(hissG).connect(out)
  noise.connect(rub).connect(bodyG).connect(out)
  fibres.connect(catches).connect(gritG).connect(out)
  return {
    set(p, at) {
      hiss.frequency.setTargetAtTime(p.freq, at, 0.05)
      hissG.gain.setTargetAtTime(p.gain, at, 0.04)
      gritG.gain.setTargetAtTime(p.grit, at, 0.04)
      bodyG.gain.setTargetAtTime(p.body, at, 0.05)
      fibres.playbackRate.setTargetAtTime(p.rate, at, 0.05)
    },
    pan() {},
    release(at) {
      for (const g of [hissG, gritG, bodyG]) g.gain.setTargetAtTime(0, at, 0.03)
      retire(at, [noise, fibres], [out])
    },
  }
}

// Pencil on the blank last page: graphite grit (dust played faster
// with stroke speed) over a narrow bright hiss and the card's low
// resonance under the hand.
function scratchPatch(t) {
  const noise = loopSource(ctx, bufs.noise, t)
  const grain = loopSource(ctx, bufs.dust, t, 0.8)
  const hiss = biquad(ctx, 'bandpass', 2000, 1.4)
  const grit = biquad(ctx, 'bandpass', 3200, 0.9)
  const tooth = biquad(ctx, 'bandpass', 420, 1.2)
  const hissG = gainNode(ctx, 0)
  const gritG = gainNode(ctx, 0)
  const bodyG = gainNode(ctx, 0)
  const out = gainNode(ctx, 1)
  out.connect(mix)
  noise.connect(hiss).connect(hissG).connect(out)
  noise.connect(tooth).connect(bodyG).connect(out)
  grain.connect(grit).connect(gritG).connect(out)
  return {
    set(p, at) {
      hiss.frequency.setTargetAtTime(p.freq, at, 0.04)
      hissG.gain.setTargetAtTime(p.gain, at, 0.03)
      gritG.gain.setTargetAtTime(p.grit, at, 0.03)
      bodyG.gain.setTargetAtTime(p.body, at, 0.04)
      grain.playbackRate.setTargetAtTime(p.rate, at, 0.04)
    },
    pan() {},
    release(at) {
      for (const g of [hissG, gritG, bodyG]) g.gain.setTargetAtTime(0, at, 0.025)
      retire(at, [noise, grain], [out])
    },
  }
}

// ------------------------------------------------------------
// The record
// ------------------------------------------------------------

// One spin of the record: its own little signal chain, a lookahead
// scheduler over the pure score in synth.js, and surface noise. A
// stopped session fades, winds down and detaches itself; starting
// again builds a fresh one, so a quick off/on never fights a fade.
class RecordSession {
  constructor() {
    const c = ctx
    const t = c.currentTime
    this.sources = [] // { node, stopAt } of scheduled notes
    this.stopped = false

    this.out = gainNode(c, 0)
    this.out.gain.setValueAtTime(0, t)
    this.out.gain.linearRampToValueAtTime(RECORD_LEVEL, t + RECORD_FADE_IN)
    this.out.connect(mix)

    // lo-fi: thin the lows, roll off the top, then the wow delay
    this.wow = c.createDelay(0.25)
    this.wow.delayTime.value = WOW_BASE
    this.music = gainNode(c, 1)
    this.music.connect(biquad(c, 'highpass', 110, 0.5)).connect(biquad(c, 'lowpass', 2800, 0.5)).connect(this.wow).connect(this.out)

    // keys pass a suitcase-style auto-pan
    this.keys = gainNode(c, 1)
    const trem = stereo(c, 0, this.music)
    this.keys.connect(trem ?? this.music)

    const wowLfo = c.createOscillator()
    wowLfo.frequency.value = 0.55
    wowLfo.connect(gainNode(c, WOW_DEPTH)).connect(this.wow.delayTime)
    const flutter = c.createOscillator()
    flutter.frequency.value = 6.3
    flutter.connect(gainNode(c, WOW_DEPTH * 0.05)).connect(this.wow.delayTime)
    const tremLfo = c.createOscillator()
    tremLfo.frequency.value = 3.1
    if (trem) tremLfo.connect(gainNode(c, 0.22)).connect(trem.pan)

    // the surface: crackle and a breath of hiss, not wobbled
    const crackle = loopSource(c, bufs.vinyl, t)
    crackle.connect(biquad(c, 'highpass', 700, 0.5)).connect(biquad(c, 'lowpass', 7000, 0.5)).connect(gainNode(c, CRACKLE_GAIN)).connect(this.out)
    const hiss = loopSource(c, bufs.noise, t)
    hiss.connect(biquad(c, 'bandpass', 5000, 0.5)).connect(gainNode(c, HISS_GAIN)).connect(this.out)

    for (const o of [wowLfo, flutter, tremLfo]) o.start(t)
    this.fixed = [wowLfo, flutter, tremLfo, crackle, hiss]

    this.loopStart = t + 0.3 // let the needle settle into the groove
    this.step = 0
    this.hold = this.hold.bind(this)
    this.tick = this.tick.bind(this)
    this.timer = setInterval(this.tick, RECORD_TICK_MS)
    this.tick()
  }

  hold(node, stopAt) {
    node.stop(stopAt)
    this.sources.push({ node, stopAt })
  }

  tick() {
    if (this.stopped || !ctx) return
    try {
      const now = ctx.currentTime
      const horizon = now + RECORD_LOOKAHEAD
      // fell behind (a frozen tab, a suspended context): skip what's past
      for (let i = 0; i < 512 && this.loopStart + recordGridTime(this.step) < now; i += 1) this.step += 1
      for (let i = 0; i < 64; i += 1) {
        const at = this.loopStart + recordGridTime(this.step)
        if (at >= horizon) break
        for (const n of recordNotes(this.step)) this.play(n, at + n.at)
        this.step += 1
      }
      let keep = 0
      for (const s of this.sources) if (s.stopAt > now) this.sources[keep++] = s
      this.sources.length = keep
    } catch (err) {
      warnOnce(err)
      this.stop()
    }
  }

  play(n, t) {
    if (n.voice === 'keys') this.rhodes(t, n)
    else if (n.voice === 'bass') this.bass(t, n)
    else this.bell(t, n)
  }

  // Electric piano: a sine carrier phase-modulated by a sine at the
  // same pitch. The modulation index starts high (the tine's bark)
  // and settles low (the mellow body); harder notes bark more.
  rhodes(t, { midi, dur, vel }) {
    const c = ctx
    const f = midiHz(midi)
    const car = c.createOscillator()
    car.frequency.value = f
    car.detune.value = (Math.random() - 0.5) * 6
    const mod = c.createOscillator()
    mod.frequency.value = f
    const index = gainNode(c, 0)
    index.gain.setValueAtTime(f * (0.8 + 1.4 * vel), t)
    index.gain.setTargetAtTime(f * 0.4, t + 0.003, 0.2)
    const peak = KEYS_GAIN * vel
    const env = gainNode(c, 0)
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(peak, t + 0.006)
    env.gain.setTargetAtTime(peak * 0.3, t + 0.006, 0.5)
    env.gain.setTargetAtTime(0, t + dur, 0.14)
    mod.connect(index).connect(car.frequency)
    car.connect(env).connect(this.keys)
    car.start(t)
    mod.start(t)
    const stopAt = t + dur + 0.14 * 7
    this.hold(car, stopAt)
    this.hold(mod, stopAt)
  }

  // Round bass: a sine with a soft octave above, so it still reads on
  // a laptop speaker.
  bass(t, { midi, dur, vel }) {
    const c = ctx
    const f = midiHz(midi)
    const peak = BASS_GAIN * vel
    const env = gainNode(c, 0)
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(peak, t + 0.02)
    env.gain.setTargetAtTime(peak * 0.5, t + 0.02, 0.4)
    env.gain.setTargetAtTime(0, t + dur, 0.08)
    env.connect(this.music)
    const stopAt = t + dur + 0.08 * 7
    for (const [ratio, g] of [
      [1, 1],
      [2, 0.25],
    ]) {
      const o = c.createOscillator()
      o.frequency.value = f * ratio
      o.connect(gainNode(c, g)).connect(env)
      o.start(t)
      this.hold(o, stopAt)
    }
  }

  bell(t, { midi, vel }) {
    const f = midiHz(midi)
    for (const [ratio, g, decay] of MUSIC_BOX) {
      partial(ctx, this.music, this.hold, { t, freq: f * ratio, gain: BELL_GAIN * vel * g, attack: 0.0015, decay })
    }
  }

  // Fade over RECORD_FADE_OUT while the wow delay lengthens (pitch
  // sags a few percent: the platter coasting), cut every scheduled
  // note at the end of the fade, then detach.
  stop() {
    if (this.stopped) return
    this.stopped = true
    clearInterval(this.timer)
    if (!ctx) return
    const t = ctx.currentTime
    const end = t + RECORD_FADE_OUT
    const g = this.out.gain
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(0, end)
    const d = this.wow.delayTime
    d.cancelScheduledValues(t)
    d.setValueAtTime(WOW_BASE, t)
    d.linearRampToValueAtTime(WOW_BASE + WIND_DOWN, end)
    const cut = end + 0.02
    for (const s of this.sources) {
      if (s.stopAt <= cut) continue
      try {
        s.node.stop(cut)
        s.stopAt = cut
      } catch {
        // older webkit throws on a second stop(); it ends on its own schedule
      }
    }
    for (const s of this.fixed) {
      try {
        s.stop(cut)
      } catch {
        // already stopped
      }
    }
    const out = this.out
    setTimeout(() => out.disconnect(), (RECORD_FADE_OUT + 0.3) * 1000)
  }
}

function startRecord() {
  if (session || !ready()) return
  try {
    session = new RecordSession()
  } catch (err) {
    warnOnce(err)
    session = null
  }
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

const finite = (x, fallback) => (Number.isFinite(x) ? x : fallback)

export const audio = {
  // Create or resume the context. Call from user gestures (pointerdown,
  // keydown); cheap and safe to call on every one. → true if usable.
  unlock,
  setMuted,
  get muted() {
    return muted
  },
  isMuted: () => muted,
  dispose,

  // Fingers lift a page off the stack. pan: −1 left of the spine … 1 right.
  turnStart(pan) {
    turnPan = toPan(pan)
    if (!ready() || !gaps.allow('turnStart', ctx.currentTime)) return
    if (beds.turn.running) beds.turn.live.pan(turnPan, ctx.currentTime)
    emit(pan, playTurnStart)
  },

  // Every frame while a page moves: speed = |dφ/dt| in rad/s. Optional
  // pan (−1…1) moves the whoosh with the page; otherwise it stays where
  // turnStart put it.
  turnMove(speed, pan) {
    if (!ready()) return
    turnWhoosh(speed, undefined, turnParams)
    beds.turn.drive(turnParams, Number.isFinite(pan) ? toPan(pan) : turnPan)
  },

  // The page settles flat. strength 0…1 (e.g. landing speed / 8 rad/s).
  turnLand(pan, strength) {
    if (!ready()) return
    beds.turn.quiet(turnWhoosh(0, undefined, turnParams))
    if (!gaps.allow('turnLand', ctx.currentTime)) return
    emit(pan, (v) => playTurnLand(v, strength))
  },

  // A pop-up springs upright. size 0…1 (bigger = lower, fuller). Calls
  // that arrive together ripple out ~26–56 ms apart; a burst past
  // ~0.3 s of backlog is dropped.
  pop(pan, size) {
    if (!ready()) return
    const now = ctx.currentTime
    const at = popSlot(now, lastPopAt)
    if (at < 0) return
    lastPopAt = at
    const p = popParams(size)
    emit(pan, (v) => playPop(v, p), at)
  },

  // Lift-the-flap hinging up (true) or falling closed (false).
  flap(open) {
    if (!ready() || !gaps.allow('flap', ctx.currentTime)) return
    emit(0, (v) => playFlap(v, !!open))
  },

  // One detent of a volvelle (call per 15° of rotation). At most one
  // every 20 ms; faster spins just skip detents.
  tick(pan) {
    if (!ready() || !gaps.allow('tick', ctx.currentTime)) return
    emit(finite(pan, 0), playTick)
  },

  // Every frame while a pull-tab moves; speed 0…1. Silent at rest.
  slide(speed) {
    if (!ready()) return
    beds.slide.drive(slideHiss(speed, undefined, slideParams))
  },

  // Every frame while the pencil draws; stroke speed 0…1. Silent at rest.
  scratch(speed) {
    if (!ready()) return
    beds.scratch.drive(pencilScratch(speed, undefined, scratchParams))
  },

  // The hardcover board opening (true) or closing (false). The creak
  // starts now and the board lands `landIn` seconds later (default
  // 0.18) — pass the animation's remaining time to land the thump on
  // the frame the board hits.
  cover(open, landIn) {
    if (!ready() || !gaps.allow('cover', ctx.currentTime)) return
    const T = clamp(finite(landIn, 0.18), 0, 2.5)
    emit(0, (v) => playCover(v, !!open, T))
  },

  // A small, warm three-note music-box figure for a discovery.
  chime() {
    if (!ready() || !gaps.allow('chime', ctx.currentTime)) return
    emit(0, playChime)
  },

  // The record on the Sound spread spinning (true) or stopped (false).
  // Idempotent; remembered while muted or before unlock, so the music
  // starts when sound does.
  record(on) {
    recordOn = !!on
    if (!recordOn) {
      if (session) {
        session.stop()
        session = null
      }
      return
    }
    startRecord()
  },

  // Debug / QA snapshot — not needed by the scene.
  stats() {
    if (ctx) reap(ctx.currentTime)
    return {
      state: ctx ? ctx.state : 'none',
      muted,
      voices: voices.filter((v) => !v.stolen).length,
      beds: beds ? Object.values(beds).filter((b) => b.running).length : 0,
      record: session !== null,
      recordOn,
      recordStep: session ? session.step : 0,
    }
  },
}

// Vite HMR re-evaluates this module; close the old context so edits
// don't stack up live AudioContexts.
if (import.meta.hot) {
  import.meta.hot.dispose(() => dispose())
}
