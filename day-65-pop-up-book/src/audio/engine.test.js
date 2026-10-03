import { describe, it, expect, vi, afterEach } from 'vitest'
import { POP, RECORD, recordGridTime, recordStepSeconds } from './synth.js'

// ------------------------------------------------------------
// A minimal fake Web Audio graph: records nodes, connections and
// automation events, and throws where a browser would (non-finite
// values, exponential ramps to ≤ 0, overlapping curves, start twice).
// ------------------------------------------------------------

class FakeParam {
  constructor(value = 0) {
    this.value = value
    this.events = []
    this.cancels = []
  }
  push(type, v, t, extra) {
    if (!Number.isFinite(t) || (typeof v === 'number' && !Number.isFinite(Math.fround(v)))) {
      throw new TypeError(`non-finite automation: ${type} ${v} @ ${t}`)
    }
    this.events.push({ type, v, t, ...extra })
    return this
  }
  setValueAtTime(v, t) {
    return this.push('set', v, t)
  }
  linearRampToValueAtTime(v, t) {
    return this.push('linear', v, t)
  }
  exponentialRampToValueAtTime(v, t) {
    if (!(v > 0)) throw new RangeError(`exponential ramp to ${v}`)
    return this.push('exp', v, t)
  }
  setTargetAtTime(v, t, tau) {
    if (!(tau > 0)) throw new RangeError(`time constant ${tau}`)
    return this.push('target', v, t, { tau })
  }
  setValueCurveAtTime(curve, t, d) {
    if (this.events.some((e) => e.t >= t && e.t <= t + d)) throw new Error('curve overlaps events')
    if (!curve.every(Number.isFinite)) throw new TypeError('non-finite curve')
    return this.push('curve', curve, t, { d })
  }
  cancelScheduledValues(t) {
    this.cancels.push(t)
  }
  get last() {
    return this.events[this.events.length - 1]
  }
}

class FakeNode {
  constructor(ctx, kind, props = {}) {
    this.context = ctx
    this.kind = kind
    this.outputs = []
    Object.assign(this, props)
    ctx.nodes.push(this)
  }
  connect(dest) {
    if (!dest) throw new TypeError('connect(undefined)')
    this.outputs.push(dest)
    return dest
  }
  disconnect() {
    this.outputs = []
    this.disconnected = true
  }
}

class FakeSource extends FakeNode {
  start(t = 0, offset = 0) {
    if (this.startAt !== undefined) throw new Error('InvalidStateError: start() twice')
    if (!Number.isFinite(t) || !Number.isFinite(offset) || offset < 0) throw new RangeError(`start(${t}, ${offset})`)
    this.startAt = t
    this.offset = offset
  }
  stop(t = 0) {
    if (this.startAt === undefined) throw new Error('InvalidStateError: stop() before start()')
    if (!Number.isFinite(t)) throw new RangeError(`stop(${t})`)
    this.stopAt = t
  }
}

class FakeOsc extends FakeSource {
  setPeriodicWave(w) {
    this.wave = w
    this.type = 'custom'
  }
}

const params = (names, value = 0) => Object.fromEntries(names.map((n) => [n, new FakeParam(value)]))

class FakeContext {
  static instances = []

  constructor() {
    FakeContext.instances.push(this)
    this.nodes = []
    this.currentTime = 0
    this.sampleRate = 48000
    this.state = 'running'
    this.destination = new FakeNode(this, 'destination')
  }
  createGain() {
    return new FakeNode(this, 'gain', { gain: new FakeParam(1) })
  }
  createOscillator() {
    return new FakeOsc(this, 'osc', { type: 'sine', frequency: new FakeParam(440), detune: new FakeParam(0) })
  }
  createBufferSource() {
    return new FakeSource(this, 'buffer', { buffer: null, loop: false, playbackRate: new FakeParam(1) })
  }
  createBiquadFilter() {
    return new FakeNode(this, 'biquad', { type: 'lowpass', frequency: new FakeParam(350), Q: new FakeParam(1), gain: new FakeParam(0) })
  }
  createStereoPanner() {
    return new FakeNode(this, 'stereo', { pan: new FakeParam(0) })
  }
  createDelay(max = 1) {
    return new FakeNode(this, 'delay', { maxDelayTime: max, delayTime: new FakeParam(0) })
  }
  createConvolver() {
    return new FakeNode(this, 'convolver', { buffer: null, normalize: true })
  }
  createDynamicsCompressor() {
    return new FakeNode(this, 'compressor', params(['threshold', 'knee', 'ratio', 'attack', 'release']))
  }
  createPeriodicWave(real, imag) {
    return { real, imag }
  }
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length))
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (i) => data[i] }
  }
  resume() {
    this.state = 'running'
    return Promise.resolve()
  }
  suspend() {
    this.state = 'suspended'
    return Promise.resolve()
  }
  close() {
    this.state = 'closed'
    return Promise.resolve()
  }
  of(kind) {
    return this.nodes.filter((n) => n.kind === kind)
  }
}

