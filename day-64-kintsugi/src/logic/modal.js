// ============================================================
// Modal ring — what a tapped tea bowl sounds like.
//
// A struck bowl rings as a handful of inharmonic modes, summed
// as decaying sines. The ratios below are tuned by ear to sound
// like thin stoneware rather than a bell. Where you tap sets
// the pitch — a stylisation, not a simulation: the thin rim
// rings higher and longer than the heavy foot.
//
// A mended bowl rings slightly flat and dull — the lacquer
// seams damp the shell — so it drops ~4 %, loses more than
// half its sustain, and its top partial is 12 dB quieter.
// ============================================================

export const RATIOS = Object.freeze([1, 2.32, 4.25, 6.63, 9.38])

export const F0_FOOT = 620
export const F0_RIM = 940
// Fundamental decay (seconds) at the foot and at the rim.
export const DECAY_FOOT = 0.7
export const DECAY_RIM = 1.6

const MENDED_PITCH = 0.96
const MENDED_DECAY = 0.45
const MENDED_TOP_DB = -12

const lerp = (a, b, t) => a + (b - a) * t
const clamp01 = (v) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

// Five partials { ratio, freq (Hz), gain (linear), decay (s) }.
// height01: 0 = tapped at the foot, 1 = at the rim.
export function ringPartials({ height01 = 0, mended = false } = {}) {
  const h = clamp01(height01)
  const f0 = lerp(F0_FOOT, F0_RIM, h) * (mended ? MENDED_PITCH : 1)
  const baseDecay = lerp(DECAY_FOOT, DECAY_RIM, h) * (mended ? MENDED_DECAY : 1)
  const last = RATIOS.length - 1

  return RATIOS.map((ratio, i) => {
    // Energy falls off roughly as 1/k^0.9 with mode number k.
    let gain = 1 / Math.pow(i + 1, 0.9)
    if (mended && i === last) gain *= Math.pow(10, MENDED_TOP_DB / 20)
    // Higher modes radiate faster: decay ∝ ratio^-0.6, which
    // takes the top partial to about a quarter of the fundamental.
    const decay = baseDecay * Math.pow(ratio, -0.6)
    return { ratio, freq: f0 * ratio, gain, decay }
  })
}
