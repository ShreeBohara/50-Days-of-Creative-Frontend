import { useMemo, useState } from 'react'
import { interpolateRgbBasis, scaleSequential } from 'd3'
import { createHeatmapData, HEATMAP_DAYS } from '../data/heatmap'

const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`
const colorScale = scaleSequential(
  interpolateRgbBasis(['#123b43', '#1f7a63', '#d6a926', '#c65f2e', '#8f2038']),
).domain([0, 100])

export function LoadHeatmap() {
  const [data] = useState(createHeatmapData)
  const [activeCell, setActiveCell] = useState(() => data.find((cell) => cell.day === 'Thu' && cell.hour === 19))
  const cellsByDay = useMemo(
    () =>
      HEATMAP_DAYS.map((day) => ({
        day,
        cells: data.filter((cell) => cell.day === day),
      })),
    [data],
  )

  return (
    <div className="heatmap">
      <div className="heatmap-summary" aria-live="polite">
        <span>{activeCell.day}</span>
        <strong>{formatHour(activeCell.hour)}</strong>
        <b>{activeCell.value}% load</b>
      </div>
      <div className="heatmap-scroll">
        <div className="heatmap-grid">
          <div aria-hidden="true"></div>
          <div className="heatmap-hours" aria-hidden="true">
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour}>{hour % 3 === 0 ? String(hour).padStart(2, '0') : ''}</span>
            ))}
          </div>
          {cellsByDay.map(({ day, cells }) => (
            <div className="heatmap-row" key={day}>
              <span className="heatmap-day" aria-hidden="true">
                {day}
              </span>
              <div className="heatmap-cells">
                {cells.map((cell) => (
                  <button
                    type="button"
                    key={cell.id}
                    className={activeCell.id === cell.id ? 'is-active' : ''}
                    aria-label={`${cell.day} ${formatHour(cell.hour)}, ${cell.value}% load`}
                    onFocus={() => setActiveCell(cell)}
                    onMouseEnter={() => setActiveCell(cell)}
                    onClick={() => setActiveCell(cell)}
                    style={{ '--cell-color': colorScale(cell.value) }}
                  ></button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend" aria-label="Heatmap load scale from low to critical">
        <span>Low</span>
        <i aria-hidden="true"></i>
        <span>Critical</span>
      </div>
    </div>
  )
}