// an old engine without StereoPannerNode or PeriodicWave
class BareContext extends FakeContext {}
BareContext.prototype.createStereoPanner = undefined
BareContext.prototype.createPeriodicWave = undefined

let store
let doc

async function load({ stored, ctor = FakeContext } = {}) {
  vi.resetModules()
  FakeContext.instances = []
  store = new Map(stored ? [['d65.sound', stored]] : [])
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  })
  doc = {
    hidden: false,
    listeners: new Map(),
    addEventListener(type, fn) {
      this.listeners.set(type, fn)
    },
    removeEventListener(type, fn) {
      if (this.listeners.get(type) === fn) this.listeners.delete(type)
    },
  }
  vi.stubGlobal('document', doc)
  if (ctor) vi.stubGlobal('AudioContext', ctor)
  const { audio } = await import('./engine.js')
  return audio
}

async function unlocked(opts) {
  const audio = await load(opts)
  audio.unlock()
  return { audio, ctx: FakeContext.instances[0] }
}

const masterOf = (ctx) => ctx.of('gain').find((g) => g.outputs.includes(ctx.destination))
const sources = (ctx) => [...ctx.of('osc'), ...ctx.of('buffer')]
const fakeTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] })

// follow a node's first outputs down to the stereo panner it plays through
function pannerOf(node) {
  for (let n = node, hops = 0; n && hops < 10; n = n.outputs[0], hops += 1) {
    if (n.kind === 'stereo') return n
  }
  return null
}

// every public call, with plausible arguments
function everything(audio) {
  audio.turnStart(0.8)
  for (let i = 0; i < 5; i += 1) audio.turnMove(i * 2, 0.5 - i * 0.2)
  audio.turnLand(-0.8, 0.7)
  audio.pop(-0.3, 0.2)
  audio.pop(0.3, 0.9)
  audio.flap(true)
  audio.flap(false)
  audio.tick()
  audio.slide(0.5)
  audio.slide(0)
  audio.scratch(0.6)
  audio.scratch(0)
  audio.cover(true)
  audio.cover(false, 0.8)
  audio.chime()
  audio.record(true)
  audio.record(false)
}

const JUNK = [undefined, null, NaN, Infinity, -Infinity, 'loud', {}, [], -5, 1e9]

