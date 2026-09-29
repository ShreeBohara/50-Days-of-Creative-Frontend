// ============================================================
// Audio engine — every sound in Kintsugi is synthesized here.
//
//   voice ─▶ panner (HRTF, pool of 12) ─▶ trim ─┐
//   voice (unplaced: silk, chime, …) ───────────┤
//   loops (brush, burnish) ─────────────────────┤
//                                               ▼
//                                              mix ─┬─ dry 0.82 ─────────────┐
//                                                   └─ room IR ─ wet 0.18 ───┤
//                                                                            ▼
//                                     compressor ─▶ master 0.7 ─▶ destination
//
// One AudioContext, built lazily by unlock() inside a user gesture;
// nothing exists before that. A voice is a one-shot subgraph
// (oscillators and noise grains with their own envelopes) whose
// sources all stop at known clock times, so bookkeeping is a list
// of end times — no onended callbacks. Finished voices are reaped
// (disconnected) whenever a new one starts, or from setListener.
//
// Synth recipes live in ring.js, clatter.js and foley.js; they get
// a Voice to build on and never touch the routing.
// ============================================================

import {
  RateLimiter,
  PANNER_REF_DISTANCE,
  PANNER_ROLLOFF,
  POSITION_LIMIT,
  TAIL_DB,
  bucketKey,
  clampPosition,
  clatterGain,
  distanceGain,
  pickVoice,
  toVec3,
} from './voices.js'
import { fillDust, fillWhite, mulberry32, roomImpulse } from './buffers.js'
import { playRing } from './ring.js'
import { playClatter, playCrack } from './clatter.js'
import {
  Loop,
  brushPatch,
  burnishPatch,
  playChime,
  playGoldSift,
  playLid,
  playReject,
  playSilk,
  playSnap,
  playSweep,
  playTok,
} from './foley.js'

const STORAGE_KEY = 'd64.sound'
const MASTER_GAIN = 0.7
const WET = 0.18
// Placed voices are authored at unity for the panner's reference
// distance (0.35 m); the orbit camera sits ~0.6 m from the tray, which
// the inverse model makes ~5 dB quieter, so their bus gets it back.
const PLACED_TRIM = 1.8
const PANNER_COUNT = 12
const MAX_VOICES = 24
const NOISE_SECONDS = 2
const DUST_DENSITY = 450 // clicks per second in the dust buffer

// A stolen voice fades with this time constant and its sources stop
// 6τ in (−52 dB). A new voice that inherits its panner starts only
// then, so the old tail never jumps to the new position.
const STEAL_TAU = 0.01
const STEAL_STOP = STEAL_TAU * 6

// A context made inside the first gesture may report 'suspended'
// until its resume() settles; sounds from that gesture still go.
const RESUME_GRACE_MS = 400
const SUSPEND_AFTER_MUTE_MS = 300
const LISTENER_EPS = 1e-4

// time constants (τ) for an envelope to fall TAIL_DB
const TAIL = (TAIL_DB / 20) * Math.LN10

const clock = () => (globalThis.performance ? globalThis.performance.now() : Date.now())

// Public methods take an options object; null or junk reads as {}.
const args = (o) => (o !== null && typeof o === 'object' ? o : {})

// ------------------------------------------------------------
// Voice — the handle synth recipes build on
// ------------------------------------------------------------

export class Voice {
  constructor(ctx, start, out, buffers) {
    this.ctx = ctx
    this.start = start // absolute clock time the voice begins
    this.end = start // latest stop time of any of its sources
    this.gain = 0 // rough peak level, for voice stealing
    this.out = out
    this.noise = buffers.noise
    this.dust = buffers.dust
    this.sources = []
    this.stops = [] // each source's scheduled stop, parallel to `sources`
    this.slot = null
    this.pos = null
    this.stolen = false
  }

