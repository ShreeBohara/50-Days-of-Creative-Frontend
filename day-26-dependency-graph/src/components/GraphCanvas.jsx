import { useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3'
import { categoryMeta } from '../data/graphData'
import {
  getCurvedLinkPath,
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

function GraphCanvas({ nodes, links, labelsVisible, layoutVersion }) {
  const containerRef = useRef(null)
  const simulationRef = useRef(null)
  const size = useStageSize(containerRef)
  const [layoutNodes, setLayoutNodes] = useState([])
  const [layoutLinks, setLayoutLinks] = useState([])

  const simulationSeed = useMemo(
    () =>
      nodes.map((node, index) => ({
        ...node,
        radius: getNodeRadius(node),
        ...getInitialPosition(index, nodes.length, size.width, size.height),
      })),
    [nodes, size.height, size.width],
  )

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
    setLayoutNodes(simNodes)
    setLayoutLinks(simLinks)

    return () => simulation.stop()
  }, [layoutVersion, links, simulationSeed, size.height, size.width])

  return (
    <div ref={containerRef} className="graph-canvas-wrap">
      <svg
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
        <g className="graph-viewport">
          <g className="link-layer" aria-hidden="true">
            {layoutLinks.map((link) => {
              const source = link.source
              const target = link.target
              const sourceNode = typeof source === 'object' ? source : null
              const targetNode = typeof target === 'object' ? target : null
              const color = sourceNode ? categoryMeta[sourceNode.category].color : '#94a3b8'
              const width = targetNode
                ? Math.max(1.1, getNodeRadius(targetNode) / 10)
                : 1.2

              return (
                <path
                  key={link.id}
                  className="graph-link"
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
              const showLabel = labelsVisible || node.radius >= 18

              return (
                <g
                  key={node.id}
                  className="graph-node"
                  style={{
                    '--node-color': meta.color,
                    '--node-glow': meta.glow,
                  }}
                  transform={`translate(${node.x ?? 0} ${node.y ?? 0})`}
                  aria-label={`${node.name} ${node.version}`}
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