function junk(audio) {
  for (const x of JUNK) {
    audio.turnStart(x)
    audio.turnMove(x, x)
    audio.turnLand(x, x)
    audio.pop(x, x)
    audio.flap(x)
    audio.tick(x)
    audio.slide(x)
    audio.scratch(x)
    audio.cover(x, x)
    audio.chime(x)
    audio.record(x)
    audio.setMuted(false)
  }
  audio.record(false)
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ------------------------------------------------------------

describe('without Web Audio (node, ancient browsers)', () => {
  it('unlock reports false and every call is a silent no-op', async () => {
    const audio = await load({ ctor: null })
    expect(globalThis.AudioContext).toBeUndefined()
    expect(audio.unlock()).toBe(false)
    expect(() => everything(audio)).not.toThrow()
    expect(() => junk(audio)).not.toThrow()
    expect(() => audio.setMuted(true)).not.toThrow()
    expect(audio.muted).toBe(true)
    expect(() => audio.dispose()).not.toThrow()
    expect(audio.stats().state).toBe('none')
  })
})

describe('before unlock', () => {
  it('constructs nothing and every call is a harmless no-op', async () => {
    const audio = await load()
    everything(audio)
    junk(audio)
    expect(FakeContext.instances).toHaveLength(0)
    expect(audio.stats()).toMatchObject({ state: 'none', voices: 0, beds: 0, record: false })
  })

  it('defaults to sound on, through both the getter and isMuted()', async () => {
    const audio = await load()
    expect(audio.muted).toBe(false)
    expect(audio.isMuted()).toBe(false)
  })

  it('remembers a spinning record and starts it on unlock', async () => {
    const audio = await load()
    audio.record(true)
    expect(audio.stats().record).toBe(false)
    audio.unlock()
    expect(audio.stats().record).toBe(true)
    audio.record(false)
  })
})

describe('unlock and the master chain', () => {
  it('builds exactly one context however often it is called', async () => {
    const audio = await load()
    expect(audio.unlock()).toBe(true)
    audio.unlock()
    audio.unlock()
    expect(FakeContext.instances).toHaveLength(1)
  })

  it('a graph that fails to build leaves the engine silent instead of throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const audio = await load()
    vi.spyOn(FakeContext.prototype, 'createConvolver').mockImplementation(() => {
      throw new Error('no convolver')
    })
    expect(audio.unlock()).toBe(false)
    expect(FakeContext.instances[0].state).toBe('closed')
    expect(() => everything(audio)).not.toThrow()
    expect(audio.unlock()).toBe(false) // and no fresh context per gesture
    expect(FakeContext.instances).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('resumes a suspended context on the next gesture', async () => {
    const { audio, ctx } = await unlocked()
    ctx.state = 'suspended'
    audio.unlock()
    expect(ctx.state).toBe('running')
  })

  it('routes mix → dry + small stereo room → gentle compressor → master → out', async () => {
    const { ctx } = await unlocked()
    const [room] = ctx.of('convolver')
    expect(room.buffer.numberOfChannels).toBe(2)
    expect(room.buffer.duration).toBeCloseTo(0.7, 3)
    const wet = room.outputs[0]
    expect(wet.gain.value).toBeCloseTo(0.12, 6)
    const [comp] = ctx.of('compressor')
    expect(wet.outputs).toContain(comp)
    expect(comp.ratio.value).toBeLessThanOrEqual(3)
    expect(comp.threshold.value).toBeGreaterThanOrEqual(-20)
    const master = masterOf(ctx)
    expect(comp.outputs).toContain(master)
    expect(master.gain.value).toBeGreaterThan(0.3)
    expect(master.gain.value).toBeLessThanOrEqual(0.6)
    const dry = ctx.of('gain').find((g) => g !== wet && g.outputs.includes(comp))
    expect(dry.gain.value).toBeCloseTo(0.88, 6)
  })

  it('builds its sample buffers once, at unlock', async () => {
    const { audio, ctx } = await unlocked()
    const before = ctx.nodes.length
    everything(audio)
    const buffers = new Set(ctx.of('buffer').map((b) => b.buffer))
    expect(buffers.size).toBeLessThanOrEqual(4) // noise, dust, vinyl, impulse — reused
    expect(ctx.nodes.length).toBeGreaterThan(before)
  })
})

describe('one-shots', () => {
  it('every sound starts and stops all of its sources, and nothing throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { audio, ctx } = await unlocked()
    everything(audio)
    expect(warn).not.toHaveBeenCalled()
    const all = sources(ctx)
    expect(all.length).toBeGreaterThan(40)
    for (const s of all) {
      expect(s.startAt).toBeGreaterThanOrEqual(0)
      if (s.loop && s.stopAt === undefined) continue // a bed still sounding
      expect(s.stopAt).toBeGreaterThan(s.startAt - 1e-9)
      expect(s.stopAt).toBeLessThan(8) // no runaway tails
    }
    // the beds stop their loops once released
    audio.dispose()
    for (const s of all) expect(s.stopAt).toBeDefined()
  })

  it('each one-shot is panned, narrower than hard left/right', async () => {
    const { audio, ctx } = await unlocked()
    audio.turnLand(-1, 1)
    const stereo = pannerOf(ctx.of('buffer')[0])
    expect(stereo).not.toBeNull()
    expect(stereo.pan.value).toBeLessThan(0)
    expect(stereo.pan.value).toBeGreaterThan(-1)
    audio.turnStart(1)
    const right = pannerOf(ctx.of('buffer').at(-1))
    expect(right.pan.value).toBeGreaterThan(0)
  })

  it('reaps finished voices and disconnects them', async () => {
    const { audio, ctx } = await unlocked()
    audio.flap(true)
    audio.chime()
    audio.tick()
    expect(audio.stats().voices).toBe(3)
    ctx.currentTime = 30
    expect(audio.stats().voices).toBe(0)
    expect(ctx.of('stereo').filter((p) => p.disconnected).length).toBeGreaterThanOrEqual(3)
  })

  it('cover: the creak starts now and the thump lands `landIn` later', async () => {
    const { audio, ctx } = await unlocked()
    audio.cover(true, 1.2)
    const oscs = ctx.of('osc')
    const creak = oscs.find((o) => o.type === 'custom')
    expect(creak).toBeDefined()
    expect(creak.startAt).toBe(0)
    expect(creak.frequency.events.length).toBeGreaterThan(5) // the stick–slip path
    const thump = oscs.find((o) => o.type === 'sine')
    expect(thump.startAt).toBeCloseTo(1.2, 9)
    // landIn is clamped, and junk falls back to the default
    ctx.currentTime = 10
    audio.cover(false, 99)
    expect(Math.max(...ctx.of('osc').map((o) => o.startAt))).toBeCloseTo(12.5, 9)
  })

  it('the creak falls back to a sawtooth where PeriodicWave is missing', async () => {
    const { audio, ctx } = await unlocked({ ctor: BareContext })
    expect(() => audio.cover(true)).not.toThrow()
    expect(ctx.of('osc').some((o) => o.type === 'sawtooth')).toBe(true)
    // and without StereoPannerNode voices go straight to the mix
    audio.pop(0.5, 0.5)
    expect(ctx.of('stereo')).toHaveLength(0)
  })

  it('chime: three music-box notes, rising', async () => {
    const { audio, ctx } = await unlocked()
    audio.chime()
    // a note is the partials sharing a start; its fundamental is the lowest
    const notes = new Map()
    for (const o of ctx.of('osc')) notes.set(o.startAt, Math.min(notes.get(o.startAt) ?? Infinity, o.frequency.events[0].v))
    const fundamentals = [...notes].map(([at, f]) => ({ at, f })).sort((a, b) => a.at - b.at)
    expect(fundamentals).toHaveLength(3)
    for (let i = 1; i < 3; i += 1) {
      expect(fundamentals[i].at).toBeGreaterThan(fundamentals[i - 1].at)
      expect(fundamentals[i].f).toBeGreaterThan(fundamentals[i - 1].f)
    }
  })
})

describe('pops in a burst', () => {
  it('several at once ripple out 26–56 ms apart instead of stacking, and the backlog is capped', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 20; i += 1) audio.pop(0, i / 19)
    // a voice's earliest source start is when it begins
    const starts = new Map()
    for (const s of ctx.of('buffer')) {
      const p = pannerOf(s)
      starts.set(p, Math.min(starts.get(p) ?? Infinity, s.startAt))
    }
    const t = [...starts.values()].sort((a, b) => a - b)
    expect(t.length).toBeGreaterThan(5)
    expect(t.length).toBeLessThan(13)
    for (let i = 1; i < t.length; i += 1) {
      expect(t[i] - t[i - 1]).toBeGreaterThanOrEqual(POP.gap - 1e-9)
      expect(t[i] - t[i - 1]).toBeLessThanOrEqual(POP.gap + POP.spread + POP.spread * 0.25 + 1e-9)
    }
    expect(t.at(-1)).toBeLessThanOrEqual(POP.maxAhead + 1e-9)
  })

  it('a pop well after the last one goes straight away', async () => {
    const { audio, ctx } = await unlocked()
    audio.pop(0, 0.5)
    ctx.currentTime = 2
    const before = ctx.of('buffer').length
    audio.pop(0, 0.5)
    const mine = ctx.of('buffer').slice(before)
    expect(Math.min(...mine.map((s) => s.startAt))).toBeLessThan(2 + POP.spread)
  })

  it('consecutive pops differ (jitter), even at the same size', async () => {
    const { audio, ctx } = await unlocked()
    audio.pop(0, 0.5)
    ctx.currentTime = 1
    audio.pop(0, 0.5)
    const swishes = ctx.of('biquad').filter((b) => b.frequency.events.some((e) => e.type === 'exp'))
    expect(swishes).toHaveLength(2)
    expect(swishes[0].frequency.events[0].v).not.toBe(swishes[1].frequency.events[0].v)
  })
})

