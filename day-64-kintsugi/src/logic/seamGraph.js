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
  const j3 = i3 + 3
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
  return nearestOn(xy, Math.floor(xy.length / 2), p)
}

// Same, over the first n points only.
function nearestOn(xy, n, p) {
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

// Metres of seam per screen pixel around segment i. A segment
// seen end-on projects to ~0 px, so walk outwards to the nearest
// segment with real screen length; 0 if the whole seam is a dot.
function metresPerPixel(xy, arclen, n, i) {
  for (let r = 0; r < n - 1; r += 1) {
    for (const j of r === 0 ? [i] : [i - r, i + r]) {
      if (j < 0 || j >= n - 1) continue
      const px = Math.hypot(xy[j * 2 + 2] - xy[j * 2], xy[j * 2 + 3] - xy[j * 2 + 1])
      if (px > 1e-6) return (arclen[j + 1] - arclen[j]) / px
    }
  }
  return 0
}

// One brush sample of the lacquer stroke. `fill` is how far
// along the seam (metres) the lacquer has already run; returns
// the new fill, never lower than `fill`, never past the end.
//
// The pointer only counts while it is inside the corridor and
// near the wet edge (between a little behind it and lookAheadM
// ahead) — you can't paint the far end of a crack first. When
// it counts, the fill jumps to the pointer's projection and is
// also nudged forward by the stroke distance, so short
// scrubbing strokes along the seam still make progress.
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
  const n = Math.min(arclen.length, Math.floor(xy.length / 2))
  if (n === 0) return 0
  const length = arclen[n - 1]
  const f = Number.isFinite(fill) ? Math.min(length, Math.max(0, fill)) : 0
  if (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return f

  const near = nearestOn(xy, n, pointer)
  if (!(near.dist <= corridorPx)) return f

  const i = near.index
  const s = n === 1 ? arclen[0] : arclen[i] + (arclen[i + 1] - arclen[i]) * near.t
  if (s < f - LACQUER_BACK_SLACK || s > f + lookAheadM) return f

  const stroke = Number.isFinite(strokePx) && strokePx > 0 ? strokePx : 0
  const strokeM = n > 1 ? stroke * metresPerPixel(xy, arclen, n, i) : 0
  const g = Number.isFinite(gain) && gain > 0 ? gain : 0
  const next = Math.max(f, s, f + strokeM * g)
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
