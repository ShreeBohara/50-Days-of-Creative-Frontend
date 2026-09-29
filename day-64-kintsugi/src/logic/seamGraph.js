// ============================================================
// Seam graph — the cracks, as data.
//
// Each seam is a polyline on the glaze surface between two
// shards (a, b). The Blender pipeline writes them as nested
// JSON arrays; prepareSeams packs them into flat typed arrays
// so the renderer can upload them straight into buffers and
// the lacquer brush can walk them every pointer move.
//
// Everything here is in metres along the seam ("arclength"),
// except the screen-space helpers, which take the seam's
// projected 2D points in pixels.
// ============================================================

// Behind-the-fill slack for the lacquer brush: a pointer a few
// millimetres behind the wet edge still counts, so a stroke
// that starts on the lacquer and pushes forward isn't ignored.
export const LACQUER_BACK_SLACK = 0.004

function fail(msg) {
  throw new Error(`prepareSeams: ${msg}`)
}

function isVec3(v) {
  return (
    v != null &&
    v.length === 3 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    Number.isFinite(v[2])
  )
}

function packVec3(list, n, label, seamId) {
  if (!Array.isArray(list) || list.length !== n) {
    fail(`seam ${seamId} has ${n} points but ${list?.length ?? 'no'} ${label}`)
  }
  const out = new Float32Array(n * 3)
  for (let i = 0; i < n; i += 1) {
    const v = list[i]
    if (!isVec3(v)) fail(`seam ${seamId} ${label}[${i}] is not a finite [x, y, z]`)
    out[i * 3] = v[0]
    out[i * 3 + 1] = v[1]
    out[i * 3 + 2] = v[2]
  }
  return out
}

function packScalars(list, n, label, seamId) {
  if (!Array.isArray(list) || list.length !== n) {
    fail(`seam ${seamId} has ${n} points but ${list?.length ?? 'no'} ${label} values`)
  }
  const out = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    if (!Number.isFinite(list[i])) fail(`seam ${seamId} ${label}[${i}] is not finite`)
    out[i] = list[i]
  }
  return out
}

// Validate and pack the seam JSON. Accepts the whole file or
// just its `seams` array. `length` is taken from the arclength
// table (rebased to start at 0) so fills, pointAt and the
// brush all agree on where the seam ends. A missing impactDist
// falls back to arclength (the crack races from point 0).
export function prepareSeams(json) {
  const list = Array.isArray(json) ? json : json?.seams
  if (!Array.isArray(list)) fail('expected an object with a "seams" array')

  const seen = new Set()
  return list.map((raw, k) => {
    if (raw == null || typeof raw !== 'object') fail(`seams[${k}] is not an object`)
    const { id, a, b } = raw
    if (!Number.isInteger(id)) fail(`seams[${k}] has no integer id`)
    if (seen.has(id)) fail(`duplicate seam id ${id}`)
    seen.add(id)
    if (!Number.isInteger(a) || !Number.isInteger(b)) fail(`seam ${id} needs integer shard ids a, b`)
    if (a === b) fail(`seam ${id} joins shard ${a} to itself`)

    const n = Array.isArray(raw.points) ? raw.points.length : 0
    if (n < 2) fail(`seam ${id} needs at least 2 points, got ${n}`)

    const pos = packVec3(raw.points, n, 'points', id)
    const nrm = packVec3(raw.normals, n, 'normals', id)
    const arclen = packScalars(raw.arclen, n, 'arclen', id)
    for (let i = 1; i < n; i += 1) {
      if (arclen[i] < arclen[i - 1]) fail(`seam ${id} arclen decreases at index ${i}`)
    }
    const base = arclen[0]
    if (base !== 0) for (let i = 0; i < n; i += 1) arclen[i] -= base

    const impactDist =
      raw.impactDist == null
        ? Float32Array.from(arclen)
        : packScalars(raw.impactDist, n, 'impactDist', id)

    return {
      id,
      a: Math.min(a, b),
      b: Math.max(a, b),
      n,
      pos,
      nrm,
      arclen,
      length: arclen[n - 1],
      impactDist,
    }
  })
}

// Segment index i with arclen[i] <= s <= arclen[i+1] (binary search).
function segmentAt(arclen, n, s) {
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (arclen[mid] <= s) lo = mid
    else hi = mid
  }
  return lo
}

