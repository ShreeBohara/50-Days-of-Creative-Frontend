import { describe, expect, it } from 'vitest'
import { PILL_STATE, getNextPillState, isCompactPillState } from './pillState.js'

describe('dynamic pill states', () => {
  it('cycles through all three densities and returns to idle', () => {
    expect(getNextPillState(PILL_STATE.idle)).toBe(PILL_STATE.playing)
    expect(getNextPillState(PILL_STATE.playing)).toBe(PILL_STATE.expanded)
    expect(getNextPillState(PILL_STATE.expanded)).toBe(PILL_STATE.idle)
  })

  it('identifies the two states that can use one surface button', () => {
    expect(isCompactPillState(PILL_STATE.idle)).toBe(true)
    expect(isCompactPillState(PILL_STATE.playing)).toBe(true)
    expect(isCompactPillState(PILL_STATE.expanded)).toBe(false)
    expect(getNextPillState('unknown')).toBe(PILL_STATE.idle)
  })
})
