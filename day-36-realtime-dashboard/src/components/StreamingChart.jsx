import { useEffect, useMemo, useRef } from 'react'
import {
  curveMonotoneX,
  easeLinear,
  extent,
  line,
  scaleLinear,
  scaleTime,
  select,
  timeFormat,
} from 'd3'
import { CHART_METRIC_IDS, METRICS_BY_ID } from '../data/metrics'

const WIDTH = 980
const HEIGHT = 300
const MARGIN = { top: 16, right: 54, bottom: 30, left: 44 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const formatTime = timeFormat('%H:%M:%S')

export function StreamingChart({ history }) {
  const pathRefs = useRef({})
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
    CHART_METRIC_IDS.forEach((metricId) => {
      const path = pathRefs.current[metricId]
      if (!path) {
        return
      }

      select(path)
        .interrupt()
        .transition()
        .duration(95)
        .ease(easeLinear)
        .attr('d', paths[metricId])
    })
  }, [paths])

  const xTicks = scales.x.ticks(6)
  const percentTicks = scales.percent.ticks(4)
  const networkTicks = scales.network.ticks(4)

  return (
    <div className="stream-chart-wrap">
      <div className="chart-legend" aria-label="Chart series">
        {CHART_METRIC_IDS.map((metricId) => {
          const metric = METRICS_BY_ID.get(metricId)
          return (
            <span key={metricId}>
              <i style={{ '--series-color': metric.color }} aria-hidden="true"></i>
              {metric.label}
            </span>
          )
        })}
      </div>
      <svg
        className="stream-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Rolling line chart showing CPU, memory, network in, and network out"
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
          {CHART_METRIC_IDS.map((metricId) => {
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
          })}
        </g>
      </svg>
    </div>
  )
}
