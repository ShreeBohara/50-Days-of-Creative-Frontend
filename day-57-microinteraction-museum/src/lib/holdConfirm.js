export const HOLD_DURATION_MS = 1200
export const HOLD_REWIND_MS = 180
export const HOLD_MILESTONES = Object.freeze([0.25, 0.5, 0.75])

export const HOLD_PHASE = Object.freeze({
  idle: 'idle',
  holding: 'holding',
  cancelling: 'cancelling',
  complete: 'complete',
})

export function getHoldProgress(elapsed, duration = HOLD_DURATION_MS) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0
  if (!Number.isFinite(duration) || duration <= 0) return 1
  return Math.min(1, elapsed / duration)
}

export function getCrossedHoldMilestones(previous, current, milestones = HOLD_MILESTONES) {
  if (current <= previous) return []
  return milestones.filter((milestone) => previous < milestone && current >= milestone)
}

export function getNextHoldPhase(phase, event) {
  if (event === 'press' && (phase === HOLD_PHASE.idle || phase === HOLD_PHASE.cancelling)) {
    return HOLD_PHASE.holding
  }

  if ((event === 'release' || event === 'cancel') && phase === HOLD_PHASE.holding) {
    return HOLD_PHASE.cancelling
  }

  if (event === 'rewind' && phase === HOLD_PHASE.cancelling) {
    return HOLD_PHASE.idle
  }

  if (event === 'complete' && phase === HOLD_PHASE.holding) {
    return HOLD_PHASE.complete
  }

  return phase
}
