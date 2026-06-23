import { encodeParams } from '../domain/serialize'
import type { HarmonographParams } from '../domain/harmonograph'

const TOKEN_RE = /[#&]fig=([^&]+)/

/** Build a shareable URL whose hash encodes the figure. */
export function buildShareUrl(params: HarmonographParams, base: string): string {
  const clean = base.split('#')[0]
  return `${clean}#fig=${encodeParams(params)}`
}

/** Extract the figure token from a location hash (or full URL), if present. */
export function readShareToken(hash: string): string | null {
  const match = TOKEN_RE.exec(hash)
  return match ? match[1] : null
}
