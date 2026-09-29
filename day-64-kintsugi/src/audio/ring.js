// ============================================================
// Tea-bowl ring — modal synthesis.
//
// A struck bowl is a handful of exponentially decaying sines. The
// partial table (frequency, relative gain, decay) comes from
// logic/modal.js, which moves it with strike height and damps it
// once the bowl is mended; this file turns that table into
// oscillators on a Voice, plus the few milliseconds of noise that
// the fingertip itself makes on the glaze.
// ============================================================

import { ringPartials } from '../logic/modal.js'
import { clamp, clamp01 } from './voices.js'

const RING_LEVEL = 0.5

// modal.js gives each partial's decay as the time to fall 60 dB;
// the Voice envelopes take the exponential time constant τ.
const T60_TO_TAU = 1 / Math.log(1000)

export function playRing(v, { height01 = 0.5, mended = false, strength = 1 } = {}) {
  const s = Number.isFinite(strength) ? clamp(strength, 0, 1.5) : 1
  if (s <= 0) return
  const partials = ringPartials({ height01: clamp01(height01), mended: !!mended })

  // Normalise loud tables down (never quiet ones up), so the overall
  // level stays put whatever the table's gain convention.
  const sum = partials.reduce((acc, p) => acc + (Number.isFinite(p.gain) ? Math.max(0, p.gain) : 0), 0)
  const norm = RING_LEVEL * s / Math.max(1, sum)

  // A soft tap is a long contact, which can't excite the upper modes
  // as well: shade partial k by bright^k below full strength.
  const bright = 0.55 + 0.45 * Math.min(s, 1)

  partials.forEach((p, k) => {
    if (!Number.isFinite(p.freq) || !Number.isFinite(p.gain) || !(p.decay > 0)) return
    v.tone({
      freq: p.freq,
      gain: p.gain * norm * bright ** k,
      // upper modes speak a touch faster than the fundamental
      attack: 0.0025 - 0.0003 * k,
      decay: p.decay * T60_TO_TAU,
    })
  })

  // the tap itself: a short bright tick, hotter for harder strikes
  v.grain({ gain: 0.16 * s, attack: 0.0004, decay: 0.0018, type: 'bandpass', freq: 3600 + 1800 * Math.min(s, 1), Q: 0.9 })
}
