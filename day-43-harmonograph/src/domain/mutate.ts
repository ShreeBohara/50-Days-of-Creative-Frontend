import {
  PARAM_RANGES,
  SCHEMA_VERSION,
  type HarmonographParams,
  type Pendulum,
} from './harmonograph'
import { createRng, pick, randRange, type Rng } from './random'

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/** Nudge a figure's parameters by a bounded, seeded amount (0 = identity). */
export function mutate(
  params: HarmonographParams,
  seed: string,
  amount = 0.16,
): HarmonographParams {
  const rng = createRng(seed)
  const nudge = (value: number, range: { min: number; max: number }) =>
    clamp(value + (rng() * 2 - 1) * amount * (range.max - range.min), range.min, range.max)

  const mutated = (p: Pendulum): Pendulum => ({
    freq: nudge(p.freq, PARAM_RANGES.freq),
    amp: nudge(p.amp, PARAM_RANGES.amp),
    phase: nudge(p.phase, PARAM_RANGES.phase),
    damping: nudge(p.damping, PARAM_RANGES.damping),
  })

  return {
    ...params,
    x: params.x.map(mutated),
    y: params.y.map(mutated),
    seed,
  }
}

const FREQ_CHOICES = [1, 2, 3, 4, 5]

function randomPendulum(rng: Rng, lead: boolean): Pendulum {
  const base = pick(rng, FREQ_CHOICES)
  // a touch of detune on the secondary oscillator gives lively beats
  const detune = lead ? 0 : (rng() - 0.5) * 0.04
  return {
    freq: base + detune,
    amp: lead ? randRange(rng, 0.55, 0.95) : randRange(rng, 0.2, 0.55),
    phase: randRange(rng, 0, Math.PI * 2),
    damping: randRange(rng, 0.0025, 0.02),
  }
}

/** Build a fresh, pleasing figure deterministically from a seed token. */
export function randomFigure(seed: string): HarmonographParams {
  const rng = createRng(seed)
  return {
    version: SCHEMA_VERSION,
    x: [randomPendulum(rng, true), randomPendulum(rng, false)],
    y: [randomPendulum(rng, true), randomPendulum(rng, false)],
    duration: Math.round(randRange(rng, 160, 320)),
    steps: 4600,
    seed,
  }
}
