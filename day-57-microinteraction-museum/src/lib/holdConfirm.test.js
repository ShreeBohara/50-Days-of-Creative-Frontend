import { describe, expect, it } from 'vitest'
import {
  HOLD_PHASE,
  getCrossedHoldMilestones,
  getHoldProgress,
  getNextHoldPhase,
} from './holdConfirm.js'

describe('hold confirmation timing', () => {
  it('clamps progress to the 1.2 second interaction', () => {
    expect(getHoldProgress(-20)).toBe(0)
    expect(getHoldProgress(300)).toBe(0.25)
    expect(getHoldProgress(1200)).toBe(1)
    expect(getHoldProgress(1800)).toBe(1)
  })

  it('reports every milestone crossed by a frame', () => {
    expect(getCrossedHoldMilestones(0.2, 0.76)).toEqual([0.25, 0.5, 0.75])
    expect(getCrossedHoldMilestones(0.76, 0.4)).toEqual([])
  })

  it('keeps completion and cancellation as explicit states', () => {
    expect(getNextHoldPhase(HOLD_PHASE.idle, 'press')).toBe(HOLD_PHASE.holding)
    expect(getNextHoldPhase(HOLD_PHASE.holding, 'release')).toBe(HOLD_PHASE.cancelling)
    expect(getNextHoldPhase(HOLD_PHASE.cancelling, 'rewind')).toBe(HOLD_PHASE.idle)
    expect(getNextHoldPhase(HOLD_PHASE.holding, 'complete')).toBe(HOLD_PHASE.complete)
    expect(getNextHoldPhase(HOLD_PHASE.complete, 'press')).toBe(HOLD_PHASE.complete)
  })
})
