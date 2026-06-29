import { describe, expect, it } from 'vitest'
import { decodeParams, encodeParams } from './serialize'
import { createDefaultParams } from './defaults'
import { randomWorld } from './mutate'
import type { WorldParams } from './world'

describe('serialize', () => {
  it('round-trips the default world', () => {
    const params = createDefaultParams()
    const decoded = decodeParams(encodeParams(params))
    expect(decoded).toEqual(params)
  })

  it('round-trips random worlds', () => {
    for (const seed of ['a1', 'b2', 'c3', 'longer-seed-token']) {
      const params = randomWorld(seed)
      expect(decodeParams(encodeParams(params))).toEqual(params)
    }
  })

  it('produces a URL-safe token (no +, /, =)', () => {
    const token = encodeParams(randomWorld('safety'))
    expect(token).not.toMatch(/[+/=]/)
  })

  it('returns null for garbage', () => {
    expect(decodeParams('not-base64!!')).toBeNull()
    expect(decodeParams('')).toBeNull()
  })

  it('clamps out-of-range numbers and fills missing categoricals', () => {
    const params: WorldParams = { ...createDefaultParams(), seaLevel: 9, islandBias: -3 }
    const decoded = decodeParams(encodeParams(params))!
    expect(decoded.seaLevel).toBeLessThanOrEqual(0.6)
    expect(decoded.islandBias).toBeGreaterThanOrEqual(0)
  })
})
