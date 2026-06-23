import { describe, expect, it } from 'vitest'
import { createDefaultParams } from '../domain/defaults'
import { decodeParams, encodeParams } from '../domain/serialize'
import { buildShareUrl, readShareToken } from './share'

describe('share urls', () => {
  const base = 'https://example.com/pendula/'

  it('embeds the figure in the hash', () => {
    const url = buildShareUrl(createDefaultParams(), base)
    expect(url.startsWith(`${base}#fig=`)).toBe(true)
  })

  it('drops any existing hash on the base', () => {
    const url = buildShareUrl(createDefaultParams(), `${base}#fig=stale`)
    expect(url.match(/#fig=/g)).toHaveLength(1)
  })

  it('reads the token back from a hash', () => {
    const url = buildShareUrl(createDefaultParams(), base)
    const token = readShareToken(url)
    expect(token).toBeTruthy()
    expect(decodeParams(token!)).not.toBeNull()
  })

  it('returns null when no token is present', () => {
    expect(readShareToken('#nothing=here')).toBeNull()
    expect(readShareToken('')).toBeNull()
  })

  it('round-trips a figure through a share link', () => {
    // start from an already-rounded figure so the trip is exact
    const original = decodeParams(encodeParams(createDefaultParams()))!
    const url = buildShareUrl(original, base)
    const restored = decodeParams(readShareToken(url)!)
    expect(restored).toEqual(original)
  })
})
