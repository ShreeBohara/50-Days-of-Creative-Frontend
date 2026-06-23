import { SCHEMA_VERSION, type HarmonographParams } from './harmonograph'

// The figure shown on first load — a detuned 2:3 lateral harmonograph that
// decays into a layered rose. Returns a fresh deep copy each call.
export function createDefaultParams(): HarmonographParams {
  return {
    version: SCHEMA_VERSION,
    x: [
      { freq: 2, amp: 0.72, phase: 0, damping: 0.0042 },
      { freq: 2.01, amp: 0.36, phase: 1.25, damping: 0.0065 },
    ],
    y: [
      { freq: 3, amp: 0.7, phase: Math.PI / 3, damping: 0.0042 },
      { freq: 3.0, amp: 0.34, phase: 2.4, damping: 0.0085 },
    ],
    duration: 220,
    steps: 4600,
    seed: 'pendula',
  }
}
