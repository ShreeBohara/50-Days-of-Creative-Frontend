export const PILL_STATE = Object.freeze({
  idle: 'idle',
  playing: 'playing',
  expanded: 'expanded',
})

const PILL_SEQUENCE = [PILL_STATE.idle, PILL_STATE.playing, PILL_STATE.expanded]

export function getNextPillState(current) {
  const currentIndex = PILL_SEQUENCE.indexOf(current)
  if (currentIndex === -1) return PILL_STATE.idle
  return PILL_SEQUENCE[(currentIndex + 1) % PILL_SEQUENCE.length]
}

export function isCompactPillState(state) {
  return state === PILL_STATE.idle || state === PILL_STATE.playing
}
