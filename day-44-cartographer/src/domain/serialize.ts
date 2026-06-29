import { PARAM_RANGES, SCHEMA_VERSION, type WorldParams } from './world'

// Compact, URL-safe encoding of a world genome so it can live in a share link.

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

interface Encoded {
  v: number
  z: string // seed
  sl: number
  rl: number
  oc: number
  ps: number
  mb: number
  ib: number
  rv: number
  bp: string // palette
  lg: string // language
  ld: number
}

export function encodeParams(params: WorldParams): string {
  const payload: Encoded = {
    v: params.version,
    z: params.seed,
    sl: round(params.seaLevel),
    rl: round(params.relief),
    oc: Math.round(params.octaves),
    ps: round(params.persistence),
    mb: round(params.mountainBias),
    ib: round(params.islandBias),
    rv: Math.round(params.rivers),
    bp: params.biomePaletteId,
    lg: params.languageId,
    ld: round(params.labelDensity),
  }
  return toBase64Url(JSON.stringify(payload))
}

function clamp(v: number, k: keyof typeof PARAM_RANGES): number {
  return Math.max(PARAM_RANGES[k].min, Math.min(PARAM_RANGES[k].max, v))
}

export function decodeParams(token: string): WorldParams | null {
  try {
    const d = JSON.parse(fromBase64Url(token)) as Partial<Encoded>
    if (
      !d ||
      typeof d.z !== 'string' ||
      typeof d.sl !== 'number' ||
      typeof d.oc !== 'number' ||
      typeof d.ib !== 'number'
    ) {
      return null
    }
    return {
      version: SCHEMA_VERSION,
      seed: d.z,
      seaLevel: clamp(d.sl, 'seaLevel'),
      relief: clamp(typeof d.rl === 'number' ? d.rl : 0.25, 'relief'),
      octaves: clamp(d.oc, 'octaves'),
      persistence: clamp(typeof d.ps === 'number' ? d.ps : 0.5, 'persistence'),
      mountainBias: clamp(typeof d.mb === 'number' ? d.mb : 1.4, 'mountainBias'),
      islandBias: clamp(d.ib, 'islandBias'),
      rivers: clamp(typeof d.rv === 'number' ? d.rv : 3, 'rivers'),
      biomePaletteId: typeof d.bp === 'string' ? d.bp : 'atlas',
      languageId: typeof d.lg === 'string' ? d.lg : 'norse',
      labelDensity: clamp(typeof d.ld === 'number' ? d.ld : 0.5, 'labelDensity'),
    }
  } catch {
    return null
  }
}
