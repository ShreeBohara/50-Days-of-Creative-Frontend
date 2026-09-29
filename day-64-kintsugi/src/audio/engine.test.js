import { describe, it, expect, vi, afterEach } from 'vitest'

// ------------------------------------------------------------
// A minimal fake Web Audio graph: records nodes, connections and
// automation events, and throws where a browser would (non-finite
// values, exponential ramps to ≤ 0, double start()).
// ------------------------------------------------------------

class FakeParam {
  constructor(value = 0) {
    this.value = value
    this.events = []
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
    return this.push('target', v, t, { tau })
  }
  setValueCurveAtTime(curve, t, d) {
    if (this.events.some((e) => e.t >= t && e.t <= t + d)) throw new Error('curve overlaps events')
    return this.push('curve', curve, t, { d })
  }
  cancelScheduledValues() {}
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
    this.startAt = t
    this.offset = offset
  }
  stop(t = 0) {
    if (this.startAt === undefined) throw new Error('InvalidStateError: stop() before start()')
    this.stopAt = t
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
    this.listener = params(['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ', 'upX', 'upY', 'upZ'])
  }
  createGain() {
    return new FakeNode(this, 'gain', { gain: new FakeParam(1) })
  }
  createOscillator() {
    return new FakeSource(this, 'osc', { type: 'sine', frequency: new FakeParam(440), detune: new FakeParam(0) })
  }
  createBufferSource() {
    return new FakeSource(this, 'buffer', { buffer: null, loop: false, playbackRate: new FakeParam(1) })
  }
  createBiquadFilter() {
    return new FakeNode(this, 'biquad', { type: 'lowpass', frequency: new FakeParam(350), Q: new FakeParam(1), gain: new FakeParam(0) })
  }
  createPanner() {
    return new FakeNode(this, 'panner', {
      panningModel: 'equalpower',
      distanceModel: 'inverse',
      refDistance: 1,
      rolloffFactor: 1,
      maxDistance: 10000,
      ...params(['positionX', 'positionY', 'positionZ']),
    })
  }
  createStereoPanner() {
    return new FakeNode(this, 'stereo', { pan: new FakeParam(0) })
  }
  createConvolver() {
    return new FakeNode(this, 'convolver', { buffer: null, normalize: true })
  }
  createDynamicsCompressor() {
    return new FakeNode(this, 'compressor', params(['threshold', 'knee', 'ratio', 'attack', 'release']))
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

// pre-AudioParam listener (older Safari, Firefox), and one with no API at all
class LegacyContext extends FakeContext {
  constructor() {
    super()
    this.listener = { setPosition: vi.fn(), setOrientation: vi.fn() }
  }
}

class BareListenerContext extends FakeContext {
  constructor() {
    super()
    this.listener = {}
  }
}

let store

async function load(stored) {
  vi.resetModules()
  FakeContext.instances = []
  store = new Map(stored ? [['d64.sound', stored]] : [])
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  })
  vi.stubGlobal('AudioContext', FakeContext)
  const { audio } = await import('./engine.js')
  return audio
}

async function unlocked(stored) {
  const audio = await load(stored)
  audio.unlock()
  return { audio, ctx: FakeContext.instances[0] }
}

const masterOf = (ctx) => ctx.of('gain').find((g) => g.outputs.includes(ctx.destination))

