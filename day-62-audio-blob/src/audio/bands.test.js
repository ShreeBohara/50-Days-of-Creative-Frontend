import { describe, it, expect } from 'vitest'
import {
  BAND_RANGES,
  binRange,
  makeBins,
  bandLevel,
  computeBands,
} from './bands.js'

const SR = 48000
const FFT = 1024
const HZ_PER_BIN = SR / FFT // 46.875

describe('binRange', () => {
  it('maps band edges onto the right bins', () => {
    const [start, end] = binRange(BAND_RANGES.bass, SR, FFT)
    expect(start).toBe(Math.floor(20 / HZ_PER_BIN)) // 0
    expect(end).toBe(Math.ceil(250 / HZ_PER_BIN)) // 6
  })

  it('never exceeds the analyser bin count', () => {
    const [start, end] = binRange([30000, 90000], SR, FFT)
    expect(start).toBeLessThanOrEqual(FFT / 2 - 1)
    expect(end).toBe(FFT / 2 - 1)
  })

  it('keeps start <= end even for degenerate ranges', () => {
    const [start, end] = binRange([100, 90], SR, FFT)
    expect(start).toBeLessThanOrEqual(end)
  })

  it('covers the three bands contiguously (no dead zone between them)', () => {
    const bins = makeBins(SR, FFT)
    // ceil/floor overlap by design: the boundary bin belongs to both
    expect(bins.mid[0]).toBeLessThanOrEqual(bins.bass[1])
    expect(bins.high[0]).toBeLessThanOrEqual(bins.mid[1])
    expect(bins.bass[0]).toBe(0)
  })
})

describe('bandLevel', () => {
  it('is 0 for silence and 1 for a maxed spectrum', () => {
    const silent = new Uint8Array(FFT / 2)
    const maxed = new Uint8Array(FFT / 2).fill(255)
    expect(bandLevel(silent, [0, 10])).toBe(0)
    expect(bandLevel(maxed, [0, 10])).toBe(1)
  })

  it('averages over the inclusive range', () => {
    const data = new Uint8Array(FFT / 2)
    data[2] = 255
    // bins 1..3 → one of three bins maxed → 1/3
    expect(bandLevel(data, [1, 3])).toBeCloseTo(1 / 3, 5)
  })
})

describe('computeBands', () => {
  const bins = makeBins(SR, FFT)

  it('attributes low-bin energy to bass, not high', () => {
    const data = new Uint8Array(FFT / 2)
    for (let i = bins.bass[0]; i <= bins.bass[1]; i += 1) data[i] = 240
    const bands = computeBands(data, bins)
    expect(bands.bass).toBeGreaterThan(0.7)
    expect(bands.high).toBeLessThan(0.1)
  })

  it('attributes high-bin energy to high, not bass', () => {
    const data = new Uint8Array(FFT / 2)
    for (let i = bins.high[0]; i <= bins.high[1]; i += 1) data[i] = 240
    const bands = computeBands(data, bins)
    expect(bands.high).toBeGreaterThan(0.7)
    // the shared boundary bin bleeds a little into mid — bass must stay silent
    expect(bands.bass).toBe(0)
  })

  it('weights loudness toward bass', () => {
    const bassy = new Uint8Array(FFT / 2)
    for (let i = bins.bass[0]; i <= bins.bass[1]; i += 1) bassy[i] = 200
    const trebly = new Uint8Array(FFT / 2)
    for (let i = bins.high[0]; i <= bins.high[1]; i += 1) trebly[i] = 200
    expect(computeBands(bassy, bins).loud).toBeGreaterThan(
      computeBands(trebly, bins).loud,
    )
  })
})
