import { SCHEMA_VERSION, type HarmonographParams } from '../domain/harmonograph'

export interface Preset {
  id: string
  name: string
  blurb: string
  paletteId: string
  params: HarmonographParams
}

const PI = Math.PI

export const PRESETS: Preset[] = [
  {
    id: 'lissajous-lock',
    name: 'Lissajous Lock',
    blurb: 'A clean 3:2 weave',
    paletteId: 'brass-verdigris',
    params: {
      version: SCHEMA_VERSION,
      x: [
        { freq: 3, amp: 0.85, phase: 0, damping: 0.0018 },
        { freq: 3, amp: 0.18, phase: PI / 2, damping: 0.003 },
      ],
      y: [
        { freq: 2, amp: 0.85, phase: PI / 2, damping: 0.0018 },
        { freq: 2, amp: 0.16, phase: 0, damping: 0.003 },
      ],
      duration: 200,
      steps: 4200,
      seed: 'lissajous-lock',
    },
  },
  {
    id: 'rose-window',
    name: 'Rose Window',
    blurb: 'Symmetric petals',
    paletteId: 'aurora',
    params: {
      version: SCHEMA_VERSION,
      x: [
        { freq: 5, amp: 0.7, phase: 0, damping: 0.0035 },
        { freq: 1, amp: 0.4, phase: PI / 4, damping: 0.0035 },
      ],
      y: [
        { freq: 5, amp: 0.7, phase: PI / 2, damping: 0.0035 },
        { freq: 1, amp: 0.4, phase: -PI / 4, damping: 0.0035 },
      ],
      duration: 260,
      steps: 5200,
      seed: 'rose-window',
    },
  },
  {
    id: 'phase-beat',
    name: 'Phase Beat',
    blurb: 'Detuned slow drift',
    paletteId: 'ember',
    params: {
      version: SCHEMA_VERSION,
      x: [
        { freq: 2, amp: 0.8, phase: 0, damping: 0.0026 },
        { freq: 2.02, amp: 0.5, phase: 1.1, damping: 0.0042 },
      ],
      y: [
        { freq: 3, amp: 0.78, phase: PI / 3, damping: 0.0026 },
        { freq: 2.99, amp: 0.46, phase: 2.2, damping: 0.005 },
      ],
      duration: 300,
      steps: 6000,
      seed: 'phase-beat',
    },
  },
  {
    id: 'damped-star',
    name: 'Damped Star',
    blurb: 'A 5:4 collapse',
    paletteId: 'phosphor',
    params: {
      version: SCHEMA_VERSION,
      x: [
        { freq: 5, amp: 0.9, phase: 0, damping: 0.012 },
        { freq: 4, amp: 0.32, phase: PI / 2, damping: 0.016 },
      ],
      y: [
        { freq: 4, amp: 0.9, phase: PI / 6, damping: 0.012 },
        { freq: 5, amp: 0.3, phase: 1.7, damping: 0.016 },
      ],
      duration: 180,
      steps: 4200,
      seed: 'damped-star',
    },
  },
  {
    id: 'resonant-drift',
    name: 'Resonant Drift',
    blurb: 'Layered 2:3 bloom',
    paletteId: 'rose-gold',
    params: {
      version: SCHEMA_VERSION,
      x: [
        { freq: 2, amp: 0.72, phase: 0, damping: 0.0044 },
        { freq: 2.01, amp: 0.4, phase: 1.25, damping: 0.0066 },
      ],
      y: [
        { freq: 3, amp: 0.7, phase: PI / 3, damping: 0.0044 },
        { freq: 3.0, amp: 0.36, phase: 2.4, damping: 0.0085 },
      ],
      duration: 240,
      steps: 5000,
      seed: 'resonant-drift',
    },
  },
  {
    id: 'spiral-bloom',
    name: 'Spiral Bloom',
    blurb: 'Quadrature inward spiral',
    paletteId: 'ink-silver',
    params: {
      version: SCHEMA_VERSION,
      x: [
        { freq: 1, amp: 0.95, phase: 0, damping: 0.009 },
        { freq: 6, amp: 0.16, phase: PI / 2, damping: 0.006 },
      ],
      y: [
        { freq: 1, amp: 0.95, phase: PI / 2, damping: 0.009 },
        { freq: 6, amp: 0.16, phase: 0, damping: 0.006 },
      ],
      duration: 280,
      steps: 5200,
      seed: 'spiral-bloom',
    },
  },
]
