// ============================================================
// Breakage — the crack of the bowl giving way and the clatter of
// its shards landing on the tray.
//
// A clatter is one contact: a short band-passed noise grain for
// the scrape of the edge plus two pings from the sliver itself.
// A crack is a dry broadband transient, then a crackle "tear" made
// from the sparse-click dust buffer, with a few flakes pinging off.
// ============================================================

import { clamp01, clatterPitch, severityAmount } from './voices.js'

const CLATTER_LEVEL = 1.1

// A free thin sliver rings roughly like a free-free beam, whose
// first two modes sit at 1 : 2.76.
const PING_RATIO = 2.76

const jitter = (amount) => 1 + (Math.random() * 2 - 1) * amount

// `gain` is already log-mapped from the contact impulse (clatterGain).
export function playClatter(v, { gain = 0.3, size = 0.04 } = {}) {
  const g = CLATTER_LEVEL * gain
  const pitch = clatterPitch(size)
  const s = Number.isFinite(size) && size > 0 ? Math.min(size, 0.3) : 0.04
  // bigger pieces hold their ring a little longer
  const ring = 0.012 + 0.35 * s

  v.grain({ gain: g * 0.55, attack: 0.0004, decay: 0.0015 + 0.02 * s, type: 'bandpass', freq: pitch * 1.3 * jitter(0.1), Q: 1.1 })
  v.tone({ freq: pitch * jitter(0.04), gain: g * 0.32, attack: 0.0008, decay: ring })
  v.tone({ freq: pitch * PING_RATIO * jitter(0.04), gain: g * 0.18, attack: 0.0006, decay: ring * 0.55 })
}

// severity: 0..1, or a bucket name from logic/severity.js.
export function playCrack(v, { severity } = {}) {
  const s = severityAmount(severity)
  const lvl = 0.35 + 0.55 * s
  const { ctx } = v

  // 1 — the fracture: a few ms of broadband noise, high-passed so it
  //     cracks rather than thumps; a fling is louder and brighter.
  //     Kept well under the tear: a hotter spike only makes the
  //     master limiter duck the whole break.
  v.grain({ gain: lvl * 0.55, attack: 0.0003, decay: 0.0012 + 0.0008 * s, type: 'highpass', freq: 1300 + 1700 * s, Q: 0.7 })
  // the glaze snapping carries one short, hard mid resonance
  v.tone({ freq: (1150 + 500 * s) * jitter(0.06), gain: lvl * 0.35, attack: 0.0004, decay: 0.012 })

  // 2 — the tear: dust (sparse clicks) played faster with severity,
  //     so the crackle gets denser and brighter, over a little torn
  //     hiss, through a band that slides down as the crack runs out
  //     of energy
  const at = 0.004
  const len = 0.22 + 0.13 * s
  const t = v.start + at
  const crackle = v.source(v.dust, at, len, 1.4 + 1.4 * s)
  const hiss = v.source(v.noise, at, len)
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  band.Q.value = 0.7
  band.frequency.setValueAtTime(2600 + 2400 * s, t)
  band.frequency.exponentialRampToValueAtTime(1200, t + len)
  const env = ctx.createGain()
  const peak = lvl * 3
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(peak, t + 0.006)
  env.gain.exponentialRampToValueAtTime(peak * 0.3, t + len * 0.45)
  env.gain.exponentialRampToValueAtTime(peak * 1e-4, t + len)
  const hissLevel = ctx.createGain()
  hissLevel.gain.value = 0.22
  crackle.connect(band)
  hiss.connect(hissLevel).connect(band)
  band.connect(env).connect(v.out)
  v.gain += peak

  // 3 — flakes spalling off the edges
  const flakes = 2 + Math.round(3 * clamp01(s))
  for (let i = 0; i < flakes; i += 1) {
    v.tone({
      at: 0.01 + Math.random() * 0.14,
      freq: 3200 + Math.random() * 4200,
      gain: lvl * 0.06,
      attack: 0.0005,
      decay: 0.015 + Math.random() * 0.02,
    })
  }
}
