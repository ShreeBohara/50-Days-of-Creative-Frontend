// ============================================================
// Fit rules — when may a shard lock back onto the bowl?
//
// The foot-ring shard (the "anchor") starts placed. Any other
// shard locks when it is dragged within a snap tolerance of its
// home pose AND it shares a crack with a shard already placed —
// you rebuild the bowl outward from the foot, like a real
// mender, never floating a rim piece in mid-air.
//
// Adjacency comes from two sources in the seam JSON (the shard
// neighbour lists and the seams' a/b pairs). We union both, so
// a pipeline that under-reports one still yields a usable graph.
// ============================================================

// Distances in metres, measured from a shard to its home pose.
export const SNAP_TOL = Object.freeze({ mouse: 0.006, touch: 0.012 })
export const MAGNET_RADIUS = Object.freeze({ mouse: 0.024, touch: 0.03 })

function link(adj, a, b) {
  if (!adj.has(a)) adj.set(a, new Set())
  if (!adj.has(b)) adj.set(b, new Set())
  if (a === b) return
  adj.get(a).add(b)
  adj.get(b).add(a)
}

// Map<id, Set<id>>, symmetric, no self-loops. Every shard in
// json.shards gets a key, even an (unexpected) isolated one.
// When shards are listed, a neighbour or seam naming an id that
// isn't one of them is dropped: a phantom node would sit in the
// assembly order forever and isAssembled could never come true.
export function buildAdjacency(json) {
  const adj = new Map()
  const shards = (json?.shards ?? []).filter((s) => Number.isInteger(s?.id))
  const known = shards.length > 0 ? new Set(shards.map((s) => s.id)) : null
  const ok = (id) => Number.isInteger(id) && (!known || known.has(id))

  for (const shard of shards) {
    if (!adj.has(shard.id)) adj.set(shard.id, new Set())
    for (const nb of shard.neighbors ?? []) {
      if (ok(nb)) link(adj, shard.id, nb)
    }
  }
  for (const seam of json?.seams ?? []) {
    if (ok(seam?.a) && ok(seam?.b)) link(adj, seam.a, seam.b)
  }
  return adj
}

function touchesPlaced(id, placed, adjacency) {
  const nbs = adjacency.get(id)
  if (!nbs) return false
  for (const nb of nbs) if (placed.has(nb)) return true
  return false
}

// Why a drop at `dist` from home would or wouldn't lock. Checked
// in this order, so the feedback names the most useful problem.
export function lockReason({ id, placed, adjacency, dist, tol }) {
  if (placed.has(id)) return 'already-placed'
  if (!(Number.isFinite(dist) && dist <= tol)) return 'too-far'
  if (!touchesPlaced(id, placed, adjacency)) return 'no-neighbour'
  return 'ok'
}

export function canLock(args) {
  return lockReason(args) === 'ok'
}

// Breadth-first from the anchor, one ring at a time; each ring
// is sorted by id so the order never depends on Set insertion.
// Shards with no path to the anchor land in `unreachable`.
export function assemblyOrder(adjacency, anchorId) {
  if (!adjacency.has(anchorId)) {
    return { order: [], unreachable: [...adjacency.keys()].sort((x, y) => x - y) }
  }
  const seen = new Set([anchorId])
  const order = [anchorId]
  let ring = [anchorId]
  while (ring.length > 0) {
    const next = []
    for (const id of ring) {
      for (const nb of adjacency.get(id) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb)
          next.push(nb)
        }
      }
    }
    next.sort((x, y) => x - y)
    order.push(...next)
    ring = next
  }
  const unreachable = [...adjacency.keys()].filter((id) => !seen.has(id)).sort((x, y) => x - y)
  return { order, unreachable }
}

// The shard the "help me" hint should highlight next: the first
// unplaced shard in assembly order that already has a placed
// neighbour. Returns the anchor itself if even that is missing.
export function nextAutoFit(placed, adjacency, anchorId) {
  if (!placed.has(anchorId)) return adjacency.has(anchorId) ? anchorId : null
  const { order } = assemblyOrder(adjacency, anchorId)
  for (const id of order) {
    if (!placed.has(id) && touchesPlaced(id, placed, adjacency)) return id
  }
  return null
}

// True once every shard reachable from the anchor is placed.
export function isAssembled(placed, adjacency, anchorId) {
  const { order } = assemblyOrder(adjacency, anchorId)
  return order.length > 0 && order.every((id) => placed.has(id))
}

// Magnetic assist while dragging: 1 inside the snap tolerance,
// 0 beyond the magnet radius, smoothstep in between so the
// pull fades in without a visible edge.
export function magnetPull(dist, tol, radius) {
  if (!Number.isFinite(dist)) return 0
  if (dist <= tol) return 1
  if (!(radius > tol) || dist >= radius) return 0
  const u = (radius - dist) / (radius - tol)
  return u * u * (3 - 2 * u)
}
