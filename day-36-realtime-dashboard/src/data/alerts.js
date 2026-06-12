import { METRICS, getSeverity } from './metrics'

export function createCrossingAlerts(previousSample, nextSample, thresholds) {
  return METRICS.flatMap((metric) => {
    const previousSeverity = getSeverity(metric.id, previousSample[metric.id], thresholds)
    const nextSeverity = getSeverity(metric.id, nextSample[metric.id], thresholds)

    if (nextSeverity === 'normal' || nextSeverity === previousSeverity) {
      return []
    }

    return {
      id: `${nextSample.timestamp}-${metric.id}-${nextSeverity}`,
      metricId: metric.id,
      severity: nextSeverity,
      value: nextSample[metric.id],
      threshold: thresholds[metric.id][nextSeverity],
      timestamp: nextSample.timestamp,
    }
  })
}