describe('volvelle ticks', () => {
  it('rings an impulse (a deterministic click), at most one per 20 ms', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 10; i += 1) audio.tick()
    expect(audio.stats().voices).toBe(1)
    const clicks = ctx.of('buffer').filter((b) => b.buffer.length === Math.round(48000 * 0.005))
    expect(clicks.length).toBe(2)
    for (let i = 1; i <= 30; i += 1) {
      ctx.currentTime = i * 0.021
      audio.tick()
    }
    expect(audio.stats().voices).toBeLessThan(6) // each is gone in ~60 ms
    expect(ctx.of('stereo')).toHaveLength(31)
  })
})

describe('voice limits', () => {
  it('never holds more than 16 one-shots, stealing the quietest with a fade', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 40; i += 1) {
      ctx.currentTime = i * 0.31 // just past the chime's spacing; each rings ~6 s
      audio.chime()
    }
    expect(audio.stats().voices).toBe(16)
    const faded = ctx.of('gain').filter((g) => g.gain.events.some((e) => e.type === 'target' && e.v === 0 && e.tau === 0.01))
    expect(faded.length).toBeGreaterThan(5)
  })

  it('stealing only ever shortens a source, never lets it run on', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 16; i += 1) {
      ctx.currentTime = i * 0.31
      audio.chime()
    }
    const before = new Map(sources(ctx).map((s) => [s, s.stopAt]))
    ctx.currentTime = 16 * 0.31
    audio.chime()
    for (const [s, stopAt] of before) expect(s.stopAt).toBeLessThanOrEqual(stopAt)
    expect([...before].some(([s, stopAt]) => s.stopAt < stopAt)).toBe(true)
  })

  it('per-kind spacing: a nervous double call makes one sound', async () => {
    const { audio } = await unlocked()
    for (const call of [() => audio.turnStart(0), () => audio.turnLand(0, 1), () => audio.flap(true), () => audio.cover(true), () => audio.chime()]) {
      const before = audio.stats().voices
      call()
      call()
      expect(audio.stats().voices).toBe(before + 1)
    }
  })
})