  // Register a started source and stop it at `stopAt`.
  hold(node, stopAt) {
    node.stop(stopAt)
    this.sources.push(node)
    this.stops.push(stopAt)
    if (stopAt > this.end) this.end = stopAt
  }

  // One sine (or other waveform) partial: linear attack, then an
  // exponential decay with time constant `decay` down to −80 dB,
  // then stop 50 ms later. Optional pitch glide at the start.
  tone({ freq, gain, at = 0, attack = 0.002, decay = 0.1, glideTo = 0, glideTime = 0.03, type = 'sine' }) {
    const { ctx } = this
    if (!(freq > 20 && freq < ctx.sampleRate * 0.45) || !(gain > 1e-5) || !(decay > 0)) return
    const t = this.start + Math.max(0, at)
    const peakAt = t + Math.max(attack, 0.0005)
    const endAt = peakAt + decay * TAIL

    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (glideTo > 0) osc.frequency.exponentialRampToValueAtTime(glideTo, t + glideTime)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(gain, peakAt)
    env.gain.exponentialRampToValueAtTime(gain * 1e-4, endAt)

    osc.connect(env).connect(this.out)
    osc.start(t)
    this.hold(osc, endAt + 0.05)
    this.gain += gain
  }

  // A filtered noise grain with the same attack / exponential-decay
  // envelope. `buffer` defaults to white noise; `rate` > 1 plays it
  // faster (for dust: denser and brighter clicks).
  grain({ gain, at = 0, attack = 0.0008, decay = 0.004, type = 'bandpass', freq = 2000, Q = 1, rate = 1, buffer = this.noise }) {
    const { ctx } = this
    if (!(gain > 1e-5) || !(decay > 0)) return
    const t = this.start + Math.max(0, at)
    const peakAt = t + Math.max(attack, 0.0002)
    const endAt = peakAt + decay * TAIL

    const src = this.source(buffer, at, endAt - t, rate)
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = Math.min(freq, ctx.sampleRate * 0.45)
    filter.Q.value = Q

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(gain, peakAt)
    env.gain.exponentialRampToValueAtTime(gain * 1e-4, endAt)

    src.connect(filter).connect(env).connect(this.out)
    this.gain += gain
  }

