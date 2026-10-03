// 2D polygon helpers for card outlines: points are [x, y] in cm, canvas
// convention (y down). Outlines may be concave; clipping is only ever against
// half-planes (a crease, a glue line, a fold between box panels).

/** Signed area (positive = clockwise on a y-down canvas). */
export function area(poly) {
  let s = 0
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x0, y0] = poly[i]
    const [x1, y1] = poly[(i + 1) % n]
    s += x0 * y1 - x1 * y0
  }
  return s / 2
}

export function bbox(polys) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const poly of polys) {
    for (const [x, y] of poly) {
      if (x < x0) x0 = x
      if (y < y0) y0 = y
      if (x > x1) x1 = x
      if (y > y1) y1 = y
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }
}

/**
 * Sutherland–Hodgman against the half-plane { q : (q − p)·n ≥ 0 }.
 * Concave subjects can come back with zero-width bridges along the clip line;
 * earcut triangulates those harmlessly.
 */
export function clipHalfPlane(poly, p, n) {
  const out = []
  const m = poly.length
  if (!m) return out
  const side = (q) => (q[0] - p[0]) * n[0] + (q[1] - p[1]) * n[1]
  for (let i = 0; i < m; i++) {
    const cur = poly[i]
    const prev = poly[(i + m - 1) % m]
    const dc = side(cur)
    const dp = side(prev)
    if (dc >= 0) {
      if (dp < 0) out.push(cut(prev, cur, dp, dc))
      out.push(cur)
    } else if (dp >= 0) {
      out.push(cut(prev, cur, dp, dc))
    }
  }
  return dedupe(out)
}

function cut(a, b, da, db) {
  const t = da / (da - db)
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
}

function dedupe(poly) {
  const out = []
  for (const q of poly) {
    const last = out[out.length - 1]
    if (!last || Math.abs(last[0] - q[0]) > 1e-9 || Math.abs(last[1] - q[1]) > 1e-9) out.push(q)
  }
  if (out.length > 1) {
    const a = out[0]
    const b = out[out.length - 1]
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) out.pop()
  }
  return out.length >= 3 ? out : []
}

/** Clip against several half-planes in turn. */
export function clipAll(poly, planes) {
  let out = poly
  for (const [p, n] of planes) {
    out = clipHalfPlane(out, p, n)
    if (!out.length) break
  }
  return out
}

/** Even–odd point-in-polygon. */
export function contains(poly, x, y) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function rect(x, y, w, h) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
}

export function circle(cx, cy, r, segments = 64) {
  const out = []
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2
    out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r])
  }
  return out
}

/** A rounded rectangle as a polygon (corner radius r, `k` points per corner). */
export function roundRect(x, y, w, h, r, k = 6) {
  r = Math.min(r, w / 2, h / 2)
  const out = []
  const corners = [
    [x + w - r, y + r, -Math.PI / 2],
    [x + w - r, y + h - r, 0],
    [x + r, y + h - r, Math.PI / 2],
    [x + r, y + r, Math.PI],
  ]
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= k; i++) {
      const t = a0 + (i / k) * (Math.PI / 2)
      out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r])
    }
  }
  return out
}

/**
 * The part of segment p0→p1 (a fold line) that lies inside `poly`, as
 * [tStart, tEnd] parameter ranges. Used to draw creases only where paper is.
 */
export function segmentInside(poly, p0, p1) {
  const ts = [0, 1]
  const dx = p1[0] - p0[0]
  const dy = p1[1] - p0[1]
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]
    const b = poly[i]
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-12) continue
    const t = ((a[0] - p0[0]) * ey - (a[1] - p0[1]) * ex) / den
    const u = ((a[0] - p0[0]) * dy - (a[1] - p0[1]) * dx) / den
    if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t)
  }
  ts.sort((a, b) => a - b)
  const out = []
  for (let i = 0; i < ts.length - 1; i++) {
    const tm = (ts[i] + ts[i + 1]) / 2
    if (ts[i + 1] - ts[i] < 1e-6) continue
    if (contains(poly, p0[0] + dx * tm, p0[1] + dy * tm)) {
      const last = out[out.length - 1]
      if (last && Math.abs(last[1] - ts[i]) < 1e-9) last[1] = ts[i + 1]
      else out.push([ts[i], ts[i + 1]])
    }
  }
  return out
}
