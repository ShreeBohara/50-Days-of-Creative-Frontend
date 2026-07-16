export const DRAWER_CLOSE_RATIO = 0.4
export const DRAWER_FLING_VELOCITY = 700

export function rubberBand(distance, dimension, constant = 0.55) {
  if (distance <= 0 || dimension <= 0) return 0
  return (distance * dimension * constant) / (dimension + constant * distance)
}

export function applyDrawerResistance(offset, travelLimit) {
  const limit = Math.max(1, travelLimit)

  if (offset < 0) return -rubberBand(Math.abs(offset), limit)
  if (offset > limit) return limit + rubberBand(offset - limit, limit)
  return offset
}

export function shouldCloseDrawer({
  offset,
  height,
  velocity,
  closeRatio = DRAWER_CLOSE_RATIO,
  flingVelocity = DRAWER_FLING_VELOCITY,
}) {
  const crossedDistance = offset >= Math.max(1, height) * closeRatio
  const flungDownward = velocity >= flingVelocity
  return crossedDistance || flungDownward
}

export function estimatePointerVelocity(samples) {
  if (!samples || samples.length < 2) return 0

  const first = samples[0]
  const last = samples[samples.length - 1]
  const elapsedSeconds = (last.time - first.time) / 1000

  if (elapsedSeconds <= 0) return 0
  return (last.y - first.y) / elapsedSeconds
}
