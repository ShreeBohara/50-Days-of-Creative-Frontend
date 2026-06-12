import { useMemo } from 'react'
import {
  ArrowDownToLine,
  ArrowDownRight,
  ArrowUpFromLine,
  ArrowUpRight,
  Cpu,
  HardDrive,
  MemoryStick,
  Minus,
  Users,
} from 'lucide-react'
import { curveMonotoneX, line, scaleLinear } from 'd3'
import {
  MAX_SPARKLINE_SAMPLES,
  formatMetricValue,
  getMetricTrend,
  getSeverity,
} from '../data/metrics'

const ICONS = {
  cpu: Cpu,
  memory: MemoryStick,
  disk: HardDrive,
  networkIn: ArrowDownToLine,
  networkOut: ArrowUpFromLine,
  activeUsers: Users,
}

const STATUS_LABELS = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
}

function Sparkline({ history, metric }) {
  const path = useMemo(() => {
    const samples = history.slice(-MAX_SPARKLINE_SAMPLES)
    const x = scaleLinear().domain([0, samples.length - 1]).range([2, 178])
    const y = scaleLinear().domain([0, metric.max]).range([42, 2])

    return line()
      .x((_, index) => x(index))
      .y((sample) => y(sample[metric.id]))
      .curve(curveMonotoneX)(samples)
  }, [history, metric])

  return (
    <svg
      className="sparkline"
      viewBox="0 0 180 44"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${metric.label} recent trend`}
    >
      <path d={path} style={{ '--metric-color': metric.color }} />
    </svg>
  )
}

export function MetricCard({ history, metric, thresholds }) {
  const currentValue = history.at(-1)[metric.id]
  const severity = getSeverity(metric.id, currentValue, thresholds)
  const trend = getMetricTrend(history, metric.id)
  const TrendIcon = trend > 0.4 ? ArrowUpRight : trend < -0.4 ? ArrowDownRight : Minus
  const MetricIcon = ICONS[metric.id]

  return (
    <article
      className={`metric-card severity-${severity}`}
      style={{ '--metric-color': metric.color }}
      aria-label={`${metric.label}: ${formatMetricValue(metric.id, currentValue)}, ${STATUS_LABELS[severity]}`}
    >
      <div className="metric-card-top">
        <span className="metric-icon" aria-hidden="true">
          <MetricIcon size={15} strokeWidth={2} />
        </span>
        <span className={`severity-label severity-${severity}`}>
          <i aria-hidden="true"></i>
          {STATUS_LABELS[severity]}
        </span>
      </div>
      <div className="metric-heading">
        <span>{metric.label}</span>
        <strong>{formatMetricValue(metric.id, currentValue)}</strong>
      </div>
      <div className="metric-card-bottom">
        <span className={`metric-trend ${trend >= 0 ? 'is-up' : 'is-down'}`}>
          <TrendIcon size={13} aria-hidden="true" />
          {Math.abs(trend).toFixed(metric.decimals)}
        </span>
        <Sparkline history={history} metric={metric} />
      </div>
    </article>
  )
}
