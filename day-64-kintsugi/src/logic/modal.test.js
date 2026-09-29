import { describe, it, expect } from 'vitest'
import { ringPartials, RATIOS } from './modal.js'

const db = (ratio) => 20 * Math.log10(ratio)

describe('ringPartials', () => {
  it('returns five partials on the fixed ratios', () => {
    const p = ringPartials({ height01: 0.5 })
    expect(p).toHaveLength(5)
    expect(p.map((x) => x.ratio)).toEqual([1, 2.32, 4.25, 6.63, 9.38])
    expect(RATIOS).toEqual(p.map((x) => x.ratio))
    for (const x of p) expect(x.freq).toBeCloseTo(p[0].freq * x.ratio, 9)
  })

  it('pitches the fundamental from 620 Hz at the foot to 940 Hz at the rim', () => {
    expect(ringPartials({ height01: 0 })[0].freq).toBe(620)
    expect(ringPartials({ height01: 1 })[0].freq).toBe(940)
    expect(ringPartials({ height01: 0.5 })[0].freq).toBe(780)
  })

  it('clamps height and treats garbage as the foot', () => {
    expect(ringPartials({ height01: -2 })[0].freq).toBe(620)
    expect(ringPartials({ height01: 7 })[0].freq).toBe(940)
    expect(ringPartials({ height01: NaN })[0].freq).toBe(620)
    expect(ringPartials()[0].freq).toBe(620)
  })

  it('gains fall off as 1/k^0.9', () => {
    const p = ringPartials({ height01: 0.3 })
    p.forEach((x, i) => expect(x.gain).toBeCloseTo(1 / Math.pow(i + 1, 0.9), 12))
    for (let i = 1; i < p.length; i += 1) expect(p[i].gain).toBeLessThan(p[i - 1].gain)
  })

  it('rings ~0.7 s at the foot, ~1.6 s at the rim, shorter up the series', () => {
    expect(ringPartials({ height01: 0 })[0].decay).toBeCloseTo(0.7, 9)
    expect(ringPartials({ height01: 1 })[0].decay).toBeCloseTo(1.6, 9)
    const p = ringPartials({ height01: 1 })
    for (let i = 1; i < p.length; i += 1) expect(p[i].decay).toBeLessThan(p[i - 1].decay)
    expect(p[4].decay).toBeGreaterThan(0.2)
  })

  it('a mended bowl is 4 % flat, less than half as long, top partial -12 dB', () => {
    const fresh = ringPartials({ height01: 0.6 })
    const mended = ringPartials({ height01: 0.6, mended: true })
    mended.forEach((m, i) => {
      expect(m.freq).toBeCloseTo(fresh[i].freq * 0.96, 9)
      expect(m.decay).toBeCloseTo(fresh[i].decay * 0.45, 9)
    })
    expect(db(mended[4].gain / fresh[4].gain)).toBeCloseTo(-12, 9)
    for (let i = 0; i < 4; i += 1) expect(mended[i].gain).toBe(fresh[i].gain)
  })

  it('all values are finite and positive across the bowl', () => {
    for (let h = 0; h <= 1; h += 0.1) {
      for (const mended of [false, true]) {
        for (const x of ringPartials({ height01: h, mended })) {
          for (const v of [x.freq, x.gain, x.decay]) {
            expect(Number.isFinite(v)).toBe(true)
            expect(v).toBeGreaterThan(0)
          }
        }
      }
    }
  })
})