// Position + normal at arclength s (metres), clamped to the seam.
// Pass `out` ({ pos, nrm } arrays) to avoid allocating per frame.
export function pointAt(seam, s, out) {
  const { n, arclen, pos, nrm, length } = seam
  const sc = Number.isFinite(s) ? Math.min(length, Math.max(0, s)) : 0
  const i = segmentAt(arclen, n, sc)
  const span = arclen[i + 1] - arclen[i]
  const t = span > 0 ? Math.min(1, Math.max(0, (sc - arclen[i]) / span)) : 0

  const res = out ?? { pos: [0, 0, 0], nrm: [0, 0, 0] }
  const i3 = i * 3
  // A hand-built one-point seam has no next point; lerp to itself.
  const j3 = i + 1 < n ? i3 + 3 : i3
  for (let c = 0; c < 3; c += 1) {
    res.pos[c] = pos[i3 + c] + (pos[j3 + c] - pos[i3 + c]) * t
    res.nrm[c] = nrm[i3 + c] + (nrm[j3 + c] - nrm[i3 + c]) * t
  }
  // Lerped normals shrink between the endpoints; renormalise. If
  // they cancel (antiparallel endpoints), keep the start normal.
  const len = Math.hypot(res.nrm[0], res.nrm[1], res.nrm[2])
  if (len > 1e-9) {
    for (let c = 0; c < 3; c += 1) res.nrm[c] /= len
  } else {
    for (let c = 0; c < 3; c += 1) res.nrm[c] = nrm[i3 + c]
  }
  res.index = i
  res.t = t
  return res
}

export function seamsForShard(seams, id) {
  return seams.filter((s) => s.a === id || s.b === id)
}

// Seams whose both sides are placed — these become paintable.
export function seamsBetweenPlaced(seams, placed) {
  const has = placed instanceof Set ? placed : new Set(placed)
  return seams.filter((s) => has.has(s.a) && has.has(s.b))
}

// Fraction (0..1, by arclength) of the seam already reached by a
// crack front that has travelled `frontDist` metres from the
// impact. impactDist is linear within a segment, so the reached
// part of a straddling segment is the slice below the front.
export function revealProgress(seam, frontDist) {
  if (Number.isNaN(frontDist)) return 0
  const { n, arclen, impactDist, length } = seam
  if (!(length > 0)) {
    for (let i = 0; i < n; i += 1) if (impactDist[i] > frontDist) return 0
    return 1
  }
  let reached = 0
  for (let i = 0; i < n - 1; i += 1) {
    const d0 = impactDist[i]
    const d1 = impactDist[i + 1]
    const seg = arclen[i + 1] - arclen[i]
    const lo = Math.min(d0, d1)
    const hi = Math.max(d0, d1)
    if (hi <= frontDist) reached += seg
    else if (lo < frontDist) reached += (seg * (frontDist - lo)) / (hi - lo)
  }
  return Math.min(1, reached / length)
}

// The front distance at which every seam is fully revealed.
export function maxImpactDist(seams) {
  let max = 0
  for (const s of seams) {
    for (let i = 0; i < s.n; i += 1) if (s.impactDist[i] > max) max = s.impactDist[i]
  }
  return max
}

// Closest point on a screen-space polyline (flat [x0, y0, x1, …]).
// `along` is the fractional point index (index + t). An empty
// polyline reports dist = Infinity so any corridor test fails.
export function nearestOnPolyline2D(xy, p) {
  const n = Math.floor(xy.length / 2)
  if (n === 0) return { index: -1, t: 0, dist: Infinity, along: -1 }
  if (n === 1) {
    const dist = Math.hypot(p.x - xy[0], p.y - xy[1])
    return { index: 0, t: 0, dist, along: 0 }
  }
  let best = { index: 0, t: 0, dist: Infinity, along: 0 }
  for (let i = 0; i < n - 1; i += 1) {
    const ax = xy[i * 2]
    const ay = xy[i * 2 + 1]
    const dx = xy[i * 2 + 2] - ax
    const dy = xy[i * 2 + 3] - ay
    const len2 = dx * dx + dy * dy
    // Project p onto the segment, clamped to its ends.
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((p.x - ax) * dx + (p.y - ay) * dy) / len2)) : 0
    const dist = Math.hypot(p.x - (ax + dx * t), p.y - (ay + dy * t))
    if (dist < best.dist) best = { index: i, t, dist, along: i + t }
  }
  return best
}