  // A started buffer source for `len` seconds from a random offset
  // (so repeated grains never share the same noise), stopped 50 ms
  // after. The caller connects it.
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
// Engine state
// ------------------------------------------------------------

let ctx = null
let muted = readMuted()
let resumeUntil = 0
let suspendTimer = 0
let master = null
let mix = null
let buffers = null
let loopHost = null
let slots = [] // { panner, voice }
let voices = [] // live Voice records, including fading stolen ones
let lastReap = 0
let brush = null
let burnish = null

// Camera pose as [px py pz  fx fy fz  ux uy uz] (Web Audio defaults
// until the scene reports), and what the context last received.
const pose = Float64Array.of(0, 0, 0, 0, 0, -1, 0, 1, 0)
const applied = new Float64Array(9).fill(NaN)
let poseDirty = false
let poseParams = null // the listener's nine AudioParams, or null on the legacy API

// 40 contacts a second overall, and one per 35 ms per 5 cm cell:
// a pile of shards settling stays a clatter instead of a buzz.
const clatterGate = new RateLimiter({ max: 40, window: 1, keyInterval: 0.035 })
// goldSift is called per frame; one sparkle grain every ~70 ms
// (each 160 ms long) overlaps into a continuous shimmer.
const goldGate = new RateLimiter({ max: 16, window: 1, keyInterval: 0.07 })

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

function makeBuffer(c, channels) {
  const buf = c.createBuffer(channels.length, channels[0].length, c.sampleRate)
  channels.forEach((data, i) => buf.getChannelData(i).set(data))
  return buf
}

function build(c) {
  const sr = c.sampleRate
  const rng = mulberry32(0x6b696e)
  const noise = fillWhite(new Float32Array(Math.round(sr * NOISE_SECONDS)), rng)
  const dust = new Float32Array(Math.round(sr * NOISE_SECONDS))
  fillDust(dust, sr, DUST_DENSITY, rng)
  buffers = { noise: makeBuffer(c, [noise]), dust: makeBuffer(c, [dust]) }

  master = c.createGain()
  master.gain.value = muted ? 0 : MASTER_GAIN

  // limiter-ish: only a pile-up (the break plus a dozen shards) should
  // reach it. Browsers add their own makeup gain (~+2 dB at these
  // settings), so a lower threshold would squash single events too.
  const limiter = c.createDynamicsCompressor()
  limiter.threshold.value = -4
  limiter.knee.value = 2
  limiter.ratio.value = 20
  limiter.attack.value = 0.001
  limiter.release.value = 0.12
  limiter.connect(master).connect(c.destination)

  mix = c.createGain()
  const dry = c.createGain()
  dry.gain.value = 1 - WET
  const wet = c.createGain()
  wet.gain.value = WET
  const room = c.createConvolver()
  room.buffer = makeBuffer(c, roomImpulse({ sampleRate: sr, seconds: 1.2 }))
  mix.connect(dry).connect(limiter)
  mix.connect(room).connect(wet).connect(limiter)

  const placed = c.createGain()
  placed.gain.value = PLACED_TRIM
  placed.connect(mix)
  slots = Array.from({ length: PANNER_COUNT }, () => {
    const panner = c.createPanner()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'inverse'
    panner.refDistance = PANNER_REF_DISTANCE
    panner.rolloffFactor = PANNER_ROLLOFF
    panner.maxDistance = POSITION_LIMIT * 2
    panner.connect(placed)
    return { panner, voice: null }
  })

  loopHost = { ctx: c, dest: mix, noise: buffers.noise, dust: buffers.dust }

  const L = c.listener
  poseParams = L.positionX ? [L.positionX, L.positionY, L.positionZ, L.forwardX, L.forwardY, L.forwardZ, L.upX, L.upY, L.upZ] : null
  applied.fill(NaN)

  globalThis.document?.addEventListener?.('visibilitychange', onVisibility)
}

// A hidden tab stops sending pointer moves; don't leave a loop hanging.
function onVisibility() {
  if (globalThis.document.hidden) stopLoops()
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

// Once the mute fade is done, stop the audio thread altogether.
function suspendSoon() {
  clearTimeout(suspendTimer)
  suspendTimer = setTimeout(() => {
    suspendTimer = 0
    if (muted && ctx.state === 'running') settle(ctx.suspend())
  }, SUSPEND_AFTER_MUTE_MS)
}

// The context is created here even when muted — this is the call
// that runs inside a user gesture, so a later unmute (which may not
// arrive with a gesture) only has to resume it. If building the
// graph fails the engine stays silent for the session rather than
// throwing out of every pointerdown.
let broken = false

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
  if (poseDirty) applyListener()
  if (muted) {
    if (ctx.state === 'running' && !suspendTimer) suspendSoon()
    return true
  }
  clearTimeout(suspendTimer)
  suspendTimer = 0
  resume()
  return true
}

function setMuted(value) {
  muted = !!value
  writeMuted()
  // no context yet: the next unlock() builds one at the right level
  if (!ctx || ctx.state === 'closed') return
  master.gain.setTargetAtTime(muted ? 0 : MASTER_GAIN, ctx.currentTime, 0.04)
  if (muted) {
    stopLoops()
    suspendSoon()
  } else {
    unlock()
  }
}

// ------------------------------------------------------------
// Listener
// ------------------------------------------------------------

// Unit vector, or null for anything degenerate. Normalising keeps
// the params in float32 range (AudioParam setters throw on ±Inf).
function direction(v) {
  const d = toVec3(v)
  const len = d ? Math.hypot(d[0], d[1], d[2]) : 0
  if (!(len > 1e-6 && len < Infinity)) return null
  return [d[0] / len, d[1] / len, d[2] / len]
}

function setListener(camera) {
  const { position, forward, up } = args(camera)
  if (position != null) pose.set(clampPosition(position), 0)
  const f = direction(forward)
  if (f) pose.set(f, 3)
  const u = direction(up)
  if (u) pose.set(u, 6)
  poseDirty = true
  if (!ctx || ctx.state === 'closed') return
  applyListener()
  const now = ctx.currentTime
  if (now - lastReap > 0.5) reap(now)
}

// Called per frame, so it only writes the params that moved.
function applyListener() {
  poseDirty = false
  if (poseParams) {
    const t = ctx.currentTime
    for (let i = 0; i < 9; i += 1) {
      if (Math.abs(pose[i] - applied[i]) < LISTENER_EPS) continue
      poseParams[i].setValueAtTime(pose[i], t)
      applied[i] = pose[i]
    }
    return
  }
  if (pose.every((x, i) => Math.abs(x - applied[i]) < LISTENER_EPS)) return
  // pre-2021 Safari / Firefox: the old setter API. Neither API at all
  // leaves the listener at its default rather than throwing per frame.
  const L = ctx.listener
  if (typeof L.setPosition !== 'function') return
  L.setPosition(pose[0], pose[1], pose[2])
  L.setOrientation(pose[3], pose[4], pose[5], pose[6], pose[7], pose[8])
  applied.set(pose)
}

function place(panner, [x, y, z], t) {
  if (panner.positionX) {
    panner.positionX.setValueAtTime(x, t)
    panner.positionY.setValueAtTime(y, t)
    panner.positionZ.setValueAtTime(z, t)
  } else if (typeof panner.setPosition === 'function') {
    panner.setPosition(x, y, z)
  }
}

// ------------------------------------------------------------
// Voice lifecycle
// ------------------------------------------------------------

// Drop finished voices. Disconnecting a voice's output detaches its
// whole (already stopped) subgraph from the panner or mix bus.
function reap(now) {
  lastReap = now
  let keep = 0
  for (const v of voices) {
    if (v.end > now) {
      voices[keep++] = v
      continue
    }
    v.out.disconnect()
    v.sources.length = 0
    v.stops.length = 0
    if (v.slot && v.slot.voice === v) v.slot.voice = null
  }
  voices.length = keep
}

function steal(v, now) {
  v.stolen = true
  v.out.gain.setTargetAtTime(0, now, STEAL_TAU)
  const stopAt = now + STEAL_STOP
  v.sources.forEach((s, i) => {
    // a later stop() replaces the earlier one, so only ever shorten:
    // a grain due to end sooner would otherwise run on to stopAt
    if (v.stops[i] <= stopAt) return
    try {
      s.stop(stopAt)
      v.stops[i] = stopAt
    } catch {
      // older webkit throws on a second stop(); the source ends on its own schedule
    }
  })
  v.end = Math.min(v.end, stopAt)
  v.gain = 0
}

function openVoice(position) {
  if (!ready()) return null
  const now = ctx.currentTime
  reap(now)

  // Placed voices need a panner first: if the one they get is still
  // sounding, stealing its voice already makes room under the cap,
  // and a second steal from the global pool would be one too many.
  const slot = position == null ? null : slots[pickVoice(slots.map((s) => s.voice), now)]
  const prev = slot ? slot.voice : null
  const inherits = prev !== null && prev.end > now
  if (inherits && !prev.stolen) steal(prev, now)

  const live = voices.filter((v) => !v.stolen)
  if (live.length >= MAX_VOICES) steal(live[pickVoice(live, now)], now)

  const out = ctx.createGain()
  if (!slot) {
    out.connect(mix)
    return new Voice(ctx, now, out, buffers)
  }

  // wait for the inherited voice's sources to stop (its `end`, which
  // steal() pulled in to at most STEAL_STOP from now)
  const start = inherits ? Math.max(now, prev.end) : now
  const pos = clampPosition(position)
  place(slot.panner, pos, start)
  out.connect(slot.panner)
  const v = new Voice(ctx, start, out, buffers)
  v.slot = slot
  v.pos = pos
  return v
}

function commit(v) {
  if (!v.sources.length) {
    v.out.disconnect()
    return
  }
  if (v.pos) v.gain *= distanceGain(v.pos, pose)
  voices.push(v)
  if (v.slot) v.slot.voice = v
}

// A sound effect must never take an interaction down with it, so a
// recipe that throws is logged once and otherwise ignored.
let warned = false
function emit(position, play) {
  const v = openVoice(position)
  if (!v) return
  try {
    play(v)
  } catch (err) {
    if (!warned) console.warn('[audio]', err)
    warned = true
  } finally {
    commit(v)
  }
}

// ------------------------------------------------------------
// Loops
// ------------------------------------------------------------

// Mute and a hidden tab fade the loops but leave them armed, so a
// stroke still in progress picks its sound back up (see Loop).
function stopLoops() {
  brush?.fade()
  burnish?.fade()
}

function brushLoop() {
  if (!brush) brush = new Loop(loopHost, brushPatch)
  return brush
}

function burnishLoop() {
  if (!burnish) burnish = new Loop(loopHost, burnishPatch)
  return burnish
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

export const audio = {
  unlock,
  setMuted,
  isMuted: () => muted,
  setListener,

  ring(opts) {
    const o = args(opts)
    emit(o.position, (v) => playRing(v, o))
  },

  clatter(opts) {
    if (!ready()) return
    const { impulse, size, position } = args(opts)
    const gain = clatterGain(impulse)
    if (gain <= 0) return
    if (!clatterGate.tryAcquire(ctx.currentTime, bucketKey(position))) return
    emit(position, (v) => playClatter(v, { gain, size }))
  },

  crack(opts) {
    const o = args(opts)
    emit(o.position, (v) => playCrack(v, o))
  },
  tok(opts) {
    const o = args(opts)
    emit(o.position, (v) => playTok(v, o))
  },
  snap(opts) {
    emit(args(opts).position, playSnap)
  },
  reject(opts) {
    emit(args(opts).position, playReject)
  },
  lid(opts) {
    emit(args(opts).position, playLid)
  },

  silk() {
    emit(null, playSilk)
  },
  sweep() {
    emit(null, playSweep)
  },
  chime() {
    emit(null, playChime)
  },
  goldSift(amount01) {
    if (!ready() || !(amount01 > 0.01)) return
    if (!goldGate.tryAcquire(ctx.currentTime, 'gold')) return
    emit(null, (v) => playGoldSift(v, amount01))
  },

  // start() re-arms even while muted, so an unmute mid-stroke is heard;
  // an update after brushStop() stays silent until the next start.
  brushStart() {
    if (ctx) brushLoop().start(ready())
  },
  brushUpdate(speed01) {
    if (ready()) brushLoop().update(speed01)
  },
  brushStop() {
    brush?.stop()
  },
  burnishStart() {
    if (ctx) burnishLoop().start(ready())
  },
  burnishUpdate(speed01) {
    if (ready()) burnishLoop().update(speed01)
  },
  burnishStop() {
    burnish?.stop()
  },

  // Debug / QA snapshot — not needed by the scene.
  stats() {
    if (ctx) reap(ctx.currentTime)
    return {
      state: ctx ? ctx.state : 'none',
      muted,
      voices: voices.filter((v) => !v.stolen).length,
      panners: slots.filter((s) => s.voice && !s.voice.stolen).length,
      loops: Number(!!brush?.running) + Number(!!burnish?.running),
    }
  },
}

// Vite HMR re-evaluates this module; close the old context so edits
// don't stack up live AudioContexts.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    stopLoops()
    globalThis.document?.removeEventListener?.('visibilitychange', onVisibility)
    if (ctx) settle(ctx.close())
  })
}