// follow a source's first output down to the panner it plays through
function pannerOf(node) {
  for (let n = node, hops = 0; n && hops < 8; n = n.outputs[0], hops += 1) {
    if (n.kind === 'panner') return n
  }
  return null
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ------------------------------------------------------------

describe('before unlock', () => {
  it('constructs nothing and every call is a harmless no-op', async () => {
    const audio = await load()
    const at = { position: [0, 0.05, 0] }
    audio.setListener({ position: [0, 0.3, 0.6], forward: [0, 0, -1], up: [0, 1, 0] })
    audio.ring({ ...at, height01: 0.8, mended: false })
    audio.clatter({ ...at, impulse: 0.05, size: 0.03 })
    audio.crack({ ...at, severity: 'fling' })
    audio.tok(at)
    audio.snap(at)
    audio.reject(at)
    audio.lid(at)
    audio.silk()
    audio.sweep()
    audio.chime()
    audio.goldSift(0.5)
    audio.brushStart()
    audio.brushUpdate(0.5)
    audio.brushStop()
    audio.burnishStart()
    audio.burnishUpdate(0.5)
    audio.burnishStop()
    expect(FakeContext.instances).toHaveLength(0)
    expect(audio.stats().state).toBe('none')
  })

  it('null or junk options are harmless, locked or not', async () => {
    const audio = await load()
    const junk = (a) => {
      a.setListener(null)
      for (const m of ['ring', 'clatter', 'crack', 'tok', 'snap', 'reject', 'lid']) {
        a[m](null)
        a[m](42)
      }
    }
    expect(() => junk(audio)).not.toThrow()
    audio.unlock()
    expect(() => junk(audio)).not.toThrow()
  })

  it('defaults to sound on', async () => {
    const audio = await load()
    expect(audio.isMuted()).toBe(false)
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
    expect(() => {
      audio.setListener({ position: [0, 0, 1] })
      audio.ring({ position: [0, 0, 0] })
      audio.clatter({ impulse: 0.05, size: 0.03 })
      audio.brushStart()
      audio.brushUpdate(0.5)
      audio.brushStop()
      audio.setMuted(true)
      audio.setMuted(false)
    }).not.toThrow()
    // and it doesn't build a fresh context on every gesture
    expect(audio.unlock()).toBe(false)
    expect(FakeContext.instances).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('resumes a suspended context on the next gesture', async () => {
    const { audio, ctx } = await unlocked()
    ctx.state = 'suspended'
    audio.unlock()
    expect(ctx.state).toBe('running')
  })

  it('pools 12 HRTF panners with the inverse distance model', async () => {
    const { ctx } = await unlocked()
    const panners = ctx.of('panner')
    expect(panners).toHaveLength(12)
    for (const p of panners) {
      expect(p.panningModel).toBe('HRTF')
      expect(p.distanceModel).toBe('inverse')
      expect(p.refDistance).toBe(0.35)
      expect(p.rolloffFactor).toBe(1)
    }
  })

  it('routes mix → dry + ~1.2 s stereo room → compressor → master 0.7 → out', async () => {
    const { ctx } = await unlocked()
    const [room] = ctx.of('convolver')
    expect(room.buffer.numberOfChannels).toBe(2)
    expect(room.buffer.duration).toBeCloseTo(1.2, 3)
    const wet = room.outputs[0]
    expect(wet.gain.value).toBeCloseTo(0.18, 6)

    const [comp] = ctx.of('compressor')
    expect(wet.outputs).toContain(comp)
    const master = masterOf(ctx)
    expect(comp.outputs).toContain(master)
    expect(master.gain.value).toBeCloseTo(0.7, 6)
    const dry = ctx.of('gain').find((g) => g !== wet && g.outputs.includes(comp))
    expect(dry.gain.value).toBeCloseTo(0.82, 6)
  })
})

describe('one-shots', () => {
  it('ring: five partials with exponential decays, each stopped 50 ms after its envelope', async () => {
    const { audio, ctx } = await unlocked()
    audio.ring({ height01: 0.9, mended: false, position: [0, 0.06, 0] })
    const oscs = ctx.of('osc')
    expect(oscs).toHaveLength(5)
    for (const osc of oscs) {
      const env = osc.outputs[0]
      const types = env.gain.events.map((e) => e.type)
      expect(types).toEqual(['set', 'linear', 'exp'])
      expect(osc.stopAt).toBeCloseTo(env.gain.last.t + 0.05, 9)
    }
    // routed through a panner that was moved to the bowl
    const panner = oscs[0].outputs[0].outputs[0].outputs[0]
    expect(panner.kind).toBe('panner')
    expect(panner.positionY.last.v).toBeCloseTo(0.06, 9)
  })

  it('a mended bowl rings shorter than a whole one', async () => {
    const { audio, ctx } = await unlocked()
    audio.ring({ height01: 0.5, mended: false, position: [0, 0, 0] })
    const whole = Math.max(...ctx.of('osc').map((o) => o.stopAt))
    ctx.currentTime = 20
    audio.ring({ height01: 0.5, mended: true, position: [0, 0, 0] })
    const mended = Math.max(...ctx.of('osc').slice(5).map((o) => o.stopAt)) - 20
    expect(mended).toBeLessThan(whole)
  })

  it('clamps absurd positions before they reach a panner', async () => {
    const { audio, ctx } = await unlocked()
    audio.tok({ position: [1e9, NaN, -1e9], strength: 1 })
    const panner = ctx.of('panner').find((p) => p.positionX.events.length)
    expect(panner.positionX.last.v).toBe(20)
    expect(panner.positionY.last.v).toBe(0)
    expect(panner.positionZ.last.v).toBe(-20)
  })

  it('every sound stops all of its sources, and nothing throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { audio, ctx } = await unlocked()
    const at = { position: [0.1, 0.02, -0.05] }
    audio.ring({ ...at, height01: 0.2, mended: true, strength: 0.4 })
    audio.clatter({ ...at, impulse: 0.08, size: 0.02 })
    audio.crack({ ...at, severity: 'drop' })
    audio.crack({ position: [0, 0, 0], severity: 1 })
    audio.tok({ ...at, strength: 0.7 })
    audio.snap(at)
    audio.reject(at)
    audio.lid(at)
    audio.silk()
    audio.sweep()
    audio.chime()
    audio.goldSift(0.6)
    expect(warn).not.toHaveBeenCalled()

    const sources = [...ctx.of('osc'), ...ctx.of('buffer')]
    expect(sources.length).toBeGreaterThan(30)
    for (const s of sources) {
      expect(s.startAt).toBeGreaterThanOrEqual(0)
      expect(s.stopAt).toBeGreaterThan(s.startAt)
      expect(s.stopAt).toBeLessThan(6) // no runaway tails
    }
  })

  it('the break is louder for a fling than a hairline', async () => {
    const { audio, ctx } = await unlocked()
    audio.crack({ position: [0, 0, 0], severity: 'hairline' })
    const soft = ctx.of('gain').length
    const peakOf = (gains) => Math.max(...gains.flatMap((g) => g.gain.events.filter((e) => e.type === 'linear').map((e) => e.v)))
    const hairline = peakOf(ctx.of('gain'))
    ctx.currentTime = 5
    audio.crack({ position: [0, 0, 0], severity: 'fling' })
    const fling = peakOf(ctx.of('gain').slice(soft))
    expect(fling).toBeGreaterThan(hairline)
  })

  it('reaps finished voices and disconnects them', async () => {
    const { audio, ctx } = await unlocked()
    audio.tok({ position: [0, 0, 0] })
    audio.chime()
    expect(audio.stats().voices).toBe(2)
    ctx.currentTime = 30
    expect(audio.stats().voices).toBe(0)
    expect(audio.stats().panners).toBe(0)
    const outs = ctx.of('gain').filter((g) => g.disconnected)
    expect(outs.length).toBeGreaterThanOrEqual(2)
  })
})

describe('voice limits', () => {
  it('never holds more than 24 voices, stealing with a fade', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 40; i += 1) audio.chime()
    expect(audio.stats().voices).toBe(24)
    // at least one voice output was faded to 0 and its sources cut short
    const faded = ctx.of('gain').filter((g) => g.gain.events.some((e) => e.type === 'target' && e.v === 0))
    expect(faded.length).toBeGreaterThanOrEqual(16)
    const cut = ctx.of('osc').filter((o) => o.stopAt <= 0.1)
    expect(cut.length).toBeGreaterThan(0)
  })

  it('shares 12 panners; a voice inheriting a sounding one waits until its sources stop', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 20; i += 1) audio.tok({ position: [i * 0.1, 0, 0] })
    const stats = audio.stats()
    expect(stats.panners).toBe(12)
    expect(stats.voices).toBe(12)
    const late = ctx.of('osc').filter((o) => o.startAt > 0)
    expect(late.length).toBeGreaterThan(0)
    for (const o of late) expect(o.startAt).toBeCloseTo(0.06, 9)
    // a panner that changed hands moved only once everything it was
    // carrying had stopped, so no old tail jumps to the new position
    const sources = [...ctx.of('osc'), ...ctx.of('buffer')]
    let handovers = 0
    for (const p of ctx.of('panner')) {
      const moves = p.positionX.events.map((e) => e.t)
      if (moves.length < 2) continue
      handovers += 1
      const lastMove = Math.max(...moves)
      for (const s of sources.filter((x) => pannerOf(x) === p && x.startAt < lastMove)) {
        expect(s.stopAt).toBeLessThanOrEqual(lastMove + 1e-9)
      }
    }
    expect(handovers).toBeGreaterThan(0)
  })

  it('a placed voice taking over a sounding panner steals only that voice', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 12; i += 1) audio.chime()
    for (let i = 0; i < 12; i += 1) audio.tok({ position: [i * 0.1, 0, 0] })
    expect(audio.stats().voices).toBe(24)
    audio.tok({ position: [2, 0, 0] })
    expect(audio.stats().voices).toBe(24)
    const faded = ctx.of('gain').filter((g) => g.gain.events.some((e) => e.type === 'target' && e.v === 0))
    expect(faded).toHaveLength(1)
  })

  it('stealing only ever shortens a source, never lets it run on', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 12; i += 1) audio.snap({ position: [i * 0.1, 0, 0] })
    const before = new Map([...ctx.of('osc'), ...ctx.of('buffer')].map((s) => [s, s.stopAt]))
    ctx.currentTime = 0.02 // steal lands at 0.08; the snap's click grain was due off at ~0.065
    audio.tok({ position: [5, 0, 0] })
    for (const [s, stopAt] of before) expect(s.stopAt).toBeLessThanOrEqual(stopAt)
    expect([...before].some(([s, stopAt]) => s.stopAt < stopAt)).toBe(true)
  })

  it('rate-limits clatter to 40 a second overall', async () => {
    const { audio, ctx } = await unlocked()
    const burst = () => {
      for (let i = 0; i < 100; i += 1) audio.clatter({ impulse: 0.05, size: 0.03, position: [(i % 50) * 0.2, 0, i < 50 ? 0 : 1] })
    }
    burst()
    expect(ctx.of('buffer')).toHaveLength(40)
    ctx.currentTime = 0.5
    burst()
    expect(ctx.of('buffer')).toHaveLength(40)
    ctx.currentTime = 1.0
    burst()
    expect(ctx.of('buffer')).toHaveLength(80)
  })

  it('allows one clatter per 35 ms per place', async () => {
    const { audio, ctx } = await unlocked()
    const hit = () => audio.clatter({ impulse: 0.05, size: 0.03, position: [0.01, 0.01, 0.01] })
    hit()
    ctx.currentTime = 0.02
    hit()
    expect(ctx.of('buffer')).toHaveLength(1)
    ctx.currentTime = 0.04
    hit()
    expect(ctx.of('buffer')).toHaveLength(2)
  })

  it('ignores resting jitter without spending rate budget', async () => {
    const { audio, ctx } = await unlocked()
    for (let i = 0; i < 100; i += 1) audio.clatter({ impulse: 0.0001, size: 0.03, position: [i, 0, 0] })
    expect(ctx.of('buffer')).toHaveLength(0)
    audio.clatter({ impulse: 0.01, size: 0.03, position: [0, 0, 0] })
    expect(ctx.of('buffer')).toHaveLength(1)
  })

  it('goldSift, called every frame, emits a grain at most every ~70 ms', async () => {
    const { audio, ctx } = await unlocked()
    for (let f = 0; f < 60; f += 1) {
      ctx.currentTime = f / 60
      audio.goldSift(0.5)
    }
    const grains = ctx.of('buffer').length
    expect(grains).toBeGreaterThanOrEqual(12)
    expect(grains).toBeLessThanOrEqual(16)
    audio.goldSift(0) // nothing falling, nothing heard
    expect(ctx.of('buffer')).toHaveLength(grains)
  })
})

