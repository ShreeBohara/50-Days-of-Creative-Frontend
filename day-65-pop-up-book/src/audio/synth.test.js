import { describe, it, expect } from 'vitest'
import {
  DUST_DENSITY,
  FRICTION_GATE,
  MinGap,
  PAN_WIDTH,
  POP,
  RECORD,
  SAMPLE_SECONDS,
  TAIL,
  TAIL_DB,
  TURN,
  bellLine,
  clamp01,
  clickNorm,
  creakPath,
  dbToGain,
  envelopeLength,
  fillDust,
  fillVinyl,
  fillWhite,
  frictionDrive,
  jitter,
  landLevel,
  logLerp,
  makeSamples,
  midiHz,
  mulberry32,
  pencilScratch,
  pickVoice,
  popParams,
  popSlot,
  recordChordAt,
  recordEventsBetween,
  recordGridTime,
  recordLoopSeconds,
  recordNotes,
  recordStepSeconds,
  roomImpulse,
  slideHiss,
  swooshCurve,
  toPan,
  turnDrive,
  turnWhoosh,
  unit,
  voiceLevel,
} from './synth.js'

const SR = 16000 // small rate keeps the buffer tests quick; the maths is rate-independent

const rms = (a, from = 0, to = a.length) => {
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

// a fixed sequence, for exact jitter checks
const seq = (...xs) => {
  let i = 0
  return () => xs[i++ % xs.length]
}

// ------------------------------------------------------------

describe('small helpers', () => {
  it('clamp01 and unit turn junk into something safe', () => {
    expect(clamp01(NaN)).toBe(0)
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(7)).toBe(1)
    expect(unit(undefined, 0.4)).toBe(0.4)
    expect(unit('loud', 0.4)).toBe(0.4)
    expect(unit(Infinity, 0.4)).toBe(0.4)
    expect(unit(0.25)).toBe(0.25)
    expect(unit(3)).toBe(1)
  })

  it('midiHz: A4 is 440 and an octave doubles', () => {
    expect(midiHz(69)).toBeCloseTo(440, 9)
    expect(midiHz(81)).toBeCloseTo(880, 9)
    expect(midiHz(60)).toBeCloseTo(261.626, 3)
  })

  it('dbToGain / logLerp', () => {
    expect(dbToGain(-20)).toBeCloseTo(0.1, 12)
    expect(dbToGain(0)).toBe(1)
    expect(logLerp(100, 1600, 0.5)).toBeCloseTo(400, 9) // geometric midpoint
    expect(logLerp(100, 1600, -1)).toBe(100)
    expect(logLerp(100, 1600, 2)).toBeCloseTo(1600, 9)
  })

  it('jitter stays within ±amount', () => {
    expect(jitter(() => 0, 0.1)).toBeCloseTo(0.9, 12)
    expect(jitter(() => 0.5, 0.1)).toBe(1)
    expect(jitter(() => 0.999999, 0.1)).toBeCloseTo(1.1, 5)
  })

  it('toPan narrows the stage and centres anything non-finite', () => {
    expect(toPan(1)).toBeCloseTo(PAN_WIDTH, 12)
    expect(toPan(-1)).toBeCloseTo(-PAN_WIDTH, 12)
    expect(toPan(-9)).toBeCloseTo(-PAN_WIDTH, 12)
    expect(toPan(NaN)).toBe(0)
    expect(toPan(undefined)).toBe(0)
    expect(toPan('left')).toBe(0)
    expect(toPan(0.5, 1)).toBe(0.5)
  })

  it('envelopeLength: attack plus TAIL time constants (−80 dB)', () => {
    expect(TAIL).toBeCloseTo((TAIL_DB / 20) * Math.LN10, 12)
    expect(envelopeLength(0.01, 0.1)).toBeCloseTo(0.01 + 0.1 * TAIL, 12)
    expect(envelopeLength(-1, -1)).toBe(0)
  })
})

