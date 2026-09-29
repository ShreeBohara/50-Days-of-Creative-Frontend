import { describe, it, expect } from 'vitest'
import {
  CLATTER_FLOOR_DB,
  IMPULSE_GATE,
  IMPULSE_MAX,
  IMPULSE_MIN,
  PITCH_MAX,
  PITCH_MIN,
  PITCH_REF,
  POSITION_LIMIT,
  RateLimiter,
  SIZE_REF,
  bucketKey,
  clampPosition,
  clatterGain,
  clatterPitch,
  distanceGain,
  mapSpeedToFilter,
  pickVoice,
  severityAmount,
  swooshCurve,
  toVec3,
  voiceLevel,
} from './voices.js'

const dB = (g) => 20 * Math.log10(g)

describe('toVec3 / clampPosition', () => {
  it('accepts arrays, typed arrays and {x,y,z} objects', () => {
    expect(toVec3([1, 2, 3])).toEqual([1, 2, 3])
    expect(toVec3(new Float32Array([1, 2, 3]))).toEqual([1, 2, 3])
    expect(toVec3({ x: 1, y: 2, z: 3 })).toEqual([1, 2, 3])
  })

  it('toVec3 rejects anything non-finite or missing', () => {
    expect(toVec3(null)).toBeNull()
    expect(toVec3([1, NaN, 3])).toBeNull()
    expect(toVec3([1, 2])).toBeNull()
    expect(toVec3('1,2,3')).toBeNull()
  })

  it('clamps absurd coordinates into the world box and zeroes NaN', () => {
    expect(clampPosition([1e9, NaN, -1e9])).toEqual([POSITION_LIMIT, 0, -POSITION_LIMIT])
    expect(clampPosition([Infinity, 0.2, -Infinity])).toEqual([0, 0.2, 0])
  })

  it('passes sane positions through untouched, as a fresh array', () => {
    const p = [0.1, 0.05, -0.2]
    const out = clampPosition(p)
    expect(out).toEqual(p)
    expect(out).not.toBe(p)
    expect(clampPosition({ x: 0.3, y: 0, z: 0.1 })).toEqual([0.3, 0, 0.1])
  })

  it('treats missing input as the origin', () => {
    expect(clampPosition(undefined)).toEqual([0, 0, 0])
    expect(clampPosition(42)).toEqual([0, 0, 0])
  })
})

describe('bucketKey', () => {
  it('puts nearby contacts in the same cell and distant ones apart', () => {
    expect(bucketKey([0.101, 0, 0.001])).toBe(bucketKey([0.12, 0.01, 0.02]))
    expect(bucketKey([0.1, 0, 0])).not.toBe(bucketKey([0.2, 0, 0]))
  })

  it('handles negative coordinates without folding them onto positive cells', () => {
    expect(bucketKey([-0.01, 0, 0])).not.toBe(bucketKey([0.01, 0, 0]))
  })

  it('respects a custom cell size', () => {
    expect(bucketKey([0.1, 0, 0], 1)).toBe(bucketKey([0.9, 0, 0], 1))
  })
})

describe('distanceGain', () => {
  it('is unity inside the reference distance', () => {
    expect(distanceGain([0, 0, 0], [0.1, 0, 0])).toBe(1)
    expect(distanceGain([0, 0, 0], [0, 0, 0])).toBe(1)
  })

  it('follows the inverse model: halves at twice the reference distance', () => {
    expect(distanceGain([0, 0, 0], [0.7, 0, 0])).toBeCloseTo(0.5, 10)
    expect(distanceGain([0, 0, 0], [0, 0, 1.4])).toBeCloseTo(0.25, 10)
  })
})

