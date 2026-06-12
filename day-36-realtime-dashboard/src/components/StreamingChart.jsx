import { useEffect, useMemo, useRef, useState } from 'react'
import {
  bisector,
  curveMonotoneX,
  easeLinear,
  extent,
  line,
  scaleLinear,
  scaleTime,
  select,
  timeFormat,
} from 'd3'
import { CHART_METRIC_IDS, METRICS_BY_ID, formatMetricValue } from '../data/metrics'
import { useReducedMotion } from '../hooks/useReducedMotion'

const WIDTH = 980
const HEIGHT = 300
const MARGIN = { top: 16, right: 54, bottom: 30, left: 44 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const formatTime = timeFormat('%H:%M:%S')

export function StreamingChart({ history }) {
  const wrapperRef = useRef(null)
  const pathRefs = useRef({})
  const reducedMotion = useReducedMotion()
  const [visibleMetricIds, setVisibleMetricIds] = useState(() => new Set(CHART_METRIC_IDS))
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [containerWidth, setContainerWidth] = useState(WIDTH)

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) {
      return undefined
    }

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const scales = useMemo(() => {
    const timeDomain = extent(history, (sample) => sample.timestamp)
    return {
      x: scaleTime().domain(timeDomain).range([MARGIN.left, MARGIN.left + PLOT_WIDTH]),
      percent: scaleLinear().domain([0, 100]).range([MARGIN.top + PLOT_HEIGHT, MARGIN.top]),
      network: scaleLinear().domain([0, 1000]).range([MARGIN.top + PLOT_HEIGHT, MARGIN.top]),
    }
  }, [history])

  const paths = useMemo(
    () =>
      Object.fromEntries(
        CHART_METRIC_IDS.map((metricId) => {
          const yScale = metricId.startsWith('network') ? scales.network : scales.percent
          return [
            metricId,
            line()
              .x((sample) => scales.x(sample.timestamp))
              .y((sample) => yScale(sample[metricId]))
              .curve(curveMonotoneX)(history),
          ]
        }),
      ),
    [history, scales],
  )

  useEffect(() => {
    visibleMetricIds.forEach((metricId) => {
      const path = pathRefs.current[metricId]
      if (!path) {
        return
      }

      select(path)
        .interrupt()
        .transition()
        .duration(reducedMotion ? 0 : 95)
        .ease(easeLinear)
        .attr('d', paths[metricId])
    })
  }, [paths, reducedMotion, visibleMetricIds])

  const xTicks = scales.x.ticks(containerWidth < 760 ? 4 : 6)
  const percentTicks = scales.percent.ticks(4)
  const networkTicks = scales.network.ticks(4)
  const hoveredSample = hoveredIndex === null ? null : history[hoveredIndex]
  const hoverX = hoveredSample ? scales.x(hoveredSample.timestamp) : null
  const tooltipX = hoverX && hoverX > WIDTH * 0.68 ? hoverX - 202 : (hoverX ?? 0) + 12

  const toggleMetric = (metricId) => {
    setVisibleMetricIds((currentIds) => {
      const nextIds = new Set(currentIds)
      if (nextIds.has(metricId)) {
        nextIds.delete(metricId)
      } else {
        nextIds.add(metricId)
      }
      return nextIds
    })
  }

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH
    const timestamp = scales.x.invert(pointerX).valueOf()
    const findIndex = bisector((sample) => sample.timestamp).center
    setHoveredIndex(findIndex(history, timestamp))
  }

  return (
    <div className="stream-chart-wrap" ref={wrapperRef}>
      <div className="chart-legend" aria-label="Chart series">
        {CHART_METRIC_IDS.map((metricId) => {
          const metric = METRICS_BY_ID.get(metricId)
          return (
            <button
              type="button"
              key={metricId}
              className={visibleMetricIds.has(metricId) ? 'is-visible' : ''}
              aria-pressed={visibleMetricIds.has(metricId)}
              onClick={() => toggleMetric(metricId)}
            >
              <i style={{ '--series-color': metric.color }} aria-hidden="true"></i>
              {metric.label}
            </button>
          )
        })}
      </div>
      <div className="stream-chart-scroll">
        <svg
          className="stream-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Rolling line chart showing CPU, memory, network in, and network out"
          onPointerLeave={() => setHoveredIndex(null)}
          onPointerMove={handlePointerMove}
        >
          <defs>
            <clipPath id="stream-plot-clip">
              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={PLOT_WIDTH}
                height={PLOT_HEIGHT}
                rx="3"
              />
            </clipPath>
          </defs>

          <g className="chart-grid" aria-hidden="true">
            {percentTicks.map((tick) => (
              <line
                key={`y-${tick}`}
                x1={MARGIN.left}
                x2={MARGIN.left + PLOT_WIDTH}
                y1={scales.percent(tick)}
                y2={scales.percent(tick)}
              />
            ))}
            {xTicks.map((tick) => (
              <line
                key={`x-${tick.valueOf()}`}
                x1={scales.x(tick)}
                x2={scales.x(tick)}
                y1={MARGIN.top}
                y2={MARGIN.top + PLOT_HEIGHT}
              />
            ))}
          </g>

          <g className="chart-axis chart-axis-left" aria-hidden="true">
            {percentTicks.map((tick) => (
              <text key={tick} x={MARGIN.left - 9} y={scales.percent(tick)}>
                {tick}%
              </text>
            ))}
          </g>
          <g className="chart-axis chart-axis-right" aria-hidden="true">
            {networkTicks.map((tick) => (
              <text key={tick} x={MARGIN.left + PLOT_WIDTH + 9} y={scales.network(tick)}>
                {tick}
              </text>
            ))}
          </g>
          <g className="chart-axis chart-axis-bottom" aria-hidden="true">
            {xTicks.map((tick) => (
              <text key={tick.valueOf()} x={scales.x(tick)} y={HEIGHT - 8}>
                {formatTime(tick)}
              </text>
            ))}
          </g>

          <g clipPath="url(#stream-plot-clip)">
            {CHART_METRIC_IDS.filter((metricId) => visibleMetricIds.has(metricId)).map(
              (metricId) => {
                const metric = METRICS_BY_ID.get(metricId)
                return (
                  <path
                    className="stream-line"
                    d={paths[metricId]}
                    key={metricId}
                    ref={(node) => {
                      pathRefs.current[metricId] = node
                    }}
                    style={{ '--series-color': metric.color }}
                  />
                )
              },
            )}
            {hoveredSample ? (
              <g className="chart-crosshair">
                <line
                  x1={hoverX}
                  x2={hoverX}
                  y1={MARGIN.top}
                  y2={MARGIN.top + PLOT_HEIGHT}
                />
                {CHART_METRIC_IDS.filter((metricId) => visibleMetricIds.has(metricId)).map(
                  (metricId) => {
                    const metric = METRICS_BY_ID.get(metricId)
                    const yScale = metricId.startsWith('network')
                      ? scales.network
                      : scales.percent
                    return (
                      <circle
                        key={metricId}
                        cx={hoverX}
                        cy={yScale(hoveredSample[metricId])}
                        r="3.5"
                        style={{ '--series-color': metric.color }}
                      />
                    )
                  },
                )}
              </g>
            ) : null}
          </g>

          <rect
            className="chart-hit-area"
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
          />

          {hoveredSample ? (
            <g className="chart-tooltip" transform={`translate(${tooltipX} ${MARGIN.top + 8})`}>
              <rect width="190" height="94" rx="6" />
              <text className="tooltip-time" x="10" y="16">
                {formatTime(new Date(hoveredSample.timestamp))}
              </text>
              {CHART_METRIC_IDS.map((metricId, index) => {
                const metric = METRICS_BY_ID.get(metricId)
                return (
                  <g key={metricId} transform={`translate(10 ${31 + index * 15})`}>
                    <circle r="2.5" cy="-2" style={{ '--series-color': metric.color }} />
                    <text x="8">{metric.label}</text>
                    <text className="tooltip-value" x="170">
                      {formatMetricValue(metricId, hoveredSample[metricId])}
                    </text>
                  </g>
                )
              })}
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  )
}