describe('mute', () => {
  it('persists the choice and silences every call', async () => {
    const { audio, ctx } = await unlocked()
    audio.setMuted(true)
    expect(audio.isMuted()).toBe(true)
    expect(store.get('d64.sound')).toBe('off')
    const before = ctx.nodes.length
    audio.ring({ position: [0, 0, 0] })
    audio.chime()
    audio.brushStart()
    expect(ctx.nodes.length).toBe(before)
    audio.setMuted(false)
    expect(store.get('d64.sound')).toBe('on')
  })

  it('reads the stored choice on load', async () => {
    const audio = await load('off')
    expect(audio.isMuted()).toBe(true)
  })

  it('fades the master, suspends after the fade, and resumes on unmute', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    const { audio, ctx } = await unlocked()
    const master = masterOf(ctx)
    audio.setMuted(true)
    expect(master.gain.last).toMatchObject({ type: 'target', v: 0 })
    vi.advanceTimersByTime(350)
    expect(ctx.state).toBe('suspended')
    audio.setMuted(false)
    expect(ctx.state).toBe('running')
    expect(master.gain.last.v).toBeCloseTo(0.7, 6)
  })

  it('an unmute before the suspend lands cancels it', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    const { audio, ctx } = await unlocked()
    audio.setMuted(true)
    vi.advanceTimersByTime(100)
    audio.setMuted(false)
    vi.advanceTimersByTime(1000)
    expect(ctx.state).toBe('running')
  })

  it('unlock while muted still builds the context in the gesture, at zero level', async () => {
    const { audio, ctx } = await unlocked('off')
    expect(ctx).toBeDefined()
    expect(masterOf(ctx).gain.value).toBe(0)
    audio.ring({ position: [0, 0, 0] })
    expect(ctx.of('osc')).toHaveLength(0)
  })

  it('treats a context suspended by the browser as silent', async () => {
    const { audio, ctx } = await unlocked()
    ctx.state = 'suspended'
    audio.ring({ position: [0, 0, 0] })
    audio.chime()
    expect(ctx.of('osc')).toHaveLength(0)
  })
})

