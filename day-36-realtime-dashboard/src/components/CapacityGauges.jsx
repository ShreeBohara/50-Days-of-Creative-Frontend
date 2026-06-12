import { useMemo } from 'react'
import { arc } from 'd3'
import {
  GAUGE_METRIC_IDS,
  METRICS_BY_ID,
  formatMetricValue,
  getSeverity,
} from '../data/metrics'

const START_ANGLE = (-120 * Math.PI) / 180
const END_ANGLE = (120 * Math.PI) / 180
const ZONES = [
  { start: 0, end: 0.7, color: '#34d399' },
  { start: 0.7, end: 0.85, color: '#fbbf24' },
  { start: 0.85, end: 1, color: '#fb7185' },
]

function RadialGauge({ metricId, thresholds, value }) {
  const metric = METRICS_BY_ID.get(metricId)
  const severity = getSeverity(metricId, value, thresholds)
  const ratio = Math.min(1, Math.max(0, value / metric.max))
  const needleRotation = -120 + ratio * 240
  const zonePaths = useMemo(
    () =>
      ZONES.map((zone) =>
        arc()({
          innerRadius: 53,
          outerRadius: 62,
          startAngle: START_ANGLE + zone.start * (END_ANGLE - START_ANGLE),
          endAngle: START_ANGLE + zone.end * (END_ANGLE - START_ANGLE),
          cornerRadius: 3,
        }),
      ),
    [],
  )

  return (
    <article className="radial-gauge" aria-label={`${metric.label} gauge, ${formatMetricValue(metricId, value)}, ${severity}`}>
      <svg viewBox="0 0 160 132" role="img" aria-hidden="true">
        <g transform="translate(80 77)">
          {zonePaths.map((path, index) => (
            <path
              className="gauge-zone"
              d={path}
              key={ZONES[index].color}
              style={{ '--zone-color': ZONES[index].color }}
            />
          ))}
        </g>
        <g
          className="gauge-needle"
          style={{
            transform: `rotate(${needleRotation}deg)`,
            transformOrigin: '80px 77px',
          }}
        >
          <line x1="80" x2="80" y1="77" y2="29" />
          <circle cx="80" cy="77" r="5" />
        </g>
        <text className="gauge-value" x="80" y="103">
          {formatMetricValue(metricId, value)}
        </text>
        <text className="gauge-label" x="80" y="119">
          {metric.label}
        </text>
      </svg>
      <span className={`gauge-status severity-${severity}`}>{severity}</span>
    </article>
  )
}

export function CapacityGauges({ sample, thresholds }) {
  return (
    <div className="gauge-cluster">
      {GAUGE_METRIC_IDS.map((metricId) => (
        <RadialGauge
          key={metricId}
          metricId={metricId}
          thresholds={thresholds}
          value={sample[metricId]}
        />
      ))}
    </div>
  )
}
