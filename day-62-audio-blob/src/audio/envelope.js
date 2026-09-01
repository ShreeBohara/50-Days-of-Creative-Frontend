// ============================================================
// Envelope follower — fast attack, slow release.
//
// Raw FFT frames flicker; motion mapped 1:1 to them looks like
// static. A follower that snaps up quickly but decays slowly
// turns the same data into something that moves like music:
// hits land instantly, then bloom away.
//
// Exponential smoothing with a per-direction time constant,
// derived from dt so behavior is frame-rate independent.
// ============================================================

// Fraction of the remaining distance covered after dtSec with
// time constant tcSec. tc <= 0 means "jump immediately".
export function envelopeCoef(tcSec, dtSec) {
  if (tcSec <= 0) return 1
  return 1 - Math.exp(-dtSec / tcSec)
}

// One follower step. Rising uses `attack`, falling uses `release`.
export function follow(prev, target, dtSec, { attack = 0.03, release = 0.25 } = {}) {
  const tc = target > prev ? attack : release
  return prev + (target - prev) * envelopeCoef(tc, dtSec)
}
