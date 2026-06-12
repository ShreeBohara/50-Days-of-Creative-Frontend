import { Activity, CircleDot, Server, ShieldCheck } from 'lucide-react'
import { CapacityGauges } from './components/CapacityGauges'
import { MetricCard } from './components/MetricCard'
import { LoadHeatmap } from './components/LoadHeatmap'
import { StreamingChart } from './components/StreamingChart'
import { METRICS } from './data/metrics'
import { useMetricStream } from './hooks/useMetricStream'
import './App.css'

function Panel({ className = '', title, meta, children }) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{meta}</p>
        </div>
      </header>
      {children}
    </section>
  )
}

function App() {
  const stream = useMetricStream()
  const currentSample = stream.history.at(-1)

  return (
    <>
      <a className="skip-link" href="#dashboard">
        Skip to dashboard
      </a>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <Activity size={20} strokeWidth={2.4} />
            </span>
            <div>
              <strong>PulseGrid</strong>
              <span>Infrastructure command center</span>
            </div>
          </div>

          <div className="topbar-status" aria-label="System status">
            <div>
              <Server size={15} aria-hidden="true" />
              <span>US-WEST CLUSTER 04</span>
            </div>
            <div className="connection-state">
              <CircleDot size={14} aria-hidden="true" />
              <span>{stream.isPaused ? 'STREAM PAUSED' : 'LIVE STREAM'}</span>
            </div>
            <div>
              <ShieldCheck size={15} aria-hidden="true" />
              <span>12 SERVICES HEALTHY</span>
            </div>
          </div>
        </header>

        <main id="dashboard" className="dashboard">
          <section className="metric-grid" aria-label="Live metric overview">
            {METRICS.map((metric) => (
              <MetricCard
                history={stream.history}
                key={metric.id}
                metric={metric}
                thresholds={stream.thresholds}
              />
            ))}
          </section>

          <section className="primary-grid">
            <Panel
              className="stream-panel"
              title="Traffic Stream"
              meta="Rolling 200-sample telemetry window"
            >
              <StreamingChart history={stream.history} />
            </Panel>

            <Panel
              className="alert-panel"
              title="Alert Log"
              meta="Threshold crossings and incidents"
            >
              <div className="empty-state">
                <ShieldCheck size={24} aria-hidden="true" />
                <strong>No active incidents</strong>
                <span>Monitoring all six signals</span>
              </div>
            </Panel>
          </section>

          <section className="secondary-grid">
            <Panel
              className="heatmap-panel"
              title="Historical Load"
              meta="Hourly utilization across the last seven days"
            >
              <LoadHeatmap />
            </Panel>

            <Panel
              className="gauge-panel"
              title="Capacity Gauges"
              meta="Core resource saturation"
            >
              <CapacityGauges sample={currentSample} thresholds={stream.thresholds} />
            </Panel>
          </section>
        </main>
      </div>
    </>
  )
}

export default App
