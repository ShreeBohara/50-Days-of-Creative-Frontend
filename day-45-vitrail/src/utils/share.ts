import type { WindowGenome } from '../domain/genome'
import { deserializeGenome, serializeGenome } from '../domain/serialize'

const HASH_KEY = 'w='

export function buildShareHash(genome: WindowGenome): string {
  return `#${HASH_KEY}${serializeGenome(genome)}`
}

export function parseShareHash(hash: string): WindowGenome | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw.startsWith(HASH_KEY)) return null
  return deserializeGenome(raw.slice(HASH_KEY.length))
}

export function buildShareUrl(genome: WindowGenome, loc: Pick<Location, 'origin' | 'pathname'> = location): string {
  return `${loc.origin}${loc.pathname}${buildShareHash(genome)}`
}
