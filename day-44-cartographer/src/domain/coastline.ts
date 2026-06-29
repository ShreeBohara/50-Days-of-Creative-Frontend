// Marching squares: trace iso-contours of a scalar field. Used for the coastline
// (the sea-level isovalue) and for elevation contour lines (several isovalues),
// which give the chart its engraved, topographic look. Pure and deterministic.

export interface Point {
  x: number
  y: number
}
export type Segment = [Point, Point]
export type Polyline = Point[]

/**
 * Marching squares over a row-major `field` of `size`×`size` samples. Returns
 * line segments where the field crosses `threshold`, with endpoints linearly
 * interpolated along cell edges. Coordinates are in grid units (0…size-1).
 */
export function contourSegments(field: Float32Array, size: number, threshold: number): Segment[] {
  const segs: Segment[] = []
  const at = (x: number, y: number) => field[y * size + x]

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const va = at(x, y) // top-left
      const vb = at(x + 1, y) // top-right
      const vc = at(x + 1, y + 1) // bottom-right
      const vd = at(x, y + 1) // bottom-left

      let c = 0
      if (va > threshold) c |= 1
      if (vb > threshold) c |= 2
      if (vc > threshold) c |= 4
      if (vd > threshold) c |= 8
      if (c === 0 || c === 15) continue

      const top = (): Point => ({ x: x + (threshold - va) / (vb - va), y })
      const right = (): Point => ({ x: x + 1, y: y + (threshold - vb) / (vc - vb) })
      const bottom = (): Point => ({ x: x + (threshold - vd) / (vc - vd), y: y + 1 })
      const left = (): Point => ({ x, y: y + (threshold - va) / (vd - va) })

      switch (c) {
        case 1:
        case 14:
          segs.push([left(), top()])
          break
        case 2:
        case 13:
          segs.push([top(), right()])
          break
        case 3:
        case 12:
          segs.push([left(), right()])
          break
        case 4:
        case 11:
          segs.push([right(), bottom()])
          break
        case 6:
        case 9:
          segs.push([top(), bottom()])
          break
        case 7:
        case 8:
          segs.push([left(), bottom()])
          break
        case 5: // saddle
          segs.push([left(), top()])
          segs.push([right(), bottom()])
          break
        case 10: // saddle
          segs.push([top(), right()])
          segs.push([left(), bottom()])
          break
      }
    }
  }
  return segs
}

function key(p: Point): string {
  return `${Math.round(p.x * 1000)},${Math.round(p.y * 1000)}`
}

/**
 * Stitch loose contour segments into continuous polylines by matching shared
 * endpoints. Closed loops (islands, lakes) come back with first ≈ last point.
 */
export function stitchSegments(segments: Segment[]): Polyline[] {
  const adj = new Map<string, number[]>()
  const add = (k: string, i: number) => {
    const a = adj.get(k)
    if (a) a.push(i)
    else adj.set(k, [i])
  }
  segments.forEach((s, i) => {
    add(key(s[0]), i)
    add(key(s[1]), i)
  })

  const used = new Array(segments.length).fill(false)
  const nextFrom = (k: string): number => {
    const cands = adj.get(k)
    if (!cands) return -1
    for (const j of cands) if (!used[j]) return j
    return -1
  }

  const polylines: Polyline[] = []
  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue
    used[i] = true
    const pts: Point[] = [segments[i][0], segments[i][1]]

    // Walk forward from the tail.
    let tailKey = key(pts[pts.length - 1])
    for (;;) {
      const j = nextFrom(tailKey)
      if (j < 0) break
      used[j] = true
      const s = segments[j]
      const next = key(s[0]) === tailKey ? s[1] : s[0]
      pts.push(next)
      tailKey = key(next)
      if (tailKey === key(pts[0])) break // closed
    }

    // Walk backward from the head.
    let headKey = key(pts[0])
    for (;;) {
      const j = nextFrom(headKey)
      if (j < 0) break
      used[j] = true
      const s = segments[j]
      const prev = key(s[0]) === headKey ? s[1] : s[0]
      pts.unshift(prev)
      headKey = key(prev)
      if (headKey === key(pts[pts.length - 1])) break
    }

    polylines.push(pts)
  }
  return polylines
}

/** Convenience: contour a field at one threshold and return stitched polylines. */
export function traceContours(field: Float32Array, size: number, threshold: number): Polyline[] {
  return stitchSegments(contourSegments(field, size, threshold))
}

export interface ContourLevel {
  level: number
  polylines: Polyline[]
}

/** Trace several elevation isovalues at once (for layered contour lines). */
export function contourLevels(
  field: Float32Array,
  size: number,
  thresholds: number[],
): ContourLevel[] {
  return thresholds.map((level) => ({ level, polylines: traceContours(field, size, level) }))
}

/** Build an SVG path `d` from a polyline, scaling grid units → pixels. */
export function polylineToPath(line: Polyline, scale: number, close = false): string {
  if (line.length === 0) return ''
  let d = ''
  for (let i = 0; i < line.length; i++) {
    const px = (line[i].x * scale).toFixed(2)
    const py = (line[i].y * scale).toFixed(2)
    d += (i === 0 ? 'M' : 'L') + px + ' ' + py
  }
  if (close) d += 'Z'
  return d
}
