import { MAX_CHART_SAMPLES, METRICS } from './metrics'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const randomSigned = () => Math.random() * 2 - 1

function generateMetricValue(metric, previousValue, tick, sharedLoad, chaosIntensity) {
  const periodicLoad =
    Math.sin(tick / metric.period) * metric.periodAmplitude +
    Math.sin(tick / (metric.period * 0.42)) * metric.periodAmplitude * 0.28
  const target = metric.base + periodicLoad + sharedLoad * metric.max * 0.13
  const meanReversion = (target - previousValue) * (metric.id === 'disk' ? 0.025 : 0.12)
  const noise = randomSigned() * metric.volatility
  const chaosBoost = chaosIntensity * metric.max * (metric.id === 'disk' ? 0.08 : 0.36)

  return clamp(previousValue + meanReversion + noise + chaosBoost, 0, metric.max)
}

export function createSeedSample(timestamp = Date.now()) {
  return METRICS.reduce(
    (sample, metric) => ({
      ...sample,
      [metric.id]: metric.base,
    }),
    { timestamp, tick: 0 },
  )
}

export function createNextSample(previousSample, options = {}) {
  const tick = previousSample.tick + 1
  const timestamp = options.timestamp ?? Date.now()
  const chaosRemaining = options.chaosRemaining ?? 0
  const chaosIntensity = chaosRemaining > 0 ? 0.45 + Math.sin(tick / 3) * 0.15 : 0
  const sharedLoad = Math.sin(tick / 41) * 0.34 + randomSigned() * 0.08

  const sample = METRICS.reduce(
    (nextSample, metric) => ({
      ...nextSample,
      [metric.id]: generateMetricValue(
        metric,
        previousSample[metric.id],
        tick,
        sharedLoad,
        chaosIntensity,
      ),
    }),
    { timestamp, tick },
  )

  sample.networkIn = clamp(sample.networkIn + sample.activeUsers * 0.045, 0, 1000)
  sample.networkOut = clamp(sample.networkOut + sample.activeUsers * 0.032, 0, 850)
  sample.cpu = clamp(sample.cpu + sample.networkIn * 0.009, 0, 100)

  return sample
}

export function createInitialHistory(count = 90) {
  const startTimestamp = Date.now() - count * 100
  const history = [createSeedSample(startTimestamp)]

  for (let index = 1; index < count; index += 1) {
    history.push(
      createNextSample(history.at(-1), {
        timestamp: startTimestamp + index * 100,
      }),
    )
  }

  return history
}

export function appendBoundedSample(history, sample, max = MAX_CHART_SAMPLES) {
  if (history.length < max) {
    return [...history, sample]
  }
  return [...history.slice(history.length - max + 1), sample]
}
