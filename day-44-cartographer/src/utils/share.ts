import { encodeParams } from '../domain/serialize'
import type { WorldParams } from '../domain/world'

const TOKEN_RE = /[#&]map=([^&]+)/

/** Build a shareable URL whose hash encodes the world genome. */
export function buildShareUrl(params: WorldParams, base: string): string {
  const clean = base.split('#')[0]
  return `${clean}#map=${encodeParams(params)}`
}

/** Extract the world token from a location hash (or full URL), if present. */
export function readShareToken(hash: string): string | null {
  const match = TOKEN_RE.exec(hash)
  return match ? match[1] : null
}
