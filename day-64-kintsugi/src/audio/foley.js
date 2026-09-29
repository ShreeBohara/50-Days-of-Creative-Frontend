// ============================================================
// Foley — every handling sound that isn't the bowl ringing or
// breaking: wood knocks, the porcelain click of a shard locking in,
// the silk cloth, the lacquer box lid, gold dust, the completion
// chime, and the two continuous loops (lacquer brush, burnishing).
//
// One-shots are recipes on a Voice (see engine.js). The loops are
// Loop objects holding a persistent patch whose gain and filter
// glide after stroke speed; an idle watchdog fades them out if the
// scene stops sending updates (a lost pointerup, a hidden tab).
// ============================================================

import { clamp, clamp01, mapSpeedToFilter, swooshCurve } from './voices.js'

const rand = (lo, hi) => lo + Math.random() * (hi - lo)

function biquad(ctx, type, freq, Q = 0.7) {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = Q
  return f
}

function gainNode(ctx, value) {
  const g = ctx.createGain()
  g.gain.value = value
  return g
}

// Slow left→right drift for the unplaced swooshes; falls back to the
// plain output where StereoPannerNode is missing (old Safari).
function drift(ctx, out, t, dur, from, to) {
  if (!ctx.createStereoPanner) return out
  const p = ctx.createStereoPanner()
  p.pan.setValueAtTime(from, t)
  p.pan.linearRampToValueAtTime(to, t + dur)
  p.connect(out)
  return p
}

// ------------------------------------------------------------
// Placed one-shots
// ------------------------------------------------------------

// Bowl or shard set down on the wooden tray: a damped low mode
// with a slight downward pitch settle, the next (inharmonic) plate
// mode, a contact click and a low-passed thud for the tray's give.
export function playTok(v, { strength = 1 } = {}) {
  const s = Number.isFinite(strength) ? clamp(strength, 0, 1.5) : 1
  if (s <= 0) return
  const lvl = 0.5 * s
  const f0 = rand(180, 260)
  v.tone({ freq: f0 * 1.06, glideTo: f0, glideTime: 0.03, gain: lvl, attack: 0.0015, decay: 0.028 })
  v.tone({ freq: f0 * 2.37, gain: lvl * 0.3, attack: 0.001, decay: 0.012 })
  v.grain({ gain: lvl * (0.25 + 0.2 * Math.min(s, 1)), attack: 0.0004, decay: 0.0018, type: 'bandpass', freq: 1800 + 900 * Math.min(s, 1), Q: 0.8 })
  v.grain({ gain: lvl * 2, attack: 0.002, decay: 0.012, type: 'lowpass', freq: 420, Q: 0.7 })
}

// Shard locks into place: a crisp high-passed click, a very short
// porcelain body tone (~40 ms all in), then a tiny high ping.
export function playSnap(v) {
  v.grain({ gain: 0.7, attack: 0.0003, decay: 0.0016, type: 'highpass', freq: 3000, Q: 0.7 })
  v.tone({ freq: rand(2000, 2400), gain: 0.5, attack: 0.0005, decay: 0.0045 })
  v.tone({ at: 0.004, freq: rand(5400, 6100), gain: 0.1, attack: 0.001, decay: 0.05 })
}

// Wrong neighbour: a soft, dull "tk" — everything low-passed.
export function playReject(v) {
  v.grain({ gain: 0.45, attack: 0.001, decay: 0.004, type: 'lowpass', freq: 900, Q: 0.6 })
  v.tone({ freq: rand(360, 420), gain: 0.16, attack: 0.001, decay: 0.012 })
}

// Lacquered lid lifted off its box. What makes it hollow is the
// cavity: a narrow resonance (Q 9) under the knock rather than a
// dry click. Narrow-band noise carries little energy, hence the
// large gain on that grain.
export function playLid(v) {
  v.grain({ gain: 0.1, attack: 0.0005, decay: 0.0022, type: 'bandpass', freq: 1900, Q: 1.1 })
  v.grain({ gain: 2.4, attack: 0.001, decay: 0.03, type: 'bandpass', freq: 480, Q: 9 })
  v.tone({ freq: 305, glideTo: 290, glideTime: 0.05, gain: 0.12, attack: 0.002, decay: 0.045 })
  v.tone({ freq: 760, gain: 0.04, attack: 0.001, decay: 0.02 })
}

// ------------------------------------------------------------
// Unplaced one-shots
// ------------------------------------------------------------

