import { useMemo, useState } from 'react'
import {
  BadgeInfo,
  GitBranch,
  Network,
  RotateCcw,
  Search,
  Tags,
  ZoomIn,
} from 'lucide-react'
import './App.css'
import GraphCanvas from './components/GraphCanvas'
import { categoryMeta, createGraphData } from './data/graphData'

function App() {
  const graph = useMemo(() => createGraphData(), [])
  const [query, setQuery] = useState('')
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState('aurora-workbench')
  const activeNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0]

  const categoryCounts = useMemo(
    () =>
      graph.nodes.reduce((counts, node) => {
        counts[node.category] = (counts[node.category] ?? 0) + 1
        return counts
      }, {}),
    [graph.nodes],
  )

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Dependency graph controls">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Network size={22} />
          </span>
          <div>
            <h1>Dependency Graph</h1>
            <p>npm package topology explorer</p>
          </div>
        </div>

        <label className="search-control" htmlFor="package-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search packages</span>
          <input
            id="package-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search packages"
            type="search"
          />
        </label>

        <div className="toolbar-actions">
          <button
            type="button"
            className="control-button"
            onClick={() => setLayoutVersion((version) => version + 1)}
          >
            <RotateCcw size={17} aria-hidden="true" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="control-button"
            aria-pressed={labelsVisible}
            onClick={() => setLabelsVisible((value) => !value)}
          >
            <Tags size={17} aria-hidden="true" />
            <span>{labelsVisible ? 'Labels on' : 'Labels off'}</span>
          </button>
          <button type="button" className="icon-button" aria-label="Zoom to fit">
            <ZoomIn size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="workspace" aria-label="Interactive dependency workspace">
        <section className="graph-stage" aria-label="Dependency graph canvas">
          <GraphCanvas
            nodes={graph.nodes}
            links={graph.links}
            labelsVisible={labelsVisible}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={setHoveredNodeId}
            selectedNodeId={activeNode.id}
            onSelectNode={setSelectedNodeId}
            layoutVersion={layoutVersion}
          />
        </section>

        <aside className="inspector" aria-label="Package details">
          <div className="panel-block">
            <div className="panel-heading">
              <BadgeInfo size={18} aria-hidden="true" />
              <h2>Selected package</h2>
            </div>
            <div className="package-card">
              <span
                className="category-dot"
                style={{ '--category-color': categoryMeta[activeNode.category].color }}
              />
              <div>
                <h3>{activeNode.name}</h3>
                <p>{activeNode.description}</p>
              </div>
            </div>
            <dl className="metric-grid">
              <div>
                <dt>Version</dt>
                <dd>{activeNode.version}</dd>
              </div>
              <div>
                <dt>Depends on</dt>
                <dd>{activeNode.dependencyCount}</dd>
              </div>
              <div>
                <dt>Dependents</dt>
                <dd>{activeNode.dependentCount}</dd>
              </div>
            </dl>
            <div className="dependency-list">
              <h3>Direct dependencies</h3>
              {activeNode.dependencies.length ? (
                <ul>
                  {activeNode.dependencies.map((dependencyId) => {
                    const dependency = graph.nodes.find((node) => node.id === dependencyId)
                    return (
                      <li key={dependencyId}>
                        <span>{dependency?.name ?? dependencyId}</span>
                        {dependency && <small>{categoryMeta[dependency.category].label}</small>}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p>No direct dependencies in this graph.</p>
              )}
            </div>
          </div>

          <div className="panel-block">
            <div className="panel-heading">
              <GitBranch size={18} aria-hidden="true" />
              <h2>Graph stats</h2>
            </div>
            <dl className="stat-list">
              <div>
                <dt>Packages</dt>
                <dd>{graph.nodes.length}</dd>
              </div>
              <div>
                <dt>Dependency edges</dt>
                <dd>{graph.links.length}</dd>
              </div>
              <div>
                <dt>Categories</dt>
                <dd>{Object.keys(categoryCounts).length}</dd>
              </div>
            </dl>
          </div>

          <div className="panel-block">
            <div className="panel-heading">
              <Tags size={18} aria-hidden="true" />
              <h2>Legend</h2>
            </div>
            <ul className="legend-list" aria-label="Package categories">
              {Object.entries(categoryMeta).map(([category, meta]) => (
                <li key={category}>
                  <span
                    className="category-dot"
                    style={{ '--category-color': meta.color }}
                    aria-hidden="true"
                  />
                  <span>{meta.label}</span>
                  <strong>{categoryCounts[category] ?? 0}</strong>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <footer className="status-strip" aria-live="polite">
        <span>Selected: {activeNode.name}</span>
        <span>Drag nodes, search packages, or inspect dependencies.</span>
      </footer>
    </main>
  )
}

export default App
