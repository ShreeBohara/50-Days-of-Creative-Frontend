// Pure harmonograph model.
//
// A lateral harmonograph traces the motion of a pen driven by damped pendulums.
// Each axis is the sum of two damped sinusoids:
//
//   x(t) = Σ ampᵢ · sin(freqᵢ · t + phaseᵢ) · e^(−dampingᵢ · t)
//   y(t) = Σ ampⱼ · sin(freqⱼ · t + phaseⱼ) · e^(−dampingⱼ · t)
//
// Everything here is deterministic and side-effect free so it is trivially
// testable and reproducible from serialized parameters.

export interface Pendulum {
  freq: number
  amp: number
  phase: number
  damping: number
}

export interface HarmonographParams {
  version: number
  /** Oscillators summed for the x axis. */
  x: Pendulum[]
  /** Oscillators summed for the y axis. */
  y: Pendulum[]
  /** Total sweep time (in radians of the base oscillation). */
  duration: number
  /** Number of samples taken across the duration. */
  steps: number
  /** Seed token, kept for provenance + reproducible randomize/mutate. */
  seed: string
}

export interface Point {
  x: number
  y: number
}

export const SCHEMA_VERSION = 1

export const PARAM_RANGES = {
  freq: { min: 0.5, max: 8, step: 0.01 },
  amp: { min: 0, max: 1.2, step: 0.01 },
  phase: { min: 0, max: Math.PI * 2, step: 0.01 },
  damping: { min: 0, max: 0.06, step: 0.0005 },
  duration: { min: 40, max: 420, step: 1 },
  steps: { min: 800, max: 9000, step: 100 },
} as const

function oscillate(p: Pendulum, t: number): number {
  return p.amp * Math.sin(p.freq * t + p.phase) * Math.exp(-p.damping * t)
}

/** The half-extent the figure can reach on each axis (max possible |value|). */
export function figureExtent(params: HarmonographParams): number {
  const sum = (arr: Pendulum[]) => arr.reduce((acc, p) => acc + Math.abs(p.amp), 0)
  return Math.max(sum(params.x), sum(params.y), 0.0001)
}

/**
 * Sample the pen path. Returns `steps + 1` points in "studio units"
 * (roughly bounded by ±figureExtent); the renderer maps these into pixels.
 */
export function samplePath(
  params: HarmonographParams,
  override?: { steps?: number; duration?: number },
): Point[] {
  const steps = Math.max(2, Math.round(override?.steps ?? params.steps))
  const duration = override?.duration ?? params.duration
  const points: Point[] = new Array(steps + 1)
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * duration
    let x = 0
    let y = 0
    for (let k = 0; k < params.x.length; k++) x += oscillate(params.x[k], t)
    for (let k = 0; k < params.y.length; k++) y += oscillate(params.y[k], t)
    points[i] = { x, y }
  }
  return points
}

/**
 * Build an SVG path `d` string, mapping studio units → a centered pixel box.
 * `size` is the square viewport edge; `pad` is an inner margin fraction.
 */
export function pathToSvgD(
  points: Point[],
  extent: number,
  size = 1000,
  pad = 0.08,
): string {
  if (points.length === 0) return ''
  const inner = (size / 2) * (1 - pad)
  const c = size / 2
  const k = inner / extent
  let d = ''
  for (let i = 0; i < points.length; i++) {
    const px = c + points[i].x * k
    const py = c - points[i].y * k
    d += (i === 0 ? 'M' : 'L') + px.toFixed(2) + ' ' + py.toFixed(2)
  }
  return d
}

/** Approximate total polyline length in studio units (for draw timing). */
export function pathLength(points: Point[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  }
  return len
}

/** The reduced frequency ratio of the two axes, e.g. "3 : 2" — shown in the HUD. */
export function frequencyRatio(params: HarmonographParams): string {
  const fx = params.x[0]?.freq ?? 1
  const fy = params.y[0]?.freq ?? 1
  const a = Math.round(fx * 4)
  const b = Math.round(fy * 4)
  const g = gcd(a, b) || 1
  return `${a / g} : ${b / g}`
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    ;[a, b] = [b, a % b]
  }
  return a
}
