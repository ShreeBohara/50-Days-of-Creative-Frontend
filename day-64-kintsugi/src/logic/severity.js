// ============================================================
// Severity — how hard did the bowl land?
//
// The physics layer reports the bowl's speed at its first tray
// contact. We bucket that into four outcomes:
//
//   < 1.30 m/s  set       nothing happens, it just clinks down
//   < 1.90 m/s  hairline  one crack, bowl stays whole
//   < 3.00 m/s  drop      breaks into the pre-fractured shards
//   ≥ 3.00 m/s  fling     the violent fracture variant
//
// A throw (released while moving fast) that lands hard enough
// to break is always a fling — throwing a bowl is an act of
// intent, and the fling variant reads as that.
// ============================================================

export const SEVERITY = Object.freeze({
  SET: 'set',
  HAIRLINE: 'hairline',
  DROP: 'drop',
  FLING: 'fling',
})

export const GRAVITY = 9.81

// Impact-speed thresholds (m/s) — lower bound of each bucket.
export const HAIRLINE_SPEED = 1.3
export const DROP_SPEED = 1.9
export const FLING_SPEED = 3.0
// Release speed (m/s) above which a let-go counts as a throw.
export const THROW_SPEED = 2.2

// Tray-edge tick marks, in metres above the tray. Free-fall from
// these lands at ~1.72 (hairline), ~2.43 and ~2.97 m/s (drop).
export const DROP_TICKS = Object.freeze([0.15, 0.3, 0.45])

const isSpeed = (v) => Number.isFinite(v) && v >= 0

// Bucket an impact. Invalid impact speeds (NaN, ±Infinity,
// negative) are treated as a gentle set-down. An invalid
// releaseSpeed is ignored (treated as "not a throw").
export function classifyImpact({ impactSpeed, releaseSpeed = 0 } = {}) {
  if (!isSpeed(impactSpeed)) return SEVERITY.SET
  const thrown = isSpeed(releaseSpeed) && releaseSpeed >= THROW_SPEED

  if (impactSpeed >= FLING_SPEED) return SEVERITY.FLING
  if (impactSpeed >= DROP_SPEED) return thrown ? SEVERITY.FLING : SEVERITY.DROP
  if (impactSpeed >= HAIRLINE_SPEED) return SEVERITY.HAIRLINE
  return SEVERITY.SET
}

// Free-fall speed after dropping h metres: v = √(2gh).
export function speedForHeight(h) {
  if (!Number.isFinite(h) || h <= 0) return 0
  return Math.sqrt(2 * GRAVITY * h)
}

// Inverse: the drop height that produces speed v, h = v² / 2g.
export function heightForSpeed(v) {
  if (!Number.isFinite(v) || v <= 0) return 0
  return (v * v) / (2 * GRAVITY)
}