// Silk cloth pulled off the bowl: band-passed noise whose band opens
// as the cloth accelerates and closes as it trails away, a fibre
// hiss on top, sparse ticks of threads catching underneath.
export function playSilk(v) {
  const { ctx } = v
  const t = v.start
  const dur = 0.9
  const level = 0.3
  const body = v.source(v.noise, 0, dur)
  const threads = v.source(v.dust, 0, dur, 0.8)

  const band = biquad(ctx, 'bandpass', 450, 0.8)
  band.frequency.setValueAtTime(450, t)
  band.frequency.exponentialRampToValueAtTime(2600, t + 0.34)
  band.frequency.exponentialRampToValueAtTime(700, t + dur)
  const sheen = biquad(ctx, 'highpass', 4200)

  const env = gainNode(ctx, 0)
  env.gain.setValueCurveAtTime(swooshCurve(48, 0.36, 1.4, level), t, dur)

  body.connect(band).connect(env)
  threads.connect(gainNode(ctx, 0.6)).connect(band)
  body.connect(sheen).connect(gainNode(ctx, 0.18)).connect(env)
  env.connect(drift(ctx, v.out, t, dur, -0.45, 0.45))
  v.gain += level
}

// Quick brush sweep across the wood: a shorter swoosh, bristle
// ticks, and a low-passed rub from the brush heel on the grain.
export function playSweep(v) {
  const { ctx } = v
  const t = v.start
  const dur = 0.42
  const level = 0.2
  const body = v.source(v.noise, 0, dur)
  const bristles = v.source(v.dust, 0, dur, 1.3)

  const band = biquad(ctx, 'bandpass', 1100, 0.7)
  band.frequency.setValueAtTime(1100, t)
  band.frequency.exponentialRampToValueAtTime(3400, t + 0.14)
  band.frequency.exponentialRampToValueAtTime(1500, t + dur)
  const rub = biquad(ctx, 'lowpass', 480)

  const env = gainNode(ctx, 0)
  env.gain.setValueCurveAtTime(swooshCurve(40, 0.3, 1.2, level), t, dur)

  body.connect(band).connect(env)
  bristles.connect(gainNode(ctx, 0.5)).connect(band)
  body.connect(rub).connect(gainNode(ctx, 1.2)).connect(env)
  env.connect(drift(ctx, v.out, t, dur, -0.3, 0.35))
  v.gain += level
}

// Gold dust falling: sparse clicks, high-passed into a soft sparkle.
// The engine calls this at most every ~70 ms; each grain lasts
// 160 ms with a flat-topped window, so they overlap seamlessly.
export function playGoldSift(v, amount01) {
  const a = clamp01(amount01)
  if (a <= 0) return
  const { ctx } = v
  const dur = 0.16
  const level = 0.05 + 0.15 * a
  // slower playback = sparser grains; a light sprinkle glints, a heavy one hisses
  const src = v.source(v.dust, 0, dur, 0.6 + 0.4 * a)
  const hp = biquad(ctx, 'highpass', 4800)
  const env = gainNode(ctx, 0)
  env.gain.setValueCurveAtTime(swooshCurve(16, 0.5, 0.5, level), v.start, dur)
  src.connect(hp).connect(env).connect(v.out)
  v.gain += level
}

// Completion ("Keep."): two soft bowl strikes a breath apart, an
// open fifth. Bowl-like partials 1 : 2.76 : 5.18, a padded 12 ms
// attack, and the fundamental doubled 1.3 Hz sharp — a real bowl is
// never perfectly round, so each mode is a close pair that beats.
const CHIME_NOTES = [
  [523.25, 0], // C5
  [783.99, 0.11], // G5
]
const CHIME_MODES = [
  // ratio, gain, τ (s)
  [1, 1, 0.45],
  [2.76, 0.3, 0.18],
  [5.18, 0.1, 0.08],
]

export function playChime(v) {
  for (const [f, at] of CHIME_NOTES) {
    for (const [ratio, gain, decay] of CHIME_MODES) {
      v.tone({ at, freq: f * ratio, gain: 0.07 * gain, attack: 0.012, decay })
    }
    v.tone({ at, freq: f + 1.3, gain: 0.032, attack: 0.012, decay: 0.45 })
  }
}

// ------------------------------------------------------------
// Continuous loops
// ------------------------------------------------------------

export const LOOP_IDLE_MS = 400

const now = () => (globalThis.performance ? globalThis.performance.now() : Date.now())

// Lifecycle around a patch factory `patch(host)` that returns
// { set(speed01, t), release(t) }. update() restarts a stopped loop,
// so a stroke that paused long enough to trip the watchdog resumes
// as soon as it moves again.
export class Loop {
  constructor(host, patch) {
    this.host = host
    this.patch = patch
    this.live = null
    this.last = 0
    this.timer = 0
    this.check = this.check.bind(this)
  }

  get running() {
    return this.live !== null
  }

  start() {
    if (!this.live) this.live = this.patch(this.host)
    this.touch()
  }

  update(speed01) {
    if (!this.live) this.live = this.patch(this.host)
    this.live.set(clamp01(speed01), this.host.ctx.currentTime)
    this.touch()
  }

