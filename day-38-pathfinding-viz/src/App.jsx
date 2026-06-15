import { useState } from 'react'
import {
  Activity,
  Boxes,
  Gauge,
  Map,
  MousePointer2,
  Play,
  Route,
  Sparkles,
  Eraser,
} from 'lucide-react'
import GridCanvas from './components/GridCanvas'
import { applyTool, createTerrain, GRID_PRESETS } from './data/grid'
import './App.css'

const TOOLS = [
  ['wall', Boxes, 'Walls'],
  ['weight', Gauge, 'Weights'],
  ['start', MousePointer2, 'Start'],
  ['end', Map, 'End'],
  ['erase', Eraser, 'Erase'],
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

function RoutePanel({ secondary = false, terrain, onApplyCell }) {
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
      <div className="grid-stage">
        <GridCanvas
          label={`${secondary ? 'Comparison' : 'Primary'} pathfinding terrain`}
          terrain={terrain}
          onApplyCell={onApplyCell}
        />
      </div>
      <div className="legend" aria-label="Grid legend">
        <span><i className="legend-start" /> Start</span>
        <span><i className="legend-end" /> End</span>
        <span><i className="legend-wall" /> Wall</span>
        <span><i className="legend-weight" /> Weight ×5</span>
        <span><i className="legend-visited" /> Visited</span>
        <span><i className="legend-path" /> Path</span>
      </div>
      <footer className="panel-footer">
        <span className="status-pill"><i /> Ready</span>
        <span>{terrain.cols} × {terrain.rows} / Shared terrain</span>
      </footer>
    </article>
  )
}

function App() {
  const [terrain, setTerrain] = useState(() => createTerrain())
  const [tool, setTool] = useState('wall')

  const handlePresetChange = (event) => {
    const [cols, rows] = event.target.value.split('x').map(Number)
    setTerrain(createTerrain(cols, rows))
  }

  const handleApplyCell = (x, y) => {
    setTerrain((current) => applyTool(current, x, y, tool))
  }

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
              {TOOLS.map(([id, Icon, label]) => (
                <button
                  aria-pressed={tool === id}
                  className={tool === id ? 'is-active' : ''}
                  onClick={() => setTool(id)}
                  type="button"
                  key={id}
                >
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <label className="preset-control">
              <span className="sr-only">Grid size</span>
              <select defaultValue="50x25" onChange={handlePresetChange}>
                {GRID_PRESETS.map((preset) => (
                  <option value={`${preset.cols}x${preset.rows}`} key={preset.label}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
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
          <RoutePanel terrain={terrain} onApplyCell={handleApplyCell} />
          <RoutePanel secondary terrain={terrain} onApplyCell={handleApplyCell} />
        </section>
      </main>
    </div>
  )
}

export default App