// Closest point to p on the stretch of the polyline whose arclength
// lies in [lo, hi]. Real seams run up the outer wall, over the rim
// and back down the inner wall, so on screen a seam lies on top of
// itself; a whole-polyline search would snap to the other half and
// the brush would go dead. Each segment's parameter is clamped to
// its slice of the window, so the answer (s) is always inside it.
// A segment seen end-on has no direction to project along, so it
// answers with its point nearest the wet edge `wet`.
function nearestInRange(xy, arclen, n, p, lo, hi, wet) {
  if (n === 1) {
    const inside = arclen[0] >= lo && arclen[0] <= hi
    return { i: 0, s: arclen[0], dist: inside ? Math.hypot(p.x - xy[0], p.y - xy[1]) : Infinity }
  }
  let best = { i: 0, s: lo, dist: Infinity }
  for (let i = 0; i < n - 1; i += 1) {
    const s0 = arclen[i]
    const span = arclen[i + 1] - s0
    if (s0 > hi || s0 + span < lo) continue
    const tMin = span > 0 ? Math.max(0, (lo - s0) / span) : 0
    const tMax = span > 0 ? Math.min(1, (hi - s0) / span) : 0
    const ax = xy[i * 2]
    const ay = xy[i * 2 + 1]
    const dx = xy[i * 2 + 2] - ax
    const dy = xy[i * 2 + 3] - ay
    const len2 = dx * dx + dy * dy
    const raw =
      len2 > 0 ? ((p.x - ax) * dx + (p.y - ay) * dy) / len2 : span > 0 ? (wet - s0) / span : 0
    const t = Math.min(tMax, Math.max(tMin, raw))
    const dist = Math.hypot(p.x - (ax + dx * t), p.y - (ay + dy * t))
    // `<` so NaN (a point behind the camera) never wins.
    if (dist < best.dist) best = { i, s: s0 + span * t, dist }
  }
  return best
}

// Below this much screen length the metres-per-pixel ratio is
// meaningless: a sliver seen nearly end-on would turn a 5 px
// stroke into metres of lacquer.
const MIN_SCALE_PX = 4

// Metres of seam per screen pixel around segment i, averaged over
// neighbouring segments (growing outwards) until they cover at
// least MIN_SCALE_PX on screen. A whole seam shorter than that
// on screen is treated as MIN_SCALE_PX long, so a short scrub
// over it still fills it instead of dividing by ~0.
function metresPerPixel(xy, arclen, n, i) {
  let px = 0
  let metres = 0
  for (let r = 0; r < n - 1 && px < MIN_SCALE_PX; r += 1) {
    for (const j of r === 0 ? [i] : [i - r, i + r]) {
      if (j < 0 || j >= n - 1) continue
      px += Math.hypot(xy[j * 2 + 2] - xy[j * 2], xy[j * 2 + 3] - xy[j * 2 + 1])
      metres += arclen[j + 1] - arclen[j]
    }
  }
  // NaN px (a point behind the camera) means no usable scale.
  return Number.isFinite(px) ? metres / Math.max(px, MIN_SCALE_PX) : 0
}

// One brush sample of the lacquer stroke. `fill` is how far
// along the seam (metres) the lacquer has already run; returns
// the new fill, never lower than `fill`, never past the end.
//
// The pointer only counts while it is within the corridor of
// the stretch near the wet edge (from a little behind it to
// lookAheadM ahead) — you can't paint the far end of a crack
// first. When it counts, the fill jumps to the pointer's
// projection onto that stretch and is also nudged forward by the
// stroke distance, so short scrubbing strokes still progress.
export function lacquerStep({
  xy,
  arclen,
  fill,
  pointer,
  corridorPx = 24,
  lookAheadM = 0.012,
  gain = 1.6,
  strokePx = 0,
}) {
  // The seam's length comes from the full arclength table, even if
  // fewer screen points were supplied — otherwise a short `xy`
  // would clamp (i.e. shrink) an existing fill.
  const length = arclen.length > 0 ? arclen[arclen.length - 1] : 0
  const f = Number.isFinite(fill) ? Math.min(length, Math.max(0, fill)) : 0
  const n = Math.min(arclen.length, Math.floor(xy.length / 2))
  if (n === 0) return f
  if (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return f

  const ahead = Number.isFinite(lookAheadM) ? Math.max(0, lookAheadM) : 0.012
  const lo = f - LACQUER_BACK_SLACK
  const hi = f + ahead
  const near = nearestInRange(xy, arclen, n, pointer, lo, hi, f)
  if (!(near.dist <= corridorPx)) return f
  // Pinned to a window edge that isn't an end of the seam: the
  // pointer's foot lies outside the window (too far ahead or
  // behind), it's merely close to the edge — doesn't count.
  const EPS = 1e-9
  if ((lo > arclen[0] && near.s <= lo + EPS) || (hi < length && near.s >= hi - EPS)) return f

  const stroke = Number.isFinite(strokePx) && strokePx > 0 ? strokePx : 0
  const strokeM = n > 1 ? stroke * metresPerPixel(xy, arclen, n, near.i) : 0
  const g = Number.isFinite(gain) && gain > 0 ? gain : 0
  const next = Math.max(f, near.s, f + strokeM * g)
  return Math.min(length, next)
}

export function totalLength(seams) {
  let sum = 0
  for (const s of seams) sum += s.length
  return sum
}

// Sum of clamped fills. `fills` is either array-like, aligned
// with `seams` by position, or a Map keyed by seam id.
export function filledLength(seams, fills) {
  let sum = 0
  seams.forEach((s, k) => {
    const f = fills instanceof Map ? fills.get(s.id) : fills?.[k]
    if (Number.isFinite(f)) sum += Math.min(s.length, Math.max(0, f))
  })
  return sum
}
