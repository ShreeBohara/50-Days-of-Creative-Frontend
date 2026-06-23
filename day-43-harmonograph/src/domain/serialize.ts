import { SCHEMA_VERSION, type HarmonographParams, type Pendulum } from './harmonograph'

// Compact, URL-safe encoding of a figure so it can live in a shareable link.

function toBase64Url(input: string): string {
  return btoa(unescape(encodeURIComponent(input)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  return decodeURIComponent(escape(atob(padded)))
}

function round(n: number, places = 4): number {
  return Number(n.toFixed(places))
}

type EncodedPendulum = [number, number, number, number]

interface Encoded {
  v: number
  x: EncodedPendulum[]
  y: EncodedPendulum[]
  d: number
  s: number
  z: string
}

function encodePendulum(p: Pendulum): EncodedPendulum {
  return [round(p.freq), round(p.amp), round(p.phase), round(p.damping, 5)]
}

export function encodeParams(params: HarmonographParams): string {
  const payload: Encoded = {
    v: params.version,
    x: params.x.map(encodePendulum),
    y: params.y.map(encodePendulum),
    d: Math.round(params.duration),
    s: Math.round(params.steps),
    z: params.seed,
  }
  return toBase64Url(JSON.stringify(payload))
}

function isPendulumTuple(t: unknown): t is EncodedPendulum {
  return Array.isArray(t) && t.length === 4 && t.every((n) => typeof n === 'number')
}

function decodePendulum(t: EncodedPendulum): Pendulum {
  return { freq: t[0], amp: t[1], phase: t[2], damping: t[3] }
}

export function decodeParams(token: string): HarmonographParams | null {
  try {
    const data = JSON.parse(fromBase64Url(token)) as Encoded
    if (
      !data ||
      !Array.isArray(data.x) ||
      !Array.isArray(data.y) ||
      !data.x.every(isPendulumTuple) ||
      !data.y.every(isPendulumTuple) ||
      typeof data.d !== 'number' ||
      typeof data.s !== 'number'
    ) {
      return null
    }
    return {
      version: SCHEMA_VERSION,
      x: data.x.map(decodePendulum),
      y: data.y.map(decodePendulum),
      duration: data.d,
      steps: data.s,
      seed: typeof data.z === 'string' ? data.z : 'shared',
    }
  } catch {
    return null
  }
}
