import { describe, it, expect } from 'vitest'
import { fillDust, fillWhite, mulberry32, roomImpulse } from './buffers.js'

const SR = 16000 // small rate keeps the IR tests quick; the maths is rate-independent

const rms = (a, from, to) => {
  let sum = 0
  for (let i = from; i < to; i += 1) sum += a[i] * a[i]
  return Math.sqrt(sum / Math.max(1, to - from))
}

// mean |first difference| / mean |x| — rises with high-frequency content
const brightness = (a, from, to) => {
  let d = 0
  let m = 0
  for (let i = from + 1; i < to; i += 1) {
    d += Math.abs(a[i] - a[i - 1])
    m += Math.abs(a[i])
  }
  return d / m
}

describe('mulberry32', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    const c = mulberry32(8)
    const sa = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(sa)
    expect([c(), c(), c()]).not.toEqual(sa)
  })

  it('stays in [0, 1)', () => {
    const r = mulberry32(1)
    let lo = 1
    let hi = 0
    for (let i = 0; i < 10000; i += 1) {
      const x = r()
      lo = Math.min(lo, x)
      hi = Math.max(hi, x)
    }
    expect(lo).toBeGreaterThanOrEqual(0)
    expect(hi).toBeLessThan(1)
  })
})

describe('fillWhite', () => {
  it('fills [-1, 1) with roughly zero mean and uniform power (1/3)', () => {
    const out = fillWhite(new Float32Array(48000), mulberry32(3))
    let mean = 0
    let power = 0
    let peak = 0
    for (const x of out) {
      peak = Math.max(peak, Math.abs(x))
      mean += x
      power += x * x
    }
    expect(peak).toBeLessThanOrEqual(1)
    expect(Math.abs(mean / out.length)).toBeLessThan(0.02)
    expect(power / out.length).toBeCloseTo(1 / 3, 1)
  })
})

describe('fillDust', () => {
  it('places about `density` clicks per second', () => {
    const out = new Float32Array(SR * 4)
    const count = fillDust(out, SR, 450, mulberry32(5))
    expect(count / 4).toBeGreaterThan(400)
    expect(count / 4).toBeLessThan(500)
  })

  it('is mostly silence, bounded, and has no DC offset', () => {
    const out = new Float32Array(SR * 2)
    fillDust(out, SR, 450, mulberry32(9))
    let zeros = 0
    let sum = 0
    let peak = 0
    for (const x of out) {
      if (x === 0) zeros += 1
      sum += x
      peak = Math.max(peak, Math.abs(x))
    }
    expect(peak).toBeLessThanOrEqual(1.6)
    expect(zeros / out.length).toBeGreaterThan(0.9)
    // each click is a (+a, −0.6a) doublet, so the sum is 0.4·Σa over random signs
    expect(Math.abs(sum / out.length)).toBeLessThan(0.01)
  })
})

describe('roomImpulse', () => {
  const [L, R] = roomImpulse({ sampleRate: SR, seconds: 1.2 })
  const n = Math.round(SR * 1.2)
  const start = Math.round(SR * 0.006)

  it('is stereo, 1.2 s long and finite', () => {
    expect(L).toBeInstanceOf(Float32Array)
    expect(L.length).toBe(n)
    expect(R.length).toBe(n)
    expect(L.every(Number.isFinite) && R.every(Number.isFinite)).toBe(true)
  })

  it('is silent during the pre-delay', () => {
    expect(L.subarray(0, start).every((x) => x === 0)).toBe(true)
    expect(R.subarray(0, start).every((x) => x === 0)).toBe(true)
  })

  it('is peak-normalised to 0.9', () => {
    let peak = 0
    for (const ch of [L, R]) for (const x of ch) peak = Math.max(peak, Math.abs(x))
    expect(peak).toBeCloseTo(0.9, 5)
  })

  it('decays: the last 100 ms sits > 40 dB under the first 100 ms', () => {
    const w = Math.round(SR * 0.1)
    for (const ch of [L, R]) {
      const head = rms(ch, start, start + w)
      const tail = rms(ch, n - w, n)
      expect(20 * Math.log10(head / tail)).toBeGreaterThan(40)
    }
  })

  it('fades to exactly zero at the end (no truncation click)', () => {
    expect(Math.abs(L[n - 1])).toBe(0)
    expect(Math.abs(R[n - 1])).toBe(0)
  })

  it('keeps left and right decorrelated', () => {
    let lr = 0
    let ll = 0
    let rr = 0
    for (let i = 0; i < n; i += 1) {
      lr += L[i] * R[i]
      ll += L[i] * L[i]
      rr += R[i] * R[i]
    }
    expect(Math.abs(lr / Math.sqrt(ll * rr))).toBeLessThan(0.2)
  })

  it('darkens over time — wood absorbs the highs first', () => {
    const w = Math.round(SR * 0.1)
    const early = brightness(L, start + Math.round(SR * 0.04), start + Math.round(SR * 0.04) + w)
    const late = brightness(L, Math.round(SR * 0.7), Math.round(SR * 0.7) + w)
    expect(late).toBeLessThan(early)
  })

  it('is the same room every time for a seed, and a different one for another', () => {
    const [L2] = roomImpulse({ sampleRate: SR, seconds: 1.2 })
    const [L3] = roomImpulse({ sampleRate: SR, seconds: 1.2, seed: 65 })
    expect(L2).toEqual(L)
    expect(L3).not.toEqual(L)
  })
})
