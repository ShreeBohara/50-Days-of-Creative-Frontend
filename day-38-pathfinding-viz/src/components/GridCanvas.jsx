import { memo, useEffect, useRef } from 'react'
import { CELL, cellIndex, cellKey } from '../data/grid'

const COLORS = {
  empty: '#0a1721',
  line: 'rgba(139, 171, 193, 0.13)',
  wall: '#506372',
  wallEdge: '#7890a1',
  weight: '#243646',
  weightMark: '#8196a5',
  start: '#22c55e',
  end: '#f05252',
  visited: '#5c6ff5',
  path: '#f8c44f',
  cursor: '#f4f8fb',
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.roundRect(x, y, width, height, safeRadius)
}

function drawEndpoint(context, cellX, cellY, cellWidth, cellHeight, color, isStart) {
  const centerX = cellX + (cellWidth / 2)
  const centerY = cellY + (cellHeight / 2)
  const radius = Math.max(2, Math.min(cellWidth, cellHeight) * 0.3)
  context.save()
  context.shadowBlur = radius * 2.4
  context.shadowColor = color
  context.fillStyle = color
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.fill()
  context.shadowBlur = 0
  context.strokeStyle = '#061018'
  context.lineWidth = Math.max(1, radius * 0.3)
  context.beginPath()
  if (isStart) {
    context.moveTo(centerX - (radius * 0.28), centerY - (radius * 0.48))
    context.lineTo(centerX + (radius * 0.45), centerY)
    context.lineTo(centerX - (radius * 0.28), centerY + (radius * 0.48))
    context.closePath()
  } else {
    context.moveTo(centerX - (radius * 0.36), centerY - (radius * 0.36))
    context.lineTo(centerX + (radius * 0.36), centerY + (radius * 0.36))
    context.moveTo(centerX + (radius * 0.36), centerY - (radius * 0.36))
    context.lineTo(centerX - (radius * 0.36), centerY + (radius * 0.36))
  }
  context.stroke()
  context.restore()
}

function GridCanvas({
  terrain,
  visited = new Set(),
  path = new Set(),
  cursor = null,
  label = 'Pathfinding terrain grid',
}) {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const render = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      const pixelWidth = Math.max(1, Math.round(rect.width * ratio))
      const pixelHeight = Math.max(1, Math.round(rect.height * ratio))

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, rect.width, rect.height)
      context.fillStyle = COLORS.empty
      context.fillRect(0, 0, rect.width, rect.height)

      const cellWidth = rect.width / terrain.cols
      const cellHeight = rect.height / terrain.rows
      const inset = Math.max(0.5, Math.min(cellWidth, cellHeight) * 0.08)

      for (let y = 0; y < terrain.rows; y += 1) {
        for (let x = 0; x < terrain.cols; x += 1) {
          const left = x * cellWidth
          const top = y * cellHeight
          const key = cellKey(x, y)
          const type = terrain.cells[cellIndex(x, y, terrain.cols)]

          if (type === CELL.WALL) {
            context.fillStyle = COLORS.wall
            roundedRect(context, left + inset, top + inset, cellWidth - (inset * 2), cellHeight - (inset * 2), 2)
            context.fill()
            context.strokeStyle = COLORS.wallEdge
            context.lineWidth = 0.5
            context.stroke()
          } else if (type === CELL.WEIGHT) {
            context.fillStyle = COLORS.weight
            roundedRect(context, left + inset, top + inset, cellWidth - (inset * 2), cellHeight - (inset * 2), 2)
            context.fill()
            context.fillStyle = COLORS.weightMark
            context.beginPath()
            context.arc(left + (cellWidth / 2), top + (cellHeight / 2), Math.max(1, Math.min(cellWidth, cellHeight) * 0.14), 0, Math.PI * 2)
            context.fill()
          }

          if (visited.has(key)) {
            context.fillStyle = COLORS.visited
            context.globalAlpha = 0.78
            context.fillRect(left + inset, top + inset, cellWidth - (inset * 2), cellHeight - (inset * 2))
            context.globalAlpha = 1
          }

          if (path.has(key)) {
            context.fillStyle = COLORS.path
            context.shadowBlur = Math.min(cellWidth, cellHeight)
            context.shadowColor = COLORS.path
            roundedRect(context, left + (cellWidth * 0.2), top + (cellHeight * 0.2), cellWidth * 0.6, cellHeight * 0.6, 3)
            context.fill()
            context.shadowBlur = 0
          }
        }
      }

      context.strokeStyle = COLORS.line
      context.lineWidth = 1
      context.beginPath()
      for (let x = 1; x < terrain.cols; x += 1) {
        const lineX = Math.round(x * cellWidth) + 0.5
        context.moveTo(lineX, 0)
        context.lineTo(lineX, rect.height)
      }
      for (let y = 1; y < terrain.rows; y += 1) {
        const lineY = Math.round(y * cellHeight) + 0.5
        context.moveTo(0, lineY)
        context.lineTo(rect.width, lineY)
      }
      context.stroke()

      drawEndpoint(context, terrain.start.x * cellWidth, terrain.start.y * cellHeight, cellWidth, cellHeight, COLORS.start, true)
      drawEndpoint(context, terrain.end.x * cellWidth, terrain.end.y * cellHeight, cellWidth, cellHeight, COLORS.end, false)

      if (cursor) {
        context.strokeStyle = COLORS.cursor
        context.lineWidth = 2
        context.strokeRect(
          (cursor.x * cellWidth) + 1,
          (cursor.y * cellHeight) + 1,
          cellWidth - 2,
          cellHeight - 2,
        )
      }
    }

    const scheduleRender = () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(render)
    }
    const observer = new ResizeObserver(scheduleRender)
    observer.observe(canvas)
    scheduleRender()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [cursor, path, terrain, visited])

  return (
    <canvas
      aria-label={label}
      className="grid-canvas"
      ref={canvasRef}
      role="img"
      tabIndex="0"
    />
  )
}

export default memo(GridCanvas)