describe('turnMove — the page’s air', () => {
  const bedGain = (ctx) => ctx.of('gain').filter((g) => g.gain.events.length && g.gain.events.every((e) => e.type === 'target'))

  it('one persistent patch however often it is called; params only glide', async () => {
    fakeTimers()
    const { audio, ctx } = await unlocked()
    audio.turnMove(4)
    const nodes = ctx.nodes.length
    expect(ctx.of('buffer').filter((b) => b.loop)).toHaveLength(2)
    for (let f = 0; f < 120; f += 1) {
      ctx.currentTime = f / 120
      audio.turnMove(4 + 3 * Math.sin(f / 10))
      vi.advanceTimersByTime(8)
    }
    expect(ctx.nodes.length).toBe(nodes) // no nodes per frame
    expect(audio.stats().beds).toBe(1)
    for (const g of bedGain(ctx)) expect(g.gain.events.every((e) => e.type === 'target')).toBe(true)
  })

  it('louder and brighter as the page speeds up; silent at rest', async () => {
    const { audio, ctx } = await unlocked()
    audio.turnMove(1)
    const band = ctx.of('biquad').find((b) => b.frequency.events.length)
    const slow = band.frequency.last.v
    const level = ctx.of('gain').find((g) => g.gain.events.length === 1 && g.gain.last.v > 0)
    const quiet = level.gain.last.v
    audio.turnMove(9)
    expect(band.frequency.last.v).toBeGreaterThan(slow)
    expect(level.gain.last.v).toBeGreaterThan(quiet)
    audio.turnMove(0)
    expect(level.gain.last.v).toBe(0)
  })

  it('skips writes too small to hear', async () => {
    const { audio, ctx } = await unlocked()
    audio.turnMove(5)
    const count = () => ctx.of('gain').reduce((n, g) => n + g.gain.events.length, 0)
    const after = count()
    for (let i = 0; i < 50; i += 1) audio.turnMove(5)
    audio.turnMove(5.001)
    expect(count()).toBe(after)
  })

  it('creates nothing while the page is still', async () => {
    const { audio, ctx } = await unlocked()
    const before = ctx.nodes.length
    for (let i = 0; i < 60; i += 1) audio.turnMove(0)
    audio.turnMove(0.05) // resting jitter
    expect(ctx.nodes.length).toBe(before)
    expect(audio.stats().beds).toBe(0)
  })

  it('follows the page across the spine when given a pan', async () => {
    const { audio, ctx } = await unlocked()
    audio.turnStart(1)
    audio.turnMove(4, 1)
    audio.turnMove(4, -1)
    const pans = ctx.of('stereo').flatMap((p) => p.pan.events.filter((e) => e.type === 'target').map((e) => e.v))
    expect(Math.min(...pans)).toBeLessThan(0)
  })

  it('turnLand hushes the whoosh at once', async () => {
    const { audio, ctx } = await unlocked()
    audio.turnMove(6)
    const level = ctx.of('gain').find((g) => g.gain.events.length === 1 && g.gain.last.v > 0)
    audio.turnLand(-1, 0.5)
    expect(level.gain.last.v).toBe(0)
  })

  it('a watchdog releases the patch 300 ms after the last moving call', async () => {
    fakeTimers()
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 10; i += 1) {
      audio.turnMove(5)
      vi.advanceTimersByTime(16)
    }
    const loops = ctx.of('buffer').filter((b) => b.loop)
    expect(loops.every((b) => b.stopAt === undefined)).toBe(true)
    audio.turnMove(0) // landed; frames may keep coming with speed 0
    vi.advanceTimersByTime(250)
    expect(audio.stats().beds).toBe(1)
    vi.advanceTimersByTime(100)
    expect(audio.stats().beds).toBe(0)
    expect(loops.every((b) => b.stopAt !== undefined)).toBe(true)
    // the next turn opens a fresh patch
    audio.turnMove(5)
    expect(audio.stats().beds).toBe(1)
    expect(ctx.of('buffer').filter((b) => b.loop)).toHaveLength(4)
  })
})