describe('sample data', () => {
  it('mulberry32 is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    const c = mulberry32(8)
    const sa = [a(), a(), a()]
    expect([b(), b(), b()]).toEqual(sa)
    expect([c(), c(), c()]).not.toEqual(sa)
    let lo = 1
    let hi = 0
    for (let i = 0; i < 5000; i += 1) {
      const x = a()
      lo = Math.min(lo, x)
      hi = Math.max(hi, x)
    }
    expect(lo).toBeGreaterThanOrEqual(0)
    expect(hi).toBeLessThan(1)
  })

  it('fillWhite: [-1, 1), zero mean, power 1/3', () => {
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

  it('fillDust: about `density` clicks a second, mostly silence, no DC', () => {
    const out = new Float32Array(SR * 4)
    const count = fillDust(out, SR, 450, mulberry32(5))
    expect(count / 4).toBeGreaterThan(400)
    expect(count / 4).toBeLessThan(500)
    let zeros = 0
    let sum = 0
    for (const x of out) {
      if (x === 0) zeros += 1
      sum += x
    }
    expect(zeros / out.length).toBeGreaterThan(0.9)
    expect(Math.abs(sum / out.length)).toBeLessThan(0.01)
  })

  it('fillDust scales its clicks', () => {
    const loud = new Float32Array(SR)
    const soft = new Float32Array(SR)
    fillDust(loud, SR, 200, mulberry32(11))
    fillDust(soft, SR, 200, mulberry32(11), 0.1)
    expect(rms(soft) / rms(loud)).toBeCloseTo(0.1, 2)
  })

  it('fillVinyl: a quiet, sparse surface with the odd louder pop', () => {
    const out = fillVinyl(new Float32Array(SR * 6), SR, mulberry32(2))
    let zeros = 0
    let peak = 0
    for (const x of out) {
      if (x === 0) zeros += 1
      peak = Math.max(peak, Math.abs(x))
    }
    expect(zeros / out.length).toBeGreaterThan(0.9)
    expect(rms(out)).toBeLessThan(0.05)
    expect(peak).toBeGreaterThan(0.3)
    expect(peak).toBeLessThanOrEqual(1.6)
  })

  it('makeSamples: every buffer at its length, seeded, and a unit impulse', () => {
    const s = makeSamples(SR)
    expect(s.noise.length).toBe(SR * SAMPLE_SECONDS.noise)
    expect(s.dust.length).toBe(SR * SAMPLE_SECONDS.dust)
    expect(s.vinyl.length).toBe(SR * SAMPLE_SECONDS.vinyl)
    expect(s.impulse.length).toBe(Math.round(SR * SAMPLE_SECONDS.impulse))
    expect(s.impulse[0]).toBe(1)
    expect(s.impulse.subarray(1).every((x) => x === 0)).toBe(true)
    for (const b of [s.noise, s.dust, s.vinyl]) expect(b.every(Number.isFinite)).toBe(true)
    // dust density is what it says
    let clicks = 0
    for (let i = 0; i < s.dust.length; i += 1) if (s.dust[i] !== 0 && (i === 0 || s.dust[i - 1] === 0 || Math.abs(s.dust[i]) > 0.9 * Math.abs(s.dust[i - 1]))) clicks += 1
    expect(clicks / SAMPLE_SECONDS.dust).toBeGreaterThan(DUST_DENSITY * 0.7)
    // same paper every session
    expect(makeSamples(SR).noise).toEqual(s.noise)
    expect(makeSamples(SR, 1).noise).not.toEqual(s.noise)
  })

  it('clickNorm: an impulse through the band-pass rings at ~1', () => {
    // run Web Audio's (RBJ, 0 dB peak) band-pass over a unit impulse
    const ring = (f, Q, sr) => {
      const w = (2 * Math.PI * f) / sr
      const a = Math.sin(w) / (2 * Q)
      const a0 = 1 + a
      const b0 = a / a0
      const b2 = -a / a0
      const a1 = (-2 * Math.cos(w)) / a0
      const a2 = (1 - a) / a0
      let x1 = 0
      let x2 = 0
      let y1 = 0
      let y2 = 0
      let peak = 0
      const g = clickNorm(f, Q, sr)
      for (let n = 0; n < sr * 0.05; n += 1) {
        const x = n === 0 ? g : 0
        const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1
        x1 = x
        y2 = y1
        y1 = y
        peak = Math.max(peak, Math.abs(y))
      }
      return peak
    }
    for (const [f, Q] of [
      [620, 4],
      [2600, 1.1],
      [110, 1.1],
      [1400, 4.5],
    ]) {
      for (const sr of [44100, 48000]) expect(ring(f, Q, sr)).toBeGreaterThan(0.8)
      for (const sr of [44100, 48000]) expect(ring(f, Q, sr)).toBeLessThan(1.25)
    }
  })
})

describe('roomImpulse', () => {
  const [L, R] = roomImpulse({ sampleRate: SR })
  const n = Math.round(SR * 0.7)
  const start = Math.round(SR * 0.003)

  it('is a stereo, finite 0.7 s room with a silent pre-delay', () => {
    expect(L.length).toBe(n)
    expect(R.length).toBe(n)
    expect(L.every(Number.isFinite) && R.every(Number.isFinite)).toBe(true)
    expect(L.subarray(0, start).every((x) => x === 0)).toBe(true)
  })

  it('is peak-normalised to 0.9 and fades to exactly zero', () => {
    let peak = 0
    for (const ch of [L, R]) for (const x of ch) peak = Math.max(peak, Math.abs(x))
    expect(peak).toBeCloseTo(0.9, 5)
    expect(L[n - 1]).toBe(0)
    expect(R[n - 1]).toBe(0)
  })

  it('is small and dry: the last 100 ms sits > 40 dB under the first', () => {
    const w = Math.round(SR * 0.1)
    for (const ch of [L, R]) {
      expect(20 * Math.log10(rms(ch, start, start + w) / rms(ch, n - w, n))).toBeGreaterThan(40)
    }
  })

  it('keeps left and right decorrelated, and darkens as it decays', () => {
    let lr = 0
    let ll = 0
    let rr = 0
    for (let i = 0; i < n; i += 1) {
      lr += L[i] * R[i]
      ll += L[i] * L[i]
      rr += R[i] * R[i]
    }
    expect(Math.abs(lr / Math.sqrt(ll * rr))).toBeLessThan(0.2)
    const w = Math.round(SR * 0.08)
    const early = brightness(L, start + Math.round(SR * 0.03), start + Math.round(SR * 0.03) + w)
    const late = brightness(L, Math.round(SR * 0.45), Math.round(SR * 0.45) + w)
    expect(late).toBeLessThan(early)
  })
})

describe('envelopes and voices', () => {
  it('swooshCurve starts and ends at 0 and peaks where asked', () => {
    const c = swooshCurve(101, 0.3, 1.5, 0.5)
    expect(c[0]).toBe(0)
    expect(c[100]).toBe(0)
    const peakAt = c.indexOf(Math.max(...c)) / 100
    expect(peakAt).toBeCloseTo(0.3, 1)
    expect(Math.max(...c)).toBeCloseTo(0.5, 2)
    expect(swooshCurve(1).length).toBe(3)
  })

  it('voiceLevel decays from gain to −80 dB across the voice', () => {
    const v = { start: 0, end: 1, gain: 0.5 }
    expect(voiceLevel(v, 0)).toBeCloseTo(0.5, 12)
    expect(voiceLevel(v, 0.5)).toBeCloseTo(0.5 * 1e-2, 12)
    expect(voiceLevel(v, 1)).toBe(0)
    expect(voiceLevel({ start: 2, end: 3, gain: 0.3 }, 1)).toBeCloseTo(0.3, 12) // not started yet
  })

  it('pickVoice: finished first, else quietest, ties to the earliest end', () => {
    expect(pickVoice([], 0)).toBe(-1)
    expect(pickVoice([{ start: 0, end: 5, gain: 1 }, null], 1)).toBe(1)
    expect(pickVoice([{ start: 0, end: 5, gain: 1 }, { start: 0, end: 0.5, gain: 1 }], 1)).toBe(1)
    expect(pickVoice([{ start: 0, end: 2, gain: 1 }, { start: 0, end: 2, gain: 0.1 }], 0.5)).toBe(1)
    expect(pickVoice([{ start: 0, end: 3, gain: 1 }, { start: 0, end: 2, gain: 1 }], 0)).toBe(1)
  })

  it('MinGap spaces each kind on its own, and a clock that restarts never blocks', () => {
    const g = new MinGap({ tick: 0.02, cover: 0.2 })
    expect(g.allow('tick', 1)).toBe(true)
    expect(g.allow('tick', 1.01)).toBe(false)
    expect(g.allow('cover', 1.01)).toBe(true) // other kinds unaffected
    expect(g.allow('tick', 1.021)).toBe(true)
    expect(g.allow('tick', 0)).toBe(true) // new context: time went backwards
    expect(g.allow('tick', NaN)).toBe(false)
    expect(g.allow('unlisted', 0)).toBe(true)
    expect(g.allow('unlisted', 0)).toBe(true)
    g.reset()
    expect(g.allow('cover', 1.02)).toBe(true)
  })
})

describe('page turn maps', () => {
  it('turnDrive is silent at rest, rises monotonically, and saturates below 1', () => {
    expect(turnDrive(0)).toBe(0)
    expect(turnDrive(TURN.gate)).toBe(0)
    expect(turnDrive(NaN)).toBe(0)
    expect(turnDrive(undefined)).toBe(0)
    let prev = 0
    for (let v = 0.2; v <= 12; v += 0.2) {
      const s = turnDrive(v)
      expect(s).toBeGreaterThan(prev)
      expect(s).toBeLessThan(1)
      prev = s
    }
    expect(turnDrive(-6)).toBe(turnDrive(6)) // direction doesn't matter
    expect(turnDrive(2)).toBeGreaterThan(0.25)
    expect(turnDrive(2)).toBeLessThan(0.5)
    expect(turnDrive(12)).toBeGreaterThan(0.9)
  })

  it('turnWhoosh: faster is louder and brighter; just past the gate is near silence (no step)', () => {
    const slow = turnWhoosh(1.5)
    const fast = { ...turnWhoosh(8) }
    expect(fast.gain).toBeGreaterThan(slow.gain)
    expect(fast.freq).toBeGreaterThan(slow.freq)
    expect(fast.air).toBeGreaterThan(slow.air)
    expect(fast.grit).toBeGreaterThan(slow.grit)
    const edge = turnWhoosh(TURN.gate + 1e-3)
    expect(edge.gain).toBeLessThan(1e-3)
    const still = turnWhoosh(0)
    expect(still).toMatchObject({ s: 0, gain: 0, air: 0, grit: 0, freq: TURN.minHz })
    expect(fast.freq).toBeLessThanOrEqual(TURN.maxHz)
    expect(fast.gain).toBeLessThanOrEqual(TURN.maxGain)
  })

  it('turnWhoosh reuses the caller’s object', () => {
    const o = {}
    expect(turnWhoosh(3, undefined, o)).toBe(o)
    expect(o.s).toBeGreaterThan(0)
  })

  it('landLevel: harder is louder and brighter, with a soft floor', () => {
    const soft = landLevel(0)
    const hard = landLevel(1)
    expect(hard.gain).toBe(1)
    expect(soft.gain).toBeCloseTo(dbToGain(-12), 12)
    expect(hard.bright).toBeGreaterThan(soft.bright)
    expect(landLevel(NaN).s).toBe(0.6)
    expect(landLevel(5).s).toBe(1)
  })
})

describe('friction maps (pull-tab, pencil)', () => {
  it('frictionDrive is silent at rest and reaches 1 at full speed without a step', () => {
    expect(frictionDrive(0)).toBe(0)
    expect(frictionDrive(FRICTION_GATE)).toBe(0)
    expect(frictionDrive(FRICTION_GATE + 1e-4)).toBeLessThan(1e-3)
    expect(frictionDrive(1)).toBe(1)
    expect(frictionDrive(NaN)).toBe(0)
  })

  for (const [name, map] of [
    ['slideHiss', slideHiss],
    ['pencilScratch', pencilScratch],
  ]) {
    it(`${name}: silent at rest; level, band and grit rise with speed`, () => {
      expect(map(0)).toMatchObject({ s: 0, gain: 0, grit: 0, body: 0 })
      let prev = map(0.05)
      for (let v = 0.1; v <= 1; v += 0.1) {
        const p = map(v)
        expect(p.gain).toBeGreaterThan(prev.gain)
        expect(p.freq).toBeGreaterThan(prev.freq)
        expect(p.grit).toBeGreaterThan(prev.grit)
        expect(p.rate).toBeGreaterThan(prev.rate)
        prev = p
      }
      for (const k of ['gain', 'freq', 'grit', 'rate', 'body']) expect(Number.isFinite(map(0.7)[k])).toBe(true)
    })
  }

  it('the pencil is brighter than the pull-tab', () => {
    expect(pencilScratch(0.5).freq).toBeGreaterThan(slideHiss(0.5).freq)
  })
})

describe('pop-ups', () => {
  it('bigger cards are lower, longer and fuller', () => {
    const mid = () => 0.5 // nominal: no jitter
    const small = popParams(0, mid)
    const big = popParams(1, mid)
    expect(big.freq).toBeLessThan(small.freq)
    expect(big.bodyHz).toBeLessThan(small.bodyHz)
    expect(big.snapHz).toBeLessThan(small.snapHz)
    expect(big.dur).toBeGreaterThan(small.dur)
    expect(big.gain).toBeGreaterThan(small.gain)
    expect(small.freq).toBeCloseTo(POP.maxHz, 6)
    expect(big.freq).toBeCloseTo(POP.minHz, 6)
  })

  it('jitter is bounded and the snap lands near the end of the swing', () => {
    for (const r of [0, 0.999]) {
      const p = popParams(0.5, () => r)
      const nominal = popParams(0.5, () => 0.5)
      expect(p.freq / nominal.freq).toBeGreaterThan(0.91)
      expect(p.freq / nominal.freq).toBeLessThan(1.09)
      expect(20 * Math.log10(p.gain / nominal.gain)).toBeLessThanOrEqual(1.5 + 1e-9)
      expect(20 * Math.log10(p.gain / nominal.gain)).toBeGreaterThanOrEqual(-1.5 - 1e-9)
      expect(p.snapAt).toBeGreaterThan(p.dur * 0.8)
      expect(p.snapAt).toBeLessThan(p.dur)
    }
  })

  it('two calls never come out identical, and junk size reads as medium', () => {
    const a = popParams(0.5)
    const b = popParams(0.5)
    expect(a.freq).not.toBe(b.freq)
    expect(popParams(undefined, () => 0.5)).toEqual(popParams(0.5, () => 0.5))
  })

  it('popSlot: a lone pop goes now; a burst ripples out, then drops', () => {
    const r = seq(0.5)
    expect(popSlot(10, -Infinity, () => 0)).toBe(10)
    // the last pop was long ago: no delay beyond the slop
    expect(popSlot(10, 9, () => 0)).toBe(10)
    // six requests in the same instant
    let last = -Infinity
    const starts = []
    for (let i = 0; i < 20; i += 1) {
      const at = popSlot(10, last, r)
      if (at < 0) continue
      starts.push(at)
      last = at
    }
    expect(starts.length).toBeGreaterThan(5)
    expect(starts.length).toBeLessThan(12)
    for (let i = 1; i < starts.length; i += 1) {
      const gap = starts[i] - starts[i - 1]
      expect(gap).toBeGreaterThanOrEqual(POP.gap)
      expect(gap).toBeLessThanOrEqual(POP.gap + POP.spread)
    }
    expect(starts[starts.length - 1] - 10).toBeLessThanOrEqual(POP.maxAhead)
    expect(popSlot(NaN, 0)).toBe(-1)
  })
})

describe('creakPath', () => {
  it('spans the duration with rates inside the band, swelling mid-way', () => {
    const r = mulberry32(4)
    const pts = creakPath(0.5, r)
    expect(pts[0][0]).toBe(0)
    expect(pts[pts.length - 1][0]).toBeCloseTo(0.5, 12)
    for (let i = 1; i < pts.length; i += 1) expect(pts[i][0]).toBeGreaterThan(pts[i - 1][0])
    for (const [, hz] of pts) {
      expect(hz).toBeGreaterThanOrEqual(26)
      expect(hz).toBeLessThanOrEqual(70)
    }
    // averaged over many creaks, the middle runs faster than the ends
    let mid = 0
    let ends = 0
    for (let k = 0; k < 200; k += 1) {
      const p = creakPath(0.5, r)
      mid += p[Math.floor(p.length / 2)][1]
      ends += (p[0][1] + p[p.length - 1][1]) / 2
    }
    expect(mid).toBeGreaterThan(ends)
  })

  it('copes with junk durations and custom bands', () => {
    expect(creakPath(NaN).length).toBeGreaterThanOrEqual(2)
    expect(creakPath(0).length).toBeGreaterThanOrEqual(2)
    for (const [, hz] of creakPath(0.3, Math.random, { minHz: 22, maxHz: 52 })) {
      expect(hz).toBeGreaterThanOrEqual(22)
      expect(hz).toBeLessThanOrEqual(52)
    }
  })
})

describe('the record score', () => {
  const sd = recordStepSeconds()
  const loop = recordLoopSeconds()

  it('swung eighths at 74 bpm, four bars to the loop', () => {
    expect(sd).toBeCloseTo(60 / 74 / 2, 12)
    expect(loop).toBeCloseTo(sd * 32, 12)
    expect(recordGridTime(0)).toBe(0)
    expect(recordGridTime(2)).toBeCloseTo(2 * sd, 12)
    expect(recordGridTime(1)).toBeCloseTo(sd * (1 + RECORD.swing), 12) // the offbeat lands late
  })

  it('is a pure function of the step: same notes every call', () => {
    for (const step of [0, 5, 13, 77, 1000]) expect(recordNotes(step)).toEqual(recordNotes(step))
    expect(recordNotes(-1)).toEqual([])
    expect(recordNotes(1.5)).toEqual([])
    expect(recordNotes(NaN)).toEqual([])
  })

  it('every bar opens with its chord and bass; chords follow the cycle', () => {
    for (let bar = 0; bar < 12; bar += 1) {
      const chord = RECORD.chords[bar % 4]
      const notes = recordNotes(bar * 8)
      const keys = notes.filter((n) => n.voice === 'keys').map((n) => n.midi)
      expect(keys).toEqual(chord.keys)
      expect(notes.find((n) => n.voice === 'bass').midi).toBe(chord.bass)
      expect(recordChordAt(recordGridTime(bar * 8) + 0.01)).toBe(chord)
    }
  })

  it('every note is playable: finite, positive, in register, strummed upward', () => {
    for (let step = 0; step < 256; step += 1) {
      const notes = recordNotes(step)
      for (const n of notes) {
        expect(['keys', 'bass', 'bell']).toContain(n.voice)
        expect(Number.isFinite(n.at) && n.at >= 0 && n.at < 0.06).toBe(true)
        expect(n.dur).toBeGreaterThan(0)
        expect(n.vel).toBeGreaterThan(0)
        expect(n.vel).toBeLessThanOrEqual(1)
        const [lo, hi] = { keys: [48, 72], bass: [33, 55], bell: [67, 88] }[n.voice]
        expect(n.midi).toBeGreaterThanOrEqual(lo)
        expect(n.midi).toBeLessThanOrEqual(hi)
      }
      const keys = notes.filter((n) => n.voice === 'keys')
      for (let i = 1; i < keys.length; i += 1) expect(keys[i].at).toBeGreaterThan(keys[i - 1].at)
    }
  })

  it('bells only use their bar’s colour tones, and stay sparse', () => {
    let count = 0
    for (let bar = 0; bar < 64; bar += 1) {
      const set = RECORD.chords[bar % 4].bell
      for (const b of bellLine(bar)) {
        if (!b) continue
        count += 1
        expect(set).toContain(b.midi)
      }
    }
    expect(count / 64).toBeGreaterThan(1)
    expect(count / 64).toBeLessThan(3.5)
  })

  it('the melody is generative: the second pass differs from the first', () => {
    const pass = (k) =>
      Array.from({ length: 32 }, (_, s) => recordNotes(k * 32 + s).filter((n) => n.voice === 'bell').map((n) => n.midi))
    expect(pass(1)).not.toEqual(pass(0))
  })

  it('recordEventsBetween partitions time: adjacent windows add up to the whole', () => {
    const whole = recordEventsBetween(0, 2 * loop)
    const parts = [...recordEventsBetween(0, 1.234), ...recordEventsBetween(1.234, loop), ...recordEventsBetween(loop, 2 * loop)]
    expect(parts).toEqual(whole)
    for (let i = 1; i < whole.length; i += 1) expect(whole[i].t).toBeGreaterThanOrEqual(whole[i - 1].t)
    for (const e of whole) expect(e.t).toBeCloseTo(recordGridTime(e.step) + e.at, 12)
    expect(recordEventsBetween(5, 5)).toEqual([])
    expect(recordEventsBetween(NaN, 5)).toEqual([])
  })

  it('a loop holds 4 chords, 8 or more bass notes and a handful of bells', () => {
    const ev = recordEventsBetween(0, loop)
    const by = (v) => ev.filter((e) => e.voice === v).length
    expect(by('bass')).toBeGreaterThanOrEqual(8)
    expect(by('keys')).toBeGreaterThanOrEqual(16)
    expect(by('bell')).toBeGreaterThan(2)
  })
})