describe('listener', () => {
  it('keeps the camera from before unlock and applies it on unlock', async () => {
    const audio = await load()
    audio.setListener({ position: [0, 0.3, 0.6], forward: [0, -0.45, -0.9], up: [0, 1, 0] })
    audio.unlock()
    const L = FakeContext.instances[0].listener
    expect(L.positionY.last.v).toBeCloseTo(0.3, 9)
    expect(L.positionZ.last.v).toBeCloseTo(0.6, 9)
    expect(L.forwardZ.last.v).toBeCloseTo(-0.9 / Math.hypot(0.45, 0.9), 9) // unit length
  })

  it('normalises orientation, so an overflowing vector cannot reach a param', async () => {
    const { audio, ctx } = await unlocked()
    expect(() => audio.setListener({ position: [0, 0, 1], forward: [0, 0, -1e300], up: [0, 3, 0] })).not.toThrow()
    expect(ctx.listener.forwardZ.last.v).toBe(-1)
    expect(ctx.listener.upY.last.v).toBe(1)
  })

  it('falls back to setPosition / setOrientation without listener AudioParams', async () => {
    const audio = await load()
    vi.stubGlobal('AudioContext', LegacyContext)
    audio.unlock()
    const L = FakeContext.instances[0].listener
    audio.setListener({ position: [0, 0.3, 0.6], forward: [0, 0, -2], up: [0, 1, 0] })
    expect(L.setPosition).toHaveBeenLastCalledWith(0, 0.3, 0.6)
    expect(L.setOrientation).toHaveBeenLastCalledWith(0, 0, -1, 0, 1, 0)
    const writes = L.setPosition.mock.calls.length
    audio.setListener({ position: [0, 0.3, 0.6], forward: [0, 0, -1], up: [0, 1, 0] })
    expect(L.setPosition.mock.calls.length).toBe(writes) // pose unchanged: nothing written
  })

  it('a listener with neither API is left alone rather than throwing every frame', async () => {
    const audio = await load()
    vi.stubGlobal('AudioContext', BareListenerContext)
    audio.unlock()
    expect(() => audio.setListener({ position: [0, 0, 1], forward: [0, 0, -1], up: [0, 1, 0] })).not.toThrow()
  })

  it('only writes the params that moved, and accepts Vector3-like objects', async () => {
    const { audio, ctx } = await unlocked()
    const L = ctx.listener
    audio.setListener({ position: { x: 0, y: 0.3, z: 0.6 }, forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } })
    const count = () => Object.values(L).reduce((n, p) => n + p.events.length, 0)
    const after = count()
    audio.setListener({ position: [0, 0.3, 0.6], forward: [0, 0, -1], up: [0, 1, 0] })
    expect(count()).toBe(after)
    audio.setListener({ position: [0.1, 0.3, 0.6], forward: [0, 0, -1], up: [0, 1, 0] })
    expect(count()).toBe(after + 1)
    expect(L.positionX.last.v).toBeCloseTo(0.1, 9)
  })

  it('ignores degenerate orientation vectors', async () => {
    const { audio, ctx } = await unlocked()
    audio.setListener({ position: [0, 0, 1], forward: [0, 0, 0], up: [NaN, 1, 0] })
    expect(ctx.listener.forwardZ.last?.v ?? -1).toBe(-1)
    expect(ctx.listener.upY.last?.v ?? 1).toBe(1)
  })
})