describe('voiceLevel', () => {
  it('is the full gain at the start and −80 dB at the end', () => {
    const v = { start: 1, end: 2, gain: 0.5 }
    expect(voiceLevel(v, 1)).toBeCloseTo(0.5, 10)
    expect(dB(voiceLevel(v, 1.999999) / 0.5)).toBeCloseTo(-80, 2)
    expect(voiceLevel(v, 2)).toBe(0)
  })

  it('falls linearly in dB (exponential decay)', () => {
    const v = { start: 0, end: 4, gain: 1 }
    expect(dB(voiceLevel(v, 1))).toBeCloseTo(-20, 6)
    expect(dB(voiceLevel(v, 2))).toBeCloseTo(-40, 6)
  })

  it('counts a voice scheduled in the future at full strength', () => {
    expect(voiceLevel({ start: 5, end: 6, gain: 0.3 }, 4.9)).toBeCloseTo(0.3, 10)
  })

  it('treats a held voice (end = Infinity) as not decaying', () => {
    expect(voiceLevel({ start: 0, end: Infinity, gain: 0.2 }, 100)).toBeCloseTo(0.2, 10)
  })

  it('defaults a missing gain to 1 and clamps negative gains to 0', () => {
    expect(voiceLevel({ start: 0, end: 1 }, 0)).toBe(1)
    expect(voiceLevel({ start: 0, end: 1, gain: -2 }, 0)).toBe(0)
  })
})

describe('pickVoice', () => {
  it('returns -1 for an empty pool', () => {
    expect(pickVoice([], 0)).toBe(-1)
  })

  it('takes the first empty slot', () => {
    const busy = { start: 0, end: 10, gain: 1 }
    expect(pickVoice([busy, null, busy, undefined], 1)).toBe(1)
  })

  it('treats a voice that has already ended as free', () => {
    const pool = [
      { start: 0, end: 10, gain: 1 },
      { start: 0, end: 0.5, gain: 1 },
      { start: 0, end: 10, gain: 1 },
    ]
    expect(pickVoice(pool, 1)).toBe(1)
    // exactly at its end time counts as finished too
    expect(pickVoice(pool, 0.5)).toBe(1)
  })

  it('when every slot is busy, steals the quietest', () => {
    const pool = [
      { start: 0, end: 2, gain: 0.8 },
      { start: 0, end: 2, gain: 0.1 },
      { start: 0, end: 2, gain: 0.5 },
    ]
    expect(pickVoice(pool, 0.1)).toBe(1)
  })

  it('with equal gains, steals the voice furthest into its decay', () => {
    const pool = [
      { start: 0, end: 2, gain: 0.5 }, // 25 % through at t=0.5
      { start: 0, end: 0.6, gain: 0.5 }, // 83 % through
      { start: 0.4, end: 3, gain: 0.5 }, // just started
    ]
    expect(pickVoice(pool, 0.5)).toBe(1)
  })

  it('prefers a loud tail that is nearly done over a quiet voice just starting', () => {
    const pool = [
      { start: 0.85, end: 1.5, gain: 0.1 }, // quiet but fresh
      { start: 0, end: 1, gain: 1 }, // loud but 90 % gone (−72 dB)
    ]
    expect(pickVoice(pool, 0.9)).toBe(1)
  })

  it('does not steal a held loop while a decaying voice is available', () => {
    const pool = [
      { start: 0, end: Infinity, gain: 0.05 },
      { start: 0, end: 1, gain: 0.5 },
    ]
    expect(pickVoice(pool, 0.5)).toBe(1)
  })

  it('breaks exact ties by the earliest end time', () => {
    const pool = [
      { start: 0, end: 5, gain: 0 },
      { start: 0, end: 3, gain: 0 },
      { start: 0, end: 4, gain: 0 },
    ]
    expect(pickVoice(pool, 1)).toBe(1)
  })

  it('still returns a valid index when levels are not comparable', () => {
    // NaN gains read as loud (1); an all-Infinity pool used to fall through to -1
    expect(voiceLevel({ start: 0, end: 2, gain: NaN }, 0)).toBe(1)
    expect(pickVoice([{ start: 0, end: 2, gain: NaN }, { start: 0, end: 2, gain: 0.1 }], 1)).toBe(1)
    expect(pickVoice([{ start: 0, end: Infinity, gain: Infinity }, { start: 0, end: Infinity, gain: Infinity }], 1)).toBe(0)
  })

  it('does not mutate the pool', () => {
    const pool = [{ start: 0, end: 2, gain: 0.3 }, null]
    const snapshot = JSON.stringify(pool)
    pickVoice(pool, 1)
    expect(JSON.stringify(pool)).toBe(snapshot)
  })

  it('always returns a valid index for a full pool', () => {
    const pool = Array.from({ length: 12 }, (_, i) => ({ start: i * 0.01, end: 1 + i * 0.1, gain: 0.2 + (i % 3) * 0.1 }))
    for (let t = 0; t < 1; t += 0.05) {
      const i = pickVoice(pool, t)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(pool.length)
    }
  })
})

