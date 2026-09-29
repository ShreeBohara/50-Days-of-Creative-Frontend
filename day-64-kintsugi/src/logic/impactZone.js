// ============================================================
// Impact zones — which side of the bowl hit the tray?
//
// The Blender pipeline pre-fractures the bowl twelve ways: six
// impact zones around the vertical axis × two severities. Zone
// k is centred on azimuth k·60°, so zone 0 is the front (+Z,
// facing the camera) and covers [-30°, 30°).
//
// Azimuth is measured in bowl-local space from +Z towards +X:
//   φ = atan2(x, z)   →   0° = +Z, 90° = +X, 180° = −Z
//
// Variant ids ("Z3_fling") index the seam JSON / shard GLBs,
// and their 0..11 index is what the shelf code stores.
// ============================================================

import { SEVERITY } from './severity.js'

export const ZONE_COUNT = 6
const ZONE_SPAN = 360 / ZONE_COUNT

// Accept [x, y, z], a typed array, or anything with .x / .z
// (a THREE.Vector3), so callers never have to convert.
function readXZ(p) {
  if (p == null) return [NaN, NaN]
  if (typeof p.length === 'number') return [p[0], p[2]]
  return [p.x, p.z]
}

// Azimuth in degrees, normalised to [0, 360).
export function azimuth(p) {
  const [x, z] = readXZ(p)
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0
  const deg = (Math.atan2(x, z) * 180) / Math.PI
  const wrapped = ((deg % 360) + 360) % 360
  // −1e-15 wraps to exactly 360 in float; fold it back to 0.
  return wrapped >= 360 ? 0 : wrapped
}

// Zone index 0..5. Each zone is the half-open interval
// [k·60 − 30, k·60 + 30). φ is snapped to 1e-9° first so a point
// built with sin/cos at exactly 30° lands in zone 1, not 0.
export function zoneFromLocalPoint(p) {
  const phi = Math.round(azimuth(p) * 1e9) / 1e9
  return Math.floor((phi + ZONE_SPAN / 2) / ZONE_SPAN) % ZONE_COUNT
}

const KIND_FOR = {
  [SEVERITY.HAIRLINE]: 'drop', // a hairline reuses the drop cracks
  [SEVERITY.DROP]: 'drop',
  [SEVERITY.FLING]: 'fling',
}

export function variantId(zone, severity) {
  if (!Number.isInteger(zone) || zone < 0 || zone >= ZONE_COUNT) {
    throw new RangeError(`variantId: zone must be an integer 0..5, got ${zone}`)
  }
  if (severity === SEVERITY.SET) {
    throw new Error('variantId: a "set" impact does not break the bowl')
  }
  const kind = KIND_FOR[severity]
  if (!kind) throw new Error(`variantId: unknown severity "${severity}"`)
  return `Z${zone}_${kind}`
}

// Zone-major: Z0_drop, Z0_fling, Z1_drop, … Z5_fling.
// Never reorder — shelf codes store the index.
export const VARIANT_IDS = Object.freeze(
  Array.from({ length: ZONE_COUNT * 2 }, (_, i) =>
    `Z${i >> 1}_${i & 1 ? 'fling' : 'drop'}`,
  ),
)

// Index 0..11, or -1 for an unknown id.
export function variantIndex(id) {
  return VARIANT_IDS.indexOf(id)
}

// Id for an index, or null when out of range.
export function variantFromIndex(i) {
  return Number.isInteger(i) && i >= 0 && i < VARIANT_IDS.length ? VARIANT_IDS[i] : null
}

// "Z4_fling" → { zone: 4, kind: 'fling' }, or null if malformed.
export function parseVariantId(id) {
  const m = /^Z([0-5])_(drop|fling)$/.exec(id)
  return m ? { zone: Number(m[1]), kind: m[2] } : null
}