describe('slide and scratch', () => {
  for (const name of ['slide', 'scratch']) {
    it(`${name}: silent at rest, rises with speed, released when the calls stop`, async () => {
      fakeTimers()
      const { audio, ctx } = await unlocked()
      const before = ctx.nodes.length
      audio[name](0)
      expect(ctx.nodes.length).toBe(before)
      audio[name](0.2)
      const level = ctx.of('gain').find((g) => g.gain.events.length === 1 && g.gain.last.v > 0)
      const slow = level.gain.last.v
      audio[name](0.9)
      expect(level.gain.last.v).toBeGreaterThan(slow)
      const nodes = ctx.nodes.length
      for (let i = 0; i < 100; i += 1) audio[name](0.3 + (i % 7) / 20)
      expect(ctx.nodes.length).toBe(nodes)
      vi.advanceTimersByTime(400)
      expect(audio.stats().beds).toBe(0)
      expect(ctx.of('buffer').filter((b) => b.loop).every((b) => b.stopAt !== undefined)).toBe(true)
    })
  }

  it('the pencil’s grit plays faster when the stroke is quicker', async () => {
    const { audio, ctx } = await unlocked()
    audio.scratch(0.1)
    const grit = ctx.of('buffer').find((b) => b.playbackRate.events.length)
    const slow = grit.playbackRate.last.v
    audio.scratch(1)
    expect(grit.playbackRate.last.v).toBeGreaterThan(slow)
  })
})

