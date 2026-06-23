import { describe, expect, it } from 'vitest'
import { createDefaultParams } from './defaults'
import { SCHEMA_VERSION, type HarmonographParams } from './harmonograph'
import { decodeParams, encodeParams } from './serialize'

function cleanParams(): HarmonographParams {
  return {
    version: SCHEMA_VERSION,
    x: [
      { freq: 2, amp: 0.5, phase: 1.5, damping: 0.005 },
      { freq: 3, amp: 0.25, phase: 0.5, damping: 0.01 },
    ],
    y: [
      { freq: 4, amp: 0.6, phase: 2, damping: 0.004 },
      { freq: 1, amp: 0.3, phase: 1, damping: 0.008 },
    ],
    duration: 200,
    steps: 4200,
    seed: 'clean',
  }
}

describe('serialize', () => {
  it('round-trips clean values exactly', () => {
    const params = cleanParams()
    const decoded = decodeParams(encodeParams(params))
    expect(decoded).toEqual(params)
  })

  it('produces a URL-safe token', () => {
    const token = encodeParams(createDefaultParams())
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('is stable once re-encoded (idempotent after rounding)', () => {
    const once = decodeParams(encodeParams(createDefaultParams()))!
    expect(decodeParams(encodeParams(once))).toEqual(once)
  })

  it('preserves the seed', () => {
    const decoded = decodeParams(encodeParams({ ...cleanParams(), seed: 'rose-window' }))
    expect(decoded?.seed).toBe('rose-window')
  })

  it('returns null for garbage tokens', () => {
    expect(decodeParams('not-a-real-token!!')).toBeNull()
    expect(decodeParams('')).toBeNull()
  })
})
