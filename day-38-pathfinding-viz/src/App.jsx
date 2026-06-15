import {
  Activity,
  Boxes,
  Gauge,
  Map,
  MousePointer2,
  Play,
  Route,
  Sparkles,
} from 'lucide-react'
import './App.css'

const TOOLS = [
  ['wall', Boxes, 'Walls'],
  ['weight', Gauge, 'Weights'],
  ['start', MousePointer2, 'Start'],
  ['end', Map, 'End'],
]

const STATS = [
  ['Visited', '0'],
  ['Path', '0'],
  ['Cost', '0'],
  ['Compute', '0 ms'],
]

function Stats() {
  return (
    <dl className="stats-grid">
      {STATS.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RoutePanel({ secondary = false }) {
  return (
    <article className="route-panel">
      <header className="panel-header">
        <div>
          <span className="kicker">{secondary ? 'Comparison channel' : 'Primary channel'}</span>
          <h2>{secondary ? 'Dijkstra' : 'A* Manhattan'}</h2>
        </div>
        <label className="select-control">
          <span>Algorithm</span>
          <select defaultValue={secondary ? 'dijkstra' : 'astar-manhattan'}>
            <option value="astar-manhattan">A* Manhattan</option>
            <option value="dijkstra">Dijkstra</option>
          </select>
        </label>
      </header>
      <Stats />
      <div className="grid-placeholder">
        <Route aria-hidden="true" />
        <strong>Navigation surface</strong>
        <span>Canvas renderer online next</span>
      </div>
      <footer className="panel-footer">
        <span className="status-pill"><i /> Ready</span>
        <span>50 × 25 / Shared terrain</span>
      </footer>
    </article>
  )
}

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Route aria-hidden="true" /></span>
          <div>
            <strong>ROUTE LAB</strong>
            <span>Pathfinding systems console</span>
          </div>
        </div>
        <div className="topbar-status">
          <span><Activity aria-hidden="true" /> Engine idle</span>
          <span>Day 38 / 50</span>
        </div>
      </header>

      <main className="workspace">
        <section className="control-deck" aria-label="Pathfinding controls">
          <div className="control-group tool-group">
            <div className="control-heading">
              <span>Terrain tool</span>
              <small>Paint the shared map</small>
            </div>
            <div className="segmented">
              {TOOLS.map(([id, Icon, label], index) => (
                <button className={index === 0 ? 'is-active' : ''} type="button" key={id}>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group action-group">
            <button className="control-button" type="button">
              <Sparkles aria-hidden="true" />
              Generate maze
            </button>
            <button className="control-button" type="button">
              <Boxes aria-hidden="true" />
              Compare mode
            </button>
            <button className="run-button" type="button">
              <Play aria-hidden="true" fill="currentColor" />
              Visualize
              <kbd>Space</kbd>
            </button>
          </div>
        </section>

        <section className="panel-grid" aria-label="Pathfinding visualization panels">
          <RoutePanel />
          <RoutePanel secondary />
        </section>
      </main>
    </div>
  )
}

export default App