describe('clatterGain', () => {
  it('is silent for resting jitter and garbage input', () => {
    expect(clatterGain(0)).toBe(0)
    expect(clatterGain(IMPULSE_GATE * 0.99)).toBe(0)
    expect(clatterGain(-1)).toBe(0)
    expect(clatterGain(NaN)).toBe(0)
    expect(clatterGain(undefined)).toBe(0)
  })

  it('spans the floor at the lightest tick to 0 dB at a hard landing', () => {
    expect(dB(clatterGain(IMPULSE_MIN))).toBeCloseTo(CLATTER_FLOOR_DB, 6)
    expect(clatterGain(IMPULSE_MAX)).toBeCloseTo(1, 10)
  })

  it('holds the floor between the gate and the minimum', () => {
    expect(dB(clatterGain((IMPULSE_GATE + IMPULSE_MIN) / 2))).toBeCloseTo(CLATTER_FLOOR_DB, 6)
  })

  it('saturates above the maximum instead of blowing up', () => {
    expect(clatterGain(5)).toBe(1)
    expect(clatterGain(Infinity)).toBe(1)
  })

  it('is log-mapped: each decade of impulse adds the same dB', () => {
    const step1 = dB(clatterGain(0.01)) - dB(clatterGain(0.001))
    const step2 = dB(clatterGain(0.1)) - dB(clatterGain(0.01))
    expect(step1).toBeGreaterThan(0)
    expect(step1).toBeCloseTo(step2, 6)
  })

  it('is monotonic across the typical range', () => {
    let prev = 0
    for (let i = IMPULSE_MIN; i <= IMPULSE_MAX; i *= 1.3) {
      const g = clatterGain(i)
      expect(g).toBeGreaterThanOrEqual(prev)
      prev = g
    }
  })
})

describe('clatterPitch', () => {
  it('anchors the reference size to the reference pitch', () => {
    expect(clatterPitch(SIZE_REF)).toBeCloseTo(PITCH_REF, 6)
  })

  it('rises as shards get smaller', () => {
    expect(clatterPitch(0.02)).toBeGreaterThan(clatterPitch(0.04))
    expect(clatterPitch(0.04)).toBeGreaterThan(clatterPitch(0.1))
  })

  it('stays inside the audible design range for any size', () => {
    for (const s of [0.0001, 0.003, 0.01, 0.05, 0.2, 3, 1e6]) {
      const f = clatterPitch(s)
      expect(f).toBeGreaterThanOrEqual(PITCH_MIN)
      expect(f).toBeLessThanOrEqual(PITCH_MAX)
    }
  })

  it('falls back to the reference size for missing or invalid sizes', () => {
    expect(clatterPitch(undefined)).toBeCloseTo(PITCH_REF, 6)
    expect(clatterPitch(-1)).toBeCloseTo(PITCH_REF, 6)
    expect(clatterPitch(NaN)).toBeCloseTo(PITCH_REF, 6)
  })
})

