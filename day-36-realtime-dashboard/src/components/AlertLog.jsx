import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { METRICS_BY_ID, formatMetricValue } from '../data/metrics'

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function AlertLog({ alerts }) {
  if (!alerts.length) {
    return (
      <div className="empty-state">
        <ShieldCheck size={24} aria-hidden="true" />
        <strong>No active incidents</strong>
        <span>Monitoring all six signals</span>
      </div>
    )
  }

  return (
    <div className="alert-log-wrap">
      <div className="alert-summary">
        <span>Newest first</span>
        <strong>{alerts.length} events</strong>
      </div>
      <ol className="alert-log" role="log" aria-live="polite" aria-label="Threshold alert log">
        {alerts.map((alert) => {
          const metric = METRICS_BY_ID.get(alert.metricId)
          return (
            <li className={`alert-item severity-${alert.severity}`} key={alert.id}>
              <span className="alert-icon" aria-hidden="true">
                <AlertTriangle size={13} />
              </span>
              <div className="alert-copy">
                <div>
                  <strong>{metric.label}</strong>
                  <span className={`alert-badge severity-${alert.severity}`}>{alert.severity}</span>
                </div>
                <p>
                  Reached {formatMetricValue(alert.metricId, alert.value)}
                  <span>Limit {formatMetricValue(alert.metricId, alert.threshold)}</span>
                </p>
              </div>
              <time dateTime={new Date(alert.timestamp).toISOString()}>
                {timeFormatter.format(alert.timestamp)}
              </time>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