describe('the record', () => {
  const LOOP_START = 0.3 // the needle settles for 0.3 s before the first chord
  // how far ahead the score has been scheduled: the next unscheduled step's time
  const horizon = (audio) => LOOP_START + recordGridTime(audio.stats().recordStep)

  it('schedules ≥ 1.2 s ahead on start, and keeps going on its timer', async () => {
    fakeTimers()
    const { audio, ctx } = await unlocked()
    audio.record(true)
    expect(audio.stats().record).toBe(true)
    expect(horizon(audio)).toBeGreaterThanOrEqual(1.2)
    expect(LOOP_START + recordGridTime(audio.stats().recordStep - 1)).toBeLessThan(1.5)
    for (let i = 1; i <= 50; i += 1) {
      ctx.currentTime = i * 0.2
      vi.advanceTimersByTime(200)
      expect(horizon(audio) - ctx.currentTime).toBeGreaterThanOrEqual(1.2)
      expect(Math.max(...ctx.of('osc').map((o) => o.startAt))).toBeLessThan(ctx.currentTime + 1.5 + 0.06)
    }
    // ten seconds in, the score has moved on by about ten seconds' worth of steps
    const expected = Math.floor((10 + 1.5 - 0.3) / recordStepSeconds())
    expect(Math.abs(audio.stats().recordStep - expected)).toBeLessThanOrEqual(2)
    audio.record(false)
  })

  it('every scheduled note sits on the score’s grid', async () => {
    const { audio, ctx } = await unlocked()
    audio.record(true)
    const grid = Array.from({ length: 8 }, (_, s) => LOOP_START + recordGridTime(s))
    const notes = ctx.of('osc').filter((o) => o.startAt > 0) // the LFOs start at 0
    expect(notes.length).toBeGreaterThan(8)
    for (const o of notes) {
      const near = Math.min(...grid.map((g) => o.startAt - g).filter((d) => d >= -1e-9))
      expect(near).toBeLessThan(0.06)
    }
    audio.record(false)
  })

  it('keys, bass and music box are all present, with wow, crackle and hiss', async () => {
    const { audio, ctx } = await unlocked()
    audio.record(true)
    expect(ctx.of('delay')).toHaveLength(1)
    const [wow] = ctx.of('delay')
    expect(wow.maxDelayTime).toBeGreaterThan(0.1)
    const loops = ctx.of('buffer').filter((b) => b.loop)
    expect(loops).toHaveLength(2) // crackle + hiss
    const freqs = ctx.of('osc').map((o) => o.frequency.value)
    expect(freqs.some((f) => f < 100)).toBe(true) // bass (F2)
    expect(freqs.some((f) => f > 200 && f < 400)).toBe(true) // keys
    audio.record(false)
  })

  it('record(false) fades out over ~0.6 s, cuts what was queued and stops scheduling', async () => {
    fakeTimers()
    const { audio, ctx } = await unlocked()
    audio.record(true)
    ctx.currentTime = 2
    vi.advanceTimersByTime(200)
    const out = ctx.of('gain').find((g) => g.gain.events.some((e) => e.type === 'linear' && e.v === 0.5))
    audio.record(false)
    expect(audio.stats().record).toBe(false)
    const fade = out.gain.last
    expect(fade).toMatchObject({ type: 'linear', v: 0 })
    expect(fade.t - 2).toBeCloseTo(0.6, 6)
    for (const s of sources(ctx)) expect(s.stopAt).toBeLessThanOrEqual(2.62 + 1e-9)
    // the platter coasts: the wow delay lengthens through the fade
    const [wow] = ctx.of('delay')
    expect(wow.delayTime.last.type).toBe('linear')
    expect(wow.delayTime.last.v).toBeGreaterThan(wow.delayTime.value)
    const nodes = ctx.nodes.length
    ctx.currentTime = 5
    vi.advanceTimersByTime(2000)
    expect(ctx.nodes.length).toBe(nodes)
    expect(out.disconnected).toBe(true)
  })

  it('is idempotent, and a quick off/on builds a fresh spin rather than fighting the fade', async () => {
    const { audio, ctx } = await unlocked()
    audio.record(true)
    audio.record(true)
    expect(ctx.of('delay')).toHaveLength(1)
    audio.record(false)
    audio.record(false)
    audio.record(true)
    expect(ctx.of('delay')).toHaveLength(2)
    audio.record(false)
  })

  it('a record spinning while muted starts when sound comes back', async () => {
    const { audio, ctx } = await unlocked({ stored: 'off' })
    audio.record(true)
    expect(ctx.of('delay')).toHaveLength(0)
    audio.setMuted(false)
    expect(audio.stats().record).toBe(true)
    audio.setMuted(true)
    expect(audio.stats()).toMatchObject({ record: false, recordOn: true })
    audio.record(false)
  })

  it('a hidden tab stops the music (and the beds); coming back resumes it', async () => {
    const { audio, ctx } = await unlocked()
    audio.record(true)
    audio.slide(0.6)
    expect(audio.stats().beds).toBe(1)
    doc.hidden = true
    doc.listeners.get('visibilitychange')()
    expect(audio.stats()).toMatchObject({ record: false, recordOn: true, beds: 0 })
    doc.hidden = false
    doc.listeners.get('visibilitychange')()
    expect(audio.stats().record).toBe(true)
    expect(ctx.of('delay')).toHaveLength(2)
    audio.record(false)
  })

  it('skips ahead instead of bursting if its timer was frozen', async () => {
    fakeTimers()
    const { audio, ctx } = await unlocked()
    audio.record(true)
    const before = ctx.of('osc').length
    ctx.currentTime = 60 // a minute frozen in a background tab
    vi.advanceTimersByTime(200)
    const late = ctx.of('osc').slice(before)
    expect(late.length).toBeGreaterThan(0)
    for (const o of late) expect(o.startAt).toBeGreaterThanOrEqual(60)
    expect(late.length).toBeLessThan(60) // ~1.5 s worth, not a minute's
    audio.record(false)
  })

  it('the score it plays is the one synth.js describes', () => {
    expect(RECORD.chords.map((c) => c.name)).toEqual(['Fmaj9', 'Em7', 'Dm9', 'Cmaj9'])
  })
})

