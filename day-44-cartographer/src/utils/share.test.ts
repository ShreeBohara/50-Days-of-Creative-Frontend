import { describe, expect, it } from 'vitest'
import { decodeParams } from '../domain/serialize'
import { createDefaultParams } from '../domain/defaults'
import { buildShareUrl, readShareToken } from './share'

describe('share links', () => {
  it('builds a hash URL that decodes back to the world', () => {
    const params = createDefaultParams()
    const url = buildShareUrl(params, 'https://example.com/app/')
    expect(url.startsWith('https://example.com/app/#map=')).toBe(true)
    const token = readShareToken(url)
    expect(token).not.toBeNull()
    expect(decodeParams(token!)).toEqual(params)
  })

  it('strips any existing hash from the base', () => {
    const url = buildShareUrl(createDefaultParams(), 'https://x.com/#map=stale')
    expect(url.indexOf('#map=')).toBe(url.lastIndexOf('#map='))
  })

  it('reads a token from a bare hash and returns null when absent', () => {
    expect(readShareToken('#map=abc123')).toBe('abc123')
    expect(readShareToken('#other=1&map=xyz')).toBe('xyz')
    expect(readShareToken('#nothing')).toBeNull()
  })
})
