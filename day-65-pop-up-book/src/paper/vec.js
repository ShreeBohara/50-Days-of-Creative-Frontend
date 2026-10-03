// Tiny 3-vector helpers on plain arrays. The fold solver runs on a few dozen
// vectors per spread per frame, and plain arrays keep it testable in node
// without three.js and trivially serialisable for the preview script.

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
export const neg = (a) => [-a[0], -a[1], -a[2]]
/** a + b·k */
export const madd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
export const len = (a) => Math.hypot(a[0], a[1], a[2])
export function norm(a) {
  const l = len(a)
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]
}
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** Rotate v about the unit axis k by angle t (Rodrigues). */
export function rotate(v, k, t) {
  const c = Math.cos(t)
  const s = Math.sin(t)
  const kv = cross(k, v)
  const kd = dot(k, v) * (1 - c)
  return [v[0] * c + kv[0] * s + k[0] * kd, v[1] * c + kv[1] * s + k[1] * kd, v[2] * c + kv[2] * s + k[2] * kd]
}

/** Clamp a cosine into acos's domain before calling it. */
export const safeAcos = (x) => Math.acos(Math.max(-1, Math.min(1, x)))
