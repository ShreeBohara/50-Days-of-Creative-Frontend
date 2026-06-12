export const MAX_CHART_SAMPLES = 200
export const MAX_SPARKLINE_SAMPLES = 60
export const MAX_ALERTS = 50

export const METRICS = [
  {
    id: 'cpu',
    label: 'CPU',
    unit: '%',
    color: '#22d3ee',
    max: 100,
    decimals: 1,
    base: 43,
    volatility: 4.8,
    period: 34,
    periodAmplitude: 8,
  },
  {
    id: 'memory',
    label: 'Memory',
    unit: '%',
    color: '#a78bfa',
    max: 100,
    decimals: 1,
    base: 61,
    volatility: 2.2,
    period: 58,
    periodAmplitude: 5,
  },
  {
    id: 'disk',
    label: 'Disk',
    unit: '%',
    color: '#38bdf8',
    max: 100,
    decimals: 1,
    base: 67,
    volatility: 0.7,
    period: 92,
    periodAmplitude: 2.5,
  },
  {
    id: 'networkIn',
    label: 'Network In',
    unit: ' Mbps',
    color: '#2dd4bf',
    max: 1000,
    decimals: 0,
    base: 420,
    volatility: 42,
    period: 27,
    periodAmplitude: 105,
  },
  {
    id: 'networkOut',
    label: 'Network Out',
    unit: ' Mbps',
    color: '#818cf8',
    max: 850,
    decimals: 0,
    base: 310,
    volatility: 32,
    period: 31,
    periodAmplitude: 82,
  },
  {
    id: 'activeUsers',
    label: 'Active Users',
    unit: '',
    color: '#f472b6',
    max: 1800,
    decimals: 0,
    base: 820,
    volatility: 30,
    period: 46,
    periodAmplitude: 130,
  },
]

export const METRICS_BY_ID = new Map(METRICS.map((metric) => [metric.id, metric]))

export const CHART_METRIC_IDS = ['cpu', 'memory', 'networkIn', 'networkOut']
export const GAUGE_METRIC_IDS = ['cpu', 'memory', 'disk']

export const DEFAULT_THRESHOLDS = {
  cpu: { warning: 70, critical: 85 },
  memory: { warning: 75, critical: 88 },
  disk: { warning: 80, critical: 92 },
  networkIn: { warning: 700, critical: 850 },
  networkOut: { warning: 560, critical: 700 },
  activeUsers: { warning: 1200, critical: 1450 },
}

export function formatMetricValue(metricId, value) {
  const metric = METRICS_BY_ID.get(metricId)
  if (!metric) {
    return String(value)
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: metric.decimals,
    minimumFractionDigits: metric.decimals,
  }).format(value)}${metric.unit}`
}

export function getSeverity(metricId, value, thresholds = DEFAULT_THRESHOLDS) {
  const metricThresholds = thresholds[metricId]
  if (value >= metricThresholds.critical) {
    return 'critical'
  }
  if (value >= metricThresholds.warning) {
    return 'warning'
  }
  return 'normal'
}

export function getMetricTrend(history, metricId) {
  if (history.length < 8) {
    return 0
  }

  const latest = history.at(-1)[metricId]
  const earlier = history.at(-8)[metricId]
  return latest - earlier
}