  stop() {
    clearTimeout(this.timer)
    this.timer = 0
    if (!this.live) return
    this.live.release(this.host.ctx.currentTime)
    this.live = null
  }

  // One pending timer at most: when it fires it re-arms for whatever
  // is left of the idle window, rather than a clear/set per update.
  touch() {
    this.last = now()
    if (!this.timer) this.timer = setTimeout(this.check, LOOP_IDLE_MS)
  }

  check() {
    this.timer = 0
    const idle = now() - this.last
    if (idle >= LOOP_IDLE_MS - 1) this.stop()
    else this.timer = setTimeout(this.check, LOOP_IDLE_MS - idle)
  }
}

function loopSource(ctx, buffer, t) {
  const src = ctx.createBufferSource()
  src.buffer = buffer
  src.loop = true
  src.start(t, Math.random() * buffer.duration)
  return src
}

// Stop the sources after the fade, then detach the patch.
function retire(t, sources, outs) {
  for (const s of sources) s.stop(t + 0.5)
  setTimeout(() => {
    for (const o of outs) o.disconnect()
  }, 700)
}

export const BRUSH = { minHz: 900, maxHz: 5200, maxGain: 0.18, curve: 0.6 }

// Lacquer brush: soft bristle noise. White noise for the hiss plus
// the dust clicks for bristle tips ticking over the glaze, through
// a fixed high-pass and a low-pass that opens with stroke speed.
export function brushPatch({ ctx, dest, noise, dust }) {
  const t = ctx.currentTime
  const hiss = loopSource(ctx, noise, t)
  const tips = loopSource(ctx, dust, t)
  const hp = biquad(ctx, 'highpass', 650, 0.5)
  const lp = biquad(ctx, 'lowpass', BRUSH.minHz)
  const out = gainNode(ctx, 0)
  hiss.connect(hp)
  tips.connect(gainNode(ctx, 0.5)).connect(hp)
  hp.connect(lp).connect(out).connect(dest)
  return {
    set(speed, at) {
      const { freq, gain } = mapSpeedToFilter(speed, BRUSH)
      lp.frequency.setTargetAtTime(freq, at, 0.06)
      out.gain.setTargetAtTime(gain, at, 0.05)
    },
    release(at) {
      out.gain.setTargetAtTime(0, at, 0.05)
      retire(at, [hiss, tips], [out])
    },
  }
}

export const BURNISH_HISS = { minHz: 900, maxHz: 3400, maxGain: 0.35, curve: 0.7 }
// curve > 1: the squeak stays back until the stroke is brisk
export const BURNISH_TONE = { minHz: 480, maxHz: 1250, maxGain: 0.04, curve: 1.4 }

// Burnishing: a narrow band of noise plus a faint resonant sine,
// both rising with speed. Polishing squeaks because the tool grabs
// and releases the surface (stick-slip), so one LFO wobbles the
// sine's pitch and level, faster as the stroke speeds up.
export function burnishPatch({ ctx, dest, noise }) {
  const t = ctx.currentTime
  const hiss = loopSource(ctx, noise, t)
  const band = biquad(ctx, 'bandpass', BURNISH_HISS.minHz, 2.8)
  const hissOut = gainNode(ctx, 0)
  hiss.connect(band).connect(hissOut).connect(dest)

  const tone = ctx.createOscillator()
  tone.frequency.value = BURNISH_TONE.minHz
  const toneLevel = gainNode(ctx, 0)
  const flutter = gainNode(ctx, 1) // 1 ± 0.35 from the LFO
  tone.connect(toneLevel).connect(flutter).connect(dest)

  const lfo = ctx.createOscillator()
  lfo.frequency.value = 8
  lfo.connect(gainNode(ctx, 6)).connect(tone.frequency) // ± 6 Hz
  lfo.connect(gainNode(ctx, 0.35)).connect(flutter.gain)
  tone.start(t)
  lfo.start(t)

  return {
    set(speed, at) {
      const n = mapSpeedToFilter(speed, BURNISH_HISS)
      const s = mapSpeedToFilter(speed, BURNISH_TONE)
      band.frequency.setTargetAtTime(n.freq, at, 0.08)
      hissOut.gain.setTargetAtTime(n.gain, at, 0.06)
      tone.frequency.setTargetAtTime(s.freq, at, 0.09)
      toneLevel.gain.setTargetAtTime(s.gain, at, 0.08)
      lfo.frequency.setTargetAtTime(8 + 10 * speed, at, 0.1)
    },
    release(at) {
      hissOut.gain.setTargetAtTime(0, at, 0.05)
      toneLevel.gain.setTargetAtTime(0, at, 0.05)
      retire(at, [hiss, tone, lfo], [hissOut, flutter])
    },
  }
}
