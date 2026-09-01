import { describe, it, expect } from 'vitest'
import {
  BPM,
  TOTAL_STEPS,
  STEPS_PER_BAR,
  stepDuration,
  noteHz,
  bassNoteForStep,
  arpNoteForStep,
  hatForStep,
  BAR_ROOTS,
} from './synthPatterns.js'

describe('timing', () => {
  it('a 16th step at 112 BPM is ~134ms', () => {
    expect(stepDuration(BPM)).toBeCloseTo(60 / 112 / 4, 6)
  })
})

describe('noteHz', () => {
  it('anchors A4 = 440 and octaves halve', () => {
    expect(noteHz(0)).toBeCloseTo(440)
    expect(noteHz(-12)).toBeCloseTo(220)
    expect(noteHz(-36)).toBeCloseTo(55)
  })
})

describe('bassNoteForStep', () => {
  it('plays the bar root on the downbeat', () => {
    const note = bassNoteForStep(0)
    expect(note).not.toBeNull()
    expect(note.freq).toBeCloseTo(BAR_ROOTS[0])
    expect(note.lengthSteps).toBeGreaterThan(0)
  })

  it('rests where the rhythm says rest', () => {
    expect(bassNoteForStep(1)).toBeNull()
  })

  it('changes root in bar 3 (the F bar)', () => {
    const bar3Downbeat = bassNoteForStep(2 * STEPS_PER_BAR)
    expect(bar3Downbeat.freq).toBeCloseTo(BAR_ROOTS[2])
    expect(bar3Downbeat.freq).not.toBeCloseTo(BAR_ROOTS[0])
  })

  it('loops after the full pattern', () => {
    const a = bassNoteForStep(0)
    const b = bassNoteForStep(TOTAL_STEPS)
    expect(b.freq).toBeCloseTo(a.freq)
  })
})

describe('arpNoteForStep', () => {
  it('plays on even steps only (echo fills the odds)', () => {
    expect(arpNoteForStep(0)).not.toBeNull()
    expect(arpNoteForStep(1)).toBeNull()
  })

  it('changes chord tones between the Am bar and the G bar', () => {
    const am = arpNoteForStep(0)
    const g = arpNoteForStep(3 * STEPS_PER_BAR)
    expect(am).not.toBeCloseTo(g)
  })
})

describe('hatForStep', () => {
  it('ticks closed on offbeats, opens at bar end, rests on the 1', () => {
    expect(hatForStep(2)).toBe('closed')
    expect(hatForStep(15)).toBe('open')
    expect(hatForStep(0)).toBeNull()
  })

  it('adds ghost ticks between the offbeats', () => {
    expect(hatForStep(4)).toBe('ghost')
    expect(hatForStep(12)).toBe('ghost')
  })
})