describe('severityAmount', () => {
  it('maps the severity buckets in order, fling loudest', () => {
    const order = ['set', 'hairline', 'drop', 'fling'].map(severityAmount)
    for (let i = 1; i < order.length; i += 1) expect(order[i]).toBeGreaterThan(order[i - 1])
    expect(severityAmount('fling')).toBe(1)
  })

  it('clamps numbers to 0..1 and falls back for junk', () => {
    expect(severityAmount(0.3)).toBe(0.3)
    expect(severityAmount(7)).toBe(1)
    expect(severityAmount(-1)).toBe(0)
    expect(severityAmount(NaN)).toBe(severityAmount('drop'))
    expect(severityAmount('???')).toBe(severityAmount('drop'))
  })
})

describe('mapSpeedToFilter', () => {
  it('is closed and silent at rest, fully open at full speed', () => {
    expect(mapSpeedToFilter(0)).toEqual({ freq: 900, gain: 0 })
    const top = mapSpeedToFilter(1)
    expect(top.freq).toBeCloseTo(5200, 6)
    expect(top.gain).toBeCloseTo(1, 10)
  })

  it('moves the cutoff on a log scale (geometric mean at half speed)', () => {
    expect(mapSpeedToFilter(0.5).freq).toBeCloseTo(Math.sqrt(900 * 5200), 6)
  })

  it('makes slow strokes audible with the default concave curve', () => {
    expect(mapSpeedToFilter(0.2).gain).toBeGreaterThan(0.2)
  })

  it('holds a layer back with a convex curve', () => {
    expect(mapSpeedToFilter(0.2, { curve: 1.4 }).gain).toBeLessThan(0.2)
  })

  it('clamps speed and treats NaN as rest', () => {
    expect(mapSpeedToFilter(3)).toEqual(mapSpeedToFilter(1))
    expect(mapSpeedToFilter(-2)).toEqual(mapSpeedToFilter(0))
    expect(mapSpeedToFilter(NaN)).toEqual(mapSpeedToFilter(0))
  })

  it('is monotonic in both outputs', () => {
    let prev = mapSpeedToFilter(0)
    for (let s = 0.05; s <= 1; s += 0.05) {
      const cur = mapSpeedToFilter(s)
      expect(cur.freq).toBeGreaterThan(prev.freq)
      expect(cur.gain).toBeGreaterThan(prev.gain)
      prev = cur
    }
  })

  it('honours a custom range', () => {
    const r = { minHz: 480, maxHz: 1250, maxGain: 0.03, curve: 1 }
    expect(mapSpeedToFilter(0, r).freq).toBeCloseTo(480, 6)
    expect(mapSpeedToFilter(1, r).freq).toBeCloseTo(1250, 6)
    expect(mapSpeedToFilter(0.5, r).gain).toBeCloseTo(0.015, 10)
  })
})

describe('swooshCurve', () => {
  it('starts and ends at exactly zero', () => {
    const c = swooshCurve(48, 0.36, 1.4, 0.3)
    expect(c[0]).toBe(0)
    expect(c[c.length - 1]).toBe(0)
  })

  it('peaks at the requested fraction with the requested scale', () => {
    const n = 101
    const c = swooshCurve(n, 0.3, 1.5, 0.5)
    let peak = 0
    for (let i = 1; i < n; i += 1) if (c[i] > c[peak]) peak = i
    expect(peak / (n - 1)).toBeCloseTo(0.3, 1)
    expect(c[peak]).toBeCloseTo(0.5, 2)
  })

  it('never goes negative or above the scale', () => {
    for (const v of swooshCurve(64, 0.5, 0.5, 0.08)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(0.08 + 1e-9)
    }
  })

  it('always has at least three points and is a Float32Array', () => {
    const c = swooshCurve(1)
    expect(c).toBeInstanceOf(Float32Array)
    expect(c.length).toBe(3)
  })
})

