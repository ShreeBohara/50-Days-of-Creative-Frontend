import { describe, expect, it } from 'vitest'
import { createDefaultParams } from './defaults'
import { SCHEMA_VERSION } from './harmonograph'

describe('createDefaultParams', () => {
  it('returns the current schema version with two oscillators per axis', () => {
    const p = createDefaultParams()
    expect(p.version).toBe(SCHEMA_VERSION)
    expect(p.x).toHaveLength(2)
    expect(p.y).toHaveLength(2)
  })

  it('returns an independent deep copy each call', () => {
    const a = createDefaultParams()
    const b = createDefaultParams()
    a.x[0].freq = 99
    expect(b.x[0].freq).not.toBe(99)
  })
})
