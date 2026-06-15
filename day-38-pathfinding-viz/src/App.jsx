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
import { ALGORITHMS } from './algorithms/pathfinding'
import { useVisualizer } from './hooks/useVisualizer'
import { generateMaze, MAZE_TYPES } from './data/mazes'
import './App.css'

const TOOLS = [
  ['wall', Boxes, 'Walls'],
  ['weight', Gauge, 'Weights'],
  ['start', MousePointer2, 'Start'],
  ['end', Map, 'End'],
  ['erase', Eraser, 'Erase'],
]

function Stats({ stats }) {
  const values = [
    ['Visited', stats.visited],
    ['Path', stats.pathLength],
    ['Cost', stats.cost],
    ['Compute', `${stats.computationMs.toFixed(2)} ms`],
  ]
  return (
    <dl className="stats-grid">
      {values.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RoutePanel({
  secondary = false,
  terrain,
  onApplyCell,
  algorithm,
  onAlgorithmChange,
  visualizer,
}) {
  const algorithmLabel = ALGORITHMS.find((item) => item.id === algorithm)?.label
  return (
    <article className="route-panel">
      <header className="panel-header">
        <div>
          <span className="kicker">{secondary ? 'Comparison channel' : 'Primary channel'}</span>
          <h2>{algorithmLabel}</h2>
        </div>
        <label className="select-control">
          <span>Algorithm</span>
          <select value={algorithm} onChange={(event) => onAlgorithmChange(event.target.value)}>
            {ALGORITHMS.map((item) => (
              <option value={item.id} key={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
      </header>
      <Stats stats={visualizer.stats} />
      <div className="grid-stage">
        <GridCanvas
          label={`${secondary ? 'Comparison' : 'Primary'} pathfinding terrain`}
          terrain={terrain}
          onApplyCell={onApplyCell}
          disabled={visualizer.isRunning}
          isAnimating={visualizer.isRunning}
          path={visualizer.path}
          visited={visualizer.visited}
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
        <span className={`status-pill is-${visualizer.status}`}><i /> {visualizer.status}</span>
        <span>{terrain.cols} × {terrain.rows} / Shared terrain</span>
      </footer>
    </article>
  )
}

function App() {
  const [terrain, setTerrain] = useState(() => createTerrain())
  const [tool, setTool] = useState('wall')
  const [speed, setSpeed] = useState(12)
  const [primaryAlgorithm, setPrimaryAlgorithm] = useState('astar-manhattan')
  const [secondaryAlgorithm, setSecondaryAlgorithm] = useState('dijkstra')
  const [mazeType, setMazeType] = useState('random')
  const [compareMode, setCompareMode] = useState(false)
  const primaryVisualizer = useVisualizer(terrain, primaryAlgorithm, speed)
  const secondaryVisualizer = useVisualizer(terrain, secondaryAlgorithm, speed)
  const isRunning = primaryVisualizer.isRunning || secondaryVisualizer.isRunning

  const handlePresetChange = (event) => {
    const [cols, rows] = event.target.value.split('x').map(Number)
    setTerrain(createTerrain(cols, rows))
    primaryVisualizer.reset()
    secondaryVisualizer.reset()
  }

  const handleApplyCell = (x, y) => {
    if (isRunning) return
    setTerrain((current) => applyTool(current, x, y, tool))
    primaryVisualizer.reset()
    secondaryVisualizer.reset()
  }

  const handleGenerateMaze = () => {
    primaryVisualizer.reset()
    secondaryVisualizer.reset()
    setTerrain((current) => generateMaze(current, mazeType))
  }

  const handleVisualize = () => {
    if (isRunning) {
      primaryVisualizer.cancel()
      secondaryVisualizer.cancel()
      return
    }
    if (compareMode) {
      void Promise.all([primaryVisualizer.start(), secondaryVisualizer.start()])
    } else {
      void primaryVisualizer.start()
    }
  }

  const handleCompareChange = () => {
    primaryVisualizer.reset()
    secondaryVisualizer.reset()
    setCompareMode((current) => !current)
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
            <label className="maze-control">
              <span className="sr-only">Maze generator</span>
              <select value={mazeType} onChange={(event) => setMazeType(event.target.value)}>
                {MAZE_TYPES.map((maze) => (
                  <option value={maze.id} key={maze.id}>{maze.label}</option>
                ))}
              </select>
            </label>
            <button className="control-button" disabled={isRunning} onClick={handleGenerateMaze} type="button">
              <Sparkles aria-hidden="true" />
              Generate maze
            </button>
            <button
              aria-pressed={compareMode}
              className={`control-button ${compareMode ? 'is-active' : ''}`}
              onClick={handleCompareChange}
              type="button"
            >
              <Boxes aria-hidden="true" />
              {compareMode ? 'Compare on' : 'Compare mode'}
            </button>
            <label className="speed-control">
              <span>Speed <strong>{speed === 0 ? 'Instant' : `${speed} ms`}</strong></span>
              <input
                aria-label="Visualization delay in milliseconds"
                max="50"
                min="0"
                onChange={(event) => setSpeed(Number(event.target.value))}
                type="range"
                value={speed}
              />
            </label>
            <button
              className="run-button"
              onClick={handleVisualize}
              type="button"
            >
              <Play aria-hidden="true" fill="currentColor" />
              {isRunning ? 'Cancel' : 'Visualize'}
              <kbd>Space</kbd>
            </button>
          </div>
        </section>

        <section
          className={`panel-grid ${compareMode ? '' : 'is-single'}`}
          aria-label="Pathfinding visualization panels"
        >
          <RoutePanel
            algorithm={primaryAlgorithm}
            onAlgorithmChange={(algorithm) => {
              primaryVisualizer.reset()
              setPrimaryAlgorithm(algorithm)
            }}
            onApplyCell={handleApplyCell}
            terrain={terrain}
            visualizer={primaryVisualizer}
          />
          {compareMode ? (
            <RoutePanel
              algorithm={secondaryAlgorithm}
              onAlgorithmChange={(algorithm) => {
                secondaryVisualizer.reset()
                setSecondaryAlgorithm(algorithm)
              }}
              onApplyCell={handleApplyCell}
              secondary
              terrain={terrain}
              visualizer={secondaryVisualizer}
            />
          ) : null}
        </section>
      </main>
    </div>
  )
}

export default App