describe('RateLimiter', () => {
  it('lets `max` through inside one window and rejects the next', () => {
    const rl = new RateLimiter({ max: 40, window: 1 })
    let ok = 0
    for (let i = 0; i < 50; i += 1) if (rl.tryAcquire(i * 0.001)) ok += 1
    expect(ok).toBe(40)
  })

  it('slides: capacity returns as the oldest acquisitions age out', () => {
    const rl = new RateLimiter({ max: 3, window: 1 })
    expect(rl.tryAcquire(0)).toBe(true)
    expect(rl.tryAcquire(0.2)).toBe(true)
    expect(rl.tryAcquire(0.4)).toBe(true)
    expect(rl.tryAcquire(0.9)).toBe(false)
    expect(rl.tryAcquire(1.0)).toBe(true) // the t=0 one has aged out
    expect(rl.tryAcquire(1.1)).toBe(false) // t=0.2 is still inside
    expect(rl.tryAcquire(1.25)).toBe(true)
  })

  it('never exceeds max in any window under a sustained flood', () => {
    const rl = new RateLimiter({ max: 40, window: 1 })
    const accepted = []
    for (let i = 0; i < 5000; i += 1) {
      const t = i * 0.001
      if (rl.tryAcquire(t, `k${i}`)) accepted.push(t)
    }
    for (let i = 40; i < accepted.length; i += 1) {
      expect(accepted[i] - accepted[i - 40]).toBeGreaterThanOrEqual(1 - 1e-9)
    }
    // ~40 per second over 5 s
    expect(accepted.length).toBeGreaterThanOrEqual(195)
    expect(accepted.length).toBeLessThanOrEqual(240)
  })

  it('enforces the per-key minimum interval', () => {
    const rl = new RateLimiter({ max: 40, window: 1, keyInterval: 0.035 })
    expect(rl.tryAcquire(0, 'a')).toBe(true)
    expect(rl.tryAcquire(0.02, 'a')).toBe(false)
    expect(rl.tryAcquire(0.02, 'b')).toBe(true)
    expect(rl.tryAcquire(0.035, 'a')).toBe(true)
  })

  it('does not spend budget on rejected calls', () => {
    const rl = new RateLimiter({ max: 2, window: 1, keyInterval: 0.1 })
    expect(rl.tryAcquire(0, 'a')).toBe(true)
    expect(rl.tryAcquire(0.01, 'a')).toBe(false) // key-blocked: no global slot used
    expect(rl.tryAcquire(0.02, 'b')).toBe(true)
    expect(rl.tryAcquire(0.03, 'c')).toBe(false) // global full: 'c' not recorded
    expect(rl.tryAcquire(1.0, 'c')).toBe(true)
  })

  it('applies only the global limit when no key is given', () => {
    const rl = new RateLimiter({ max: 10, window: 1, keyInterval: 0.5 })
    expect(rl.tryAcquire(0)).toBe(true)
    expect(rl.tryAcquire(0)).toBe(true)
  })

  it('rejects a non-finite clock', () => {
    const rl = new RateLimiter()
    expect(rl.tryAcquire(NaN, 'a')).toBe(false)
    expect(rl.tryAcquire(Infinity)).toBe(false)
  })

  it('prunes lapsed keys instead of growing without bound', () => {
    const rl = new RateLimiter({ max: 1e6, window: 1, keyInterval: 0.035, maxKeys: 64 })
    for (let i = 0; i < 1000; i += 1) rl.tryAcquire(i * 0.05, `cell${i}`)
    expect(rl.keyCount).toBeLessThanOrEqual(64)
  })

  it('reset() forgets everything', () => {
    const rl = new RateLimiter({ max: 1, window: 1, keyInterval: 1 })
    rl.tryAcquire(0, 'a')
    expect(rl.tryAcquire(0.1, 'b')).toBe(false)
    rl.reset()
    expect(rl.tryAcquire(0.1, 'a')).toBe(true)
  })
})