describe('continuous loops', () => {
  const loopSources = (ctx) => ctx.of('buffer').filter((b) => b.loop)

  it('brush: gain and filter glide after stroke speed', async () => {
    const { audio, ctx } = await unlocked()
    audio.brushStart()
    audio.brushUpdate(0.2)
    audio.brushUpdate(0.9)
    const out = ctx.of('gain').find((g) => g.gain.events.filter((e) => e.type === 'target').length === 2)
    const [slow, fast] = out.gain.events.map((e) => e.v)
    expect(fast).toBeGreaterThan(slow)
    expect(out.gain.events.every((e) => e.type === 'target')).toBe(true) // no steps → no clicks
    expect(audio.stats().loops).toBe(1)
  })

  it('brushStop fades out and stops its sources', async () => {
    const { audio, ctx } = await unlocked()
    audio.brushStart()
    audio.brushUpdate(0.6)
    audio.brushStop()
    const srcs = loopSources(ctx)
    expect(srcs).toHaveLength(2)
    for (const s of srcs) expect(s.stopAt).toBeGreaterThan(0)
    expect(audio.stats().loops).toBe(0)
  })

  it('fades out on its own 400 ms after the last update', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    const { audio, ctx } = await unlocked()
    audio.burnishStart()
    for (let i = 0; i < 10; i += 1) {
      audio.burnishUpdate(0.5)
      vi.advanceTimersByTime(100)
    }
    // still stroking: alive
    expect(audio.stats().loops).toBe(1)
    const hiss = loopSources(ctx)[0]
    expect(hiss.stopAt).toBeUndefined()
    vi.advanceTimersByTime(250) // 350 ms since the last update
    expect(hiss.stopAt).toBeUndefined()
    vi.advanceTimersByTime(100) // 450 ms
    expect(hiss.stopAt).toBeDefined()
    expect(audio.stats().loops).toBe(0)
  })

  it('an update after the watchdog fired starts a fresh loop', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] })
    const { audio, ctx } = await unlocked()
    audio.brushStart()
    vi.advanceTimersByTime(500)
    expect(audio.stats().loops).toBe(0)
    audio.brushUpdate(0.4)
    expect(audio.stats().loops).toBe(1)
    expect(loopSources(ctx)).toHaveLength(4)
  })

  it('an update landing after brushStop stays silent until the next brushStart', async () => {
    const { audio, ctx } = await unlocked()
    audio.brushStart()
    audio.brushUpdate(0.6)
    audio.brushStop()
    audio.brushUpdate(0.6) // stale pointermove after pointerup
    expect(audio.stats().loops).toBe(0)
    expect(loopSources(ctx)).toHaveLength(2)
    audio.brushStart()
    audio.brushUpdate(0.4)
    expect(audio.stats().loops).toBe(1)
  })

  it('mute fades a stroke but leaves it armed for when sound comes back', async () => {
    const { audio } = await unlocked()
    audio.burnishStart()
    audio.burnishUpdate(0.5)
    audio.setMuted(true)
    expect(audio.stats().loops).toBe(0)
    audio.burnishUpdate(0.5)
    expect(audio.stats().loops).toBe(0)
    audio.setMuted(false)
    audio.burnishUpdate(0.5)
    expect(audio.stats().loops).toBe(1)
  })

  it('muting stops running loops', async () => {
    const { audio } = await unlocked()
    audio.brushStart()
    audio.burnishStart()
    expect(audio.stats().loops).toBe(2)
    audio.setMuted(true)
    expect(audio.stats().loops).toBe(0)
  })
})
