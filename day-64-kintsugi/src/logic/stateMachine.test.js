import { describe, it, expect } from 'vitest'
import { PHASES, STAGE_WORD, createInitialState, transition } from './stateMachine.js'

const at = (phase, extra = {}) => ({ ...createInitialState(), phase, ...extra })
const run = (state, ...events) => events.reduce((s, e) => transition(s, e), state)

const EVENTS = [
  { type: 'UNVEIL' },
  { type: 'LIFT' },
  { type: 'SET_DOWN' },
  { type: 'IMPACT', severity: 'set' },
  { type: 'IMPACT', severity: 'hairline' },
  { type: 'IMPACT', severity: 'drop' },
  { type: 'IMPACT', severity: 'fling' },
  { type: 'CRACK_DONE' },
  { type: 'BEGIN_FIT' },
  { type: 'ALL_PLACED' },
  { type: 'LACQUER_DONE' },
  { type: 'GILD_DONE' },
  { type: 'BURNISH_DONE' },
  { type: 'BEGIN_AGAIN' },
  { type: 'LOAD_SHELF' },
]

describe('transition', () => {
  it('starts veiled', () => {
    expect(createInitialState()).toEqual({ phase: 'veiled', severity: null, fromShelf: false })
    expect(PHASES[0]).toBe('veiled')
  })

  it('walks the full drop ritual', () => {
    const phases = []
    let s = createInitialState()
    for (const e of [
      { type: 'UNVEIL' },
      { type: 'LIFT' },
      { type: 'IMPACT', severity: 'drop' },
      { type: 'CRACK_DONE' },
      { type: 'BEGIN_FIT' },
      { type: 'ALL_PLACED' },
      { type: 'LACQUER_DONE' },
      { type: 'GILD_DONE' },
      { type: 'BURNISH_DONE' },
      { type: 'BEGIN_AGAIN' },
    ]) {
      s = transition(s, e)
      phases.push(s.phase)
    }
    expect(phases).toEqual([
      'intact', 'held', 'cracking', 'broken', 'fitting',
      'lacquer', 'gild', 'burnish', 'keep', 'veiled',
    ])
    expect(s).toEqual(createInitialState())
  })

  it('a hairline skips fitting and goes straight to lacquer', () => {
    const s = run(at('held'), { type: 'IMPACT', severity: 'hairline' })
    expect(s).toMatchObject({ phase: 'cracking', severity: 'hairline' })
    expect(transition(s, { type: 'CRACK_DONE' }).phase).toBe('lacquer')
  })

  it('drop and fling both break the bowl, from held or intact', () => {
    for (const from of ['held', 'intact']) {
      for (const severity of ['drop', 'fling']) {
        const s = transition(at(from), { type: 'IMPACT', severity })
        expect(s).toMatchObject({ phase: 'cracking', severity })
        expect(transition(s, { type: 'CRACK_DONE' }).phase).toBe('broken')
      }
    }
  })

  it('a set impact leaves the bowl intact', () => {
    expect(transition(at('held'), { type: 'IMPACT', severity: 'set' }).phase).toBe('intact')
    const intact = at('intact')
    expect(transition(intact, { type: 'IMPACT', severity: 'set' })).toBe(intact)
  })

  it('lift and set down toggle held/intact', () => {
    expect(run(at('intact'), { type: 'LIFT' }, { type: 'SET_DOWN' }).phase).toBe('intact')
  })

  it('LOAD_SHELF jumps to keep from every phase', () => {
    for (const phase of PHASES) {
      const s = transition(at(phase), { type: 'LOAD_SHELF', severity: 'fling' })
      expect(s).toMatchObject({ phase: 'keep', fromShelf: true, severity: 'fling' })
    }
    expect(transition(at('held', { severity: 'drop' }), { type: 'LOAD_SHELF' }).severity).toBe('drop')
  })

  it('illegal events return the identical state object', () => {
    const legal = new Set([
      'veiled:UNVEIL', 'intact:LIFT', 'held:SET_DOWN',
      'held:IMPACT:set', 'held:IMPACT:hairline', 'held:IMPACT:drop', 'held:IMPACT:fling',
      'intact:IMPACT:hairline', 'intact:IMPACT:drop', 'intact:IMPACT:fling',
      'cracking:CRACK_DONE', 'broken:BEGIN_FIT', 'fitting:ALL_PLACED',
      'lacquer:LACQUER_DONE', 'gild:GILD_DONE', 'burnish:BURNISH_DONE', 'keep:BEGIN_AGAIN',
    ])
    let illegal = 0
    for (const phase of PHASES) {
      for (const e of EVENTS) {
        if (e.type === 'LOAD_SHELF') continue
        const key = [phase, e.type, e.severity].filter(Boolean).join(':')
        const s = at(phase, { severity: 'drop' })
        const next = transition(s, e)
        if (legal.has(key)) {
          expect(next, key).not.toBe(s)
        } else {
          expect(next, key).toBe(s)
          illegal += 1
        }
      }
    }
    expect(illegal).toBeGreaterThan(100)
  })

  it('ignores malformed events and unknown severities', () => {
    const s = at('held')
    expect(transition(s, undefined)).toBe(s)
    expect(transition(s, {})).toBe(s)
    expect(transition(s, { type: 'EXPLODE' })).toBe(s)
    expect(transition(s, { type: 'IMPACT' })).toBe(s)
    expect(transition(s, { type: 'IMPACT', severity: 'shatter' })).toBe(s)
  })

  it('event names from Object.prototype are illegal, not phases', () => {
    for (const phase of PHASES) {
      const s = at(phase)
      for (const type of ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf']) {
        expect(transition(s, { type }), `${phase}:${type}`).toBe(s)
      }
    }
    const weird = { ...createInitialState(), phase: '__proto__' }
    expect(transition(weird, { type: 'hasOwnProperty' })).toBe(weird)
  })

  it('LOAD_SHELF ignores a severity that could not have broken a bowl', () => {
    const s = at('veiled', { severity: null })
    expect(transition(s, { type: 'LOAD_SHELF', severity: 'set' }).severity).toBeNull()
    expect(transition(s, { type: 'LOAD_SHELF', severity: 'shatter' }).severity).toBeNull()
    expect(transition(s, { type: 'LOAD_SHELF', severity: 'hairline' }).severity).toBe('hairline')
  })

  it('never mutates the input state', () => {
    const s = Object.freeze(at('held'))
    expect(() => transition(s, { type: 'IMPACT', severity: 'drop' })).not.toThrow()
    expect(s.phase).toBe('held')
  })
})

describe('STAGE_WORD', () => {
  it('has one word per phase, blank while veiled or cracking', () => {
    expect(Object.keys(STAGE_WORD).sort()).toEqual([...PHASES].sort())
    expect(STAGE_WORD.veiled).toBe('')
    expect(STAGE_WORD.cracking).toBe('')
    expect(STAGE_WORD.intact).toBe('Hold.')
    expect(STAGE_WORD.fitting).toBe('Mend.')
    expect(STAGE_WORD.lacquer).toBe('Lacquer.')
    expect(STAGE_WORD.gild).toBe('Gild.')
    expect(STAGE_WORD.burnish).toBe('Burnish.')
    expect(STAGE_WORD.keep).toBe('Keep.')
  })

  it('uses only the six ritual words', () => {
    const words = new Set(Object.values(STAGE_WORD).filter(Boolean))
    expect([...words].sort()).toEqual(['Burnish.', 'Gild.', 'Hold.', 'Keep.', 'Lacquer.', 'Mend.'])
  })
})