describe('mute', () => {
  it('persists the choice and silences every call', async () => {
    const { audio, ctx } = await unlocked()
    audio.setMuted(true)
    expect(audio.muted).toBe(true)
    expect(store.get('d65.sound')).toBe('off')
    const before = ctx.nodes.length
    everything(audio)
    expect(ctx.nodes.length).toBe(before)
    audio.setMuted(false)
    expect(audio.muted).toBe(false)
    expect(store.get('d65.sound')).toBe('on')
  })

  it('reads the stored choice on load', async () => {
    const audio = await load({ stored: 'off' })
    expect(audio.muted).toBe(true)
  })

  it('fades the master, suspends after the fade, and resumes on unmute', async () => {
    fakeTimers()
    const { audio, ctx } = await unlocked()
    const master = masterOf(ctx)
    audio.setMuted(true)
    expect(master.gain.last).toMatchObject({ type: 'target', v: 0 })
    vi.advanceTimersByTime(350)
    expect(ctx.state).toBe('suspended')
    audio.setMuted(false)
    expect(ctx.state).toBe('running')
    expect(master.gain.last.v).toBeCloseTo(0.5, 6)
  })

  it('muting releases running beds', async () => {
    const { audio } = await unlocked()
    audio.turnMove(5)
    audio.scratch(0.5)
    expect(audio.stats().beds).toBe(2)
    audio.setMuted(true)
    expect(audio.stats().beds).toBe(0)
  })

  it('unlock while muted still builds the context in the gesture, at zero level', async () => {
    const { audio, ctx } = await unlocked({ stored: 'off' })
    expect(masterOf(ctx).gain.value).toBe(0)
    audio.pop(0, 1)
    expect(ctx.of('buffer')).toHaveLength(0)
  })

  it('treats a context suspended by the browser as silent', async () => {
    const { audio, ctx } = await unlocked()
    ctx.state = 'suspended'
    const before = ctx.nodes.length
    vi.spyOn(globalThis.performance, 'now').mockReturnValue(1e12) // well past the resume grace
    everything(audio)
    expect(ctx.nodes.length).toBe(before)
  })
})

describe('dispose', () => {
  it('stops everything, closes the context and unhooks the page', async () => {
    const { audio, ctx } = await unlocked()
    audio.record(true)
    audio.turnMove(5)
    expect(doc.listeners.has('visibilitychange')).toBe(true)
    audio.dispose()
    expect(ctx.state).toBe('closed')
    expect(doc.listeners.has('visibilitychange')).toBe(false)
    expect(audio.stats()).toMatchObject({ state: 'none', voices: 0, beds: 0, record: false, recordOn: false })
    const before = ctx.nodes.length
    expect(() => everything(audio)).not.toThrow()
    expect(ctx.nodes.length).toBe(before)
  })

  it('is safe twice, and a later unlock builds a fresh engine', async () => {
    const { audio } = await unlocked()
    audio.dispose()
    expect(() => audio.dispose()).not.toThrow()
    expect(audio.unlock()).toBe(true)
    expect(FakeContext.instances).toHaveLength(2)
    audio.pop(0, 0.5)
    expect(FakeContext.instances[1].of('buffer').length).toBeGreaterThan(0)
  })
})
