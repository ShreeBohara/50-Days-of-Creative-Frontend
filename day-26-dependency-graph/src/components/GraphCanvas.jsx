import { useEffect, useMemo, useRef, useState } from 'react'
import {
  drag,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  select,
  zoom,
  zoomIdentity,
} from 'd3'
import { categoryMeta } from '../data/graphData'
import {
  getCurvedLinkPath,
  getEndpointId,
  getInitialPosition,
  getNodeRadius,
} from '../utils/graphMetrics'

const MIN_STAGE = {
  width: 720,
  height: 520,
}

function useStageSize(containerRef) {
  const [size, setSize] = useState(MIN_STAGE)

  useEffect(() => {
    const node = containerRef.current
    if (!node) {
      return undefined
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(320, rect.height),
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(node)

    return () => observer.disconnect()
  }, [containerRef])

  return size
}

function GraphCanvas({
  nodes,
  links,
  labelsVisible,
  hoveredNodeId,
  onHoverNode,
  selectedNodeId,
  onSelectNode,
  onExpandNode,
  searchMatchId,
  layoutVersion,
  viewResetVersion,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const simulationRef = useRef(null)
  const zoomBehaviorRef = useRef(null)
  const lastCenteredSearchRef = useRef(null)
  const size = useStageSize(containerRef)
  const [layoutNodes, setLayoutNodes] = useState([])
  const [layoutLinks, setLayoutLinks] = useState([])
  const [viewTransform, setViewTransform] = useState(zoomIdentity)

  const simulationSeed = useMemo(
    () =>
      nodes.map((node, index) => ({
        ...node,
        radius: getNodeRadius(node),
        ...getInitialPosition(index, nodes.length, size.width, size.height),
      })),
    [nodes, size.height, size.width],
  )

  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) {
      return new Set()
    }

    const connected = new Set([hoveredNodeId])
    links.forEach((link) => {
      if (link.source === hoveredNodeId) {
        connected.add(link.target)
      }
      if (link.target === hoveredNodeId) {
        connected.add(link.source)
      }
    })

    return connected
  }, [hoveredNodeId, links])

  useEffect(() => {
    if (!simulationSeed.length) {
      return undefined
    }

    const simNodes = simulationSeed.map((node) => ({ ...node }))
    const simLinks = links.map((link) => ({ ...link }))

    simulationRef.current?.stop()
    const simulation = forceSimulation(simNodes)
      .force(
        'link',
        forceLink(simLinks)
          .id((node) => node.id)
          .distance((link) => {
            const sourceSize = getNodeRadius(link.source)
            const targetSize = getNodeRadius(link.target)
            return 58 + sourceSize + targetSize
          })
          .strength(0.34),
      )
      .force(
        'charge',
        forceManyBody().strength((node) => -240 - getNodeRadius(node) * 18),
      )
      .force(
        'collide',
        forceCollide().radius((node) => getNodeRadius(node) + 8).iterations(2),
      )
      .force('x', forceX(size.width / 2).strength(0.055))
      .force('y', forceY(size.height / 2).strength(0.055))
      .alpha(1)
      .alphaDecay(0.028)
      .on('tick', () => {
        setLayoutNodes([...simNodes])
        setLayoutLinks([...simLinks])
      })

    simulationRef.current = simulation

    return () => simulation.stop()
  }, [layoutVersion, links, simulationSeed, size.height, size.width])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) {
      return undefined
    }

    const zoomBehavior = zoom()
      .scaleExtent([0.45, 2.6])
      .translateExtent([
        [-size.width * 0.8, -size.height * 0.8],
        [size.width * 1.8, size.height * 1.8],
      ])
      .on('zoom', (event) => {
        setViewTransform(event.transform)
      })

    zoomBehaviorRef.current = zoomBehavior
    select(svg).call(zoomBehavior).on('dblclick.zoom', null)

    return () => {
      select(svg).on('.zoom', null)
    }
  }, [size.height, size.width])

  useEffect(() => {
    const svg = svgRef.current
    const zoomBehavior = zoomBehaviorRef.current

    if (!svg || !zoomBehavior) {
      return
    }

    lastCenteredSearchRef.current = null
    select(svg).call(zoomBehavior.transform, zoomIdentity)
  }, [layoutVersion, viewResetVersion])

  useEffect(() => {
    const svg = svgRef.current
    const simulation = simulationRef.current

    if (!svg || !simulation || !layoutNodes.length) {
      return undefined
    }

    const dragBehavior = drag()
      .container(svg)
      .on('start', function handleDragStart(event, node) {
        select(this).classed('is-dragging', true)
        if (!event.active) {
          simulation.alphaTarget(0.28).restart()
        }
        node.fx = node.x
        node.fy = node.y
      })
      .on('drag', (event, node) => {
        const [x, y] = viewTransform.invert([event.x, event.y])
        node.fx = Math.max(18, Math.min(size.width - 18, x))
        node.fy = Math.max(18, Math.min(size.height - 18, y))
        setLayoutNodes([...simulation.nodes()])
      })
      .on('end', function handleDragEnd(event, node) {
        select(this).classed('is-dragging', false)
        if (!event.active) {
          simulation.alphaTarget(0)
        }
        node.fx = null
        node.fy = null
      })

    select(svg).selectAll('.graph-node').data(layoutNodes, (node) => node.id).call(dragBehavior)

    return () => {
      select(svg).selectAll('.graph-node').on('.drag', null)
    }
  }, [layoutNodes, size.height, size.width, viewTransform])

  useEffect(() => {
    if (!searchMatchId) {
      lastCenteredSearchRef.current = null
      return
    }

    if (lastCenteredSearchRef.current === searchMatchId) {
      return
    }

    const match = layoutNodes.find((node) => node.id === searchMatchId)
    if (!match) {
      return
    }

    const nextScale = 1.55
    const nextTransform = zoomIdentity
      .translate(
        size.width / 2 - (match.x ?? 0) * nextScale,
        size.height / 2 - (match.y ?? 0) * nextScale,
      )
      .scale(nextScale)
    const svg = svgRef.current
    const zoomBehavior = zoomBehaviorRef.current

    if (svg && zoomBehavior) {
      select(svg).call(zoomBehavior.transform, nextTransform)
    } else {
      setViewTransform(nextTransform)
    }
    lastCenteredSearchRef.current = searchMatchId
  }, [layoutNodes, searchMatchId, size.height, size.width])

  return (
    <div ref={containerRef} className="graph-canvas-wrap">
      <svg
        ref={svgRef}
        className="graph-canvas"
        viewBox={`0 0 ${size.width} ${size.height}`}
        role="img"
        aria-label="Force-directed npm dependency graph"
      >
        <defs>
          <marker
            id="dependency-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="link-arrow" />
          </marker>
        </defs>
        <g
          className="graph-viewport"
          transform={viewTransform.toString()}
        >
          <g className="link-layer" aria-hidden="true">
            {layoutLinks.map((link) => {
              const source = link.source
              const target = link.target
              const sourceNode = typeof source === 'object' ? source : null
              const targetNode = typeof target === 'object' ? target : null
              const sourceId = getEndpointId(source)
              const targetId = getEndpointId(target)
              const color = sourceNode ? categoryMeta[sourceNode.category].color : '#94a3b8'
              const width = targetNode
                ? Math.max(1.1, getNodeRadius(targetNode) / 10)
                : 1.2
              const isRelated =
                hoveredNodeId && (sourceId === hoveredNodeId || targetId === hoveredNodeId)

              return (
                <path
                  key={link.id}
                  className={[
                    'graph-link',
                    isRelated ? 'is-related' : '',
                    hoveredNodeId && !isRelated ? 'is-dimmed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  d={getCurvedLinkPath(link)}
                  style={{
                    '--link-color': color,
                    '--link-width': width,
                  }}
                  markerEnd="url(#dependency-arrow)"
                />
              )
            })}
          </g>
          <g className="node-layer">
            {layoutNodes.map((node) => {
              const meta = categoryMeta[node.category]
              const isHovered = hoveredNodeId === node.id
              const isSelected = selectedNodeId === node.id
              const isSearchMatch = searchMatchId === node.id
              const isConnected = connectedNodeIds.has(node.id)
              const showLabel =
                labelsVisible || node.radius >= 18 || isHovered || isSelected || isSearchMatch
              const isDimmed = hoveredNodeId && !isConnected

              return (
                <g
                  key={node.id}
                  className={[
                    'graph-node',
                    isHovered ? 'is-hovered' : '',
                    isSelected ? 'is-selected' : '',
                    isSearchMatch ? 'is-search-match' : '',
                    isConnected ? 'is-connected' : '',
                    isDimmed ? 'is-dimmed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    '--node-color': meta.color,
                    '--node-glow': meta.glow,
                  }}
                  transform={`translate(${node.x ?? 0} ${node.y ?? 0})`}
                  aria-label={`${node.name} ${node.version}`}
                  role="button"
                  tabIndex={0}
                  onBlur={() => onHoverNode(null)}
                  onFocus={() => onHoverNode(node.id)}
                  onClick={() => onSelectNode(node.id)}
                  onDoubleClick={(event) => {
                    event.stopPropagation()
                    onExpandNode(node.id)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectNode(node.id)
                    }
                    if (event.key === 'e' || event.key === 'E') {
                      onExpandNode(node.id)
                    }
                  }}
                  onMouseEnter={() => onHoverNode(node.id)}
                  onMouseLeave={() => onHoverNode(null)}
                >
                  <circle className="node-halo" r={node.radius + 8} />
                  <circle className="node-core" r={node.radius} />
                  <circle className="node-rim" r={Math.max(2, node.radius - 3)} />
                  {showLabel && (
                    <text className="node-label" y={node.radius + 18}>
                      {node.name}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </g>
      </svg>
      <div className="simulation-hint" aria-hidden="true">
        <span>{layoutNodes.length} nodes</span>
        <span>{layoutLinks.length} curved links queued</span>
      </div>
    </div>
  )
}

export default GraphCanvas
