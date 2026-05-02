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
import {
  categoryMeta,
  createGraphData,
  expansionLibrary,
  expansionSupportNodes,
} from './data/graphData'

function App() {
  const [graph, setGraph] = useState(() => createGraphData())
  const [query, setQuery] = useState('')
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [viewResetVersion, setViewResetVersion] = useState(0)
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState('aurora-workbench')
  const activeNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0]
  const normalizedQuery = query.trim().toLowerCase()
  const searchMatch = useMemo(() => {
    if (!normalizedQuery) {
      return null
    }

    return (
      graph.nodes.find(
        (node) =>
          node.name.toLowerCase().includes(normalizedQuery) ||
          node.id.toLowerCase().includes(normalizedQuery) ||
          node.description.toLowerCase().includes(normalizedQuery),
      ) ?? null
    )
  }, [graph.nodes, normalizedQuery])

  const categoryCounts = useMemo(
    () =>
      graph.nodes.reduce((counts, node) => {
        counts[node.category] = (counts[node.category] ?? 0) + 1
        return counts
      }, {}),
    [graph.nodes],
  )

  const expandedCount = graph.nodes.filter((node) => node.expanded).length

  const handleSearchChange = (event) => {
    const nextQuery = event.target.value
    const nextNormalizedQuery = nextQuery.trim().toLowerCase()
    const nextMatch = nextNormalizedQuery
      ? graph.nodes.find(
          (node) =>
            node.name.toLowerCase().includes(nextNormalizedQuery) ||
            node.id.toLowerCase().includes(nextNormalizedQuery) ||
            node.description.toLowerCase().includes(nextNormalizedQuery),
        )
      : null

    setQuery(nextQuery)

    if (!nextNormalizedQuery) {
      setHoveredNodeId(null)
      return
    }

    if (nextMatch) {
      setSelectedNodeId(nextMatch.id)
      setHoveredNodeId(nextMatch.id)
    }
  }

  const handleExpandNode = (nodeId) => {
    setGraph((currentGraph) => {
      const sourceNode = currentGraph.nodes.find((node) => node.id === nodeId)
      const expansionNodes = expansionLibrary[nodeId] ?? []

      if (!sourceNode || sourceNode.expanded || !expansionNodes.length) {
        return currentGraph
      }

      const existingIds = new Set(currentGraph.nodes.map((node) => node.id))
      const expansionIds = new Set(expansionNodes.map((node) => node.id))
      const supportIds = new Set(
        expansionNodes.flatMap((node) =>
          node.dependencies.filter((dependencyId) => !existingIds.has(dependencyId)),
        ),
      )
      const supportNodes = expansionSupportNodes.filter(
        (node) => supportIds.has(node.id) && !existingIds.has(node.id) && !expansionIds.has(node.id),
      )
      const nextNodes = currentGraph.nodes.map((node) => {
        if (node.id !== nodeId) {
          return node
        }

        return {
          ...node,
          expanded: true,
          dependencies: [...new Set([...node.dependencies, ...expansionNodes.map((item) => item.id)])],
        }
      })

      expansionNodes.forEach((node) => {
        if (!existingIds.has(node.id)) {
          nextNodes.push({ ...node, expanded: false })
        }
      })

      supportNodes.forEach((node) => {
        nextNodes.push({ ...node, expanded: false })
      })

      return createGraphData(nextNodes)
    })
    setSelectedNodeId(nodeId)
  }

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
            onChange={handleSearchChange}
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
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom to fit"
            onClick={() => setViewResetVersion((version) => version + 1)}
          >
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
            onExpandNode={handleExpandNode}
            searchMatchId={searchMatch?.id ?? null}
            layoutVersion={layoutVersion}
            viewResetVersion={viewResetVersion}
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
            <div className="expand-state">
              <span>{activeNode.expanded ? 'Expanded' : 'Collapsed'}</span>
              <strong>
                {expansionLibrary[activeNode.id]?.length
                  ? `${expansionLibrary[activeNode.id].length} hidden packages`
                  : 'No expansion bundle'}
              </strong>
            </div>
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
              <div>
                <dt>Expanded</dt>
                <dd>{expandedCount}</dd>
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
        <span>
          {normalizedQuery && !searchMatch
            ? `No package found for "${query}"`
            : 'Drag nodes, search packages, or inspect dependencies.'}
        </span>
      </footer>
    </main>
  )
}

export default App
