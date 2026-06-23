import { SCHEMA_VERSION, type HarmonographParams, type Pendulum } from './harmonograph'

function lerp(a: number, b: number, t: number): number {
  // exact at the endpoints so a blend reproduces its parents bit-for-bit
  if (t <= 0) return a
  if (t >= 1) return b
  return a + (b - a) * t
}

const TAU = Math.PI * 2

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** Interpolate two angles along the shortest arc, result wrapped to [0, 2π). */
export function blendAngle(a: number, b: number, t: number): number {
  if (t <= 0) return a
  if (t >= 1) return b
  const diff = mod(b - a + Math.PI, TAU) - Math.PI
  return mod(a + diff * t, TAU)
}

function blendPendulum(a: Pendulum, b: Pendulum, t: number): Pendulum {
  return {
    freq: lerp(a.freq, b.freq, t),
    amp: lerp(a.amp, b.amp, t),
    phase: blendAngle(a.phase, b.phase, t),
    damping: lerp(a.damping, b.damping, t),
  }
}

function blendAxis(a: Pendulum[], b: Pendulum[], t: number): Pendulum[] {
  const len = Math.min(a.length, b.length)
  const out: Pendulum[] = []
  for (let i = 0; i < len; i++) out.push(blendPendulum(a[i], b[i], t))
  return out
}

/**
 * Deterministically crossbreed two figures. `t` slides the offspring from
 * parent A (t=0) to parent B (t=1). Same inputs always yield the same child.
 */
export function blendParams(
  a: HarmonographParams,
  b: HarmonographParams,
  t: number,
): HarmonographParams {
  return {
    version: SCHEMA_VERSION,
    x: blendAxis(a.x, b.x, t),
    y: blendAxis(a.y, b.y, t),
    duration: Math.round(lerp(a.duration, b.duration, t)),
    steps: Math.round(lerp(a.steps, b.steps, t)),
    seed: `${a.seed}x${b.seed}@${t.toFixed(2)}`,
  }
}
