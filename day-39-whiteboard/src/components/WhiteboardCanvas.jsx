import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_VIEWPORT,
  translateViewport,
  zoomViewport,
} from '../utils/viewport'
import { useWhiteboardStore } from '../store/useWhiteboardStore'

const GRID_SIZE = 32

function drawGrid(context, rect, viewport) {
  const scaledGrid = GRID_SIZE * viewport.scale

  if (scaledGrid < 8) {
    return
  }

  const offsetX = ((viewport.x % scaledGrid) + scaledGrid) % scaledGrid
  const offsetY = ((viewport.y % scaledGrid) + scaledGrid) % scaledGrid

  context.fillStyle = 'rgba(13, 148, 136, 0.22)'

  for (let x = offsetX; x < rect.width; x += scaledGrid) {
    for (let y = offsetY; y < rect.height; y += scaledGrid) {
      context.beginPath()
      context.arc(x, y, 1.15, 0, Math.PI * 2)
      context.fill()
    }
  }
}

function WhiteboardCanvas() {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const panRef = useRef(null)
  const [isPanning, setIsPanning] = useState(false)
  const viewport = useWhiteboardStore((state) => state.viewport)
  const showGrid = useWhiteboardStore((state) => state.showGrid)
  const setViewport = useWhiteboardStore((state) => state.setViewport)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(rect.width * ratio))
    const height = Math.max(1, Math.round(rect.height * ratio))

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, rect.width, rect.height)
    context.fillStyle = '#f8fffd'
    context.fillRect(0, 0, rect.width, rect.height)

    if (showGrid) {
      drawGrid(context, rect, viewport)
    }

    context.strokeStyle = 'rgba(249, 115, 22, 0.35)'
    context.lineWidth = 1
    context.strokeRect(
      viewport.x - 80,
      viewport.y - 80,
      160 * viewport.scale,
      160 * viewport.scale,
    )
  }, [showGrid, viewport])

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(render)
  }, [render])

  useEffect(() => {
    const canvas = canvasRef.current
    const observer = new ResizeObserver(scheduleRender)

    observer.observe(canvas)
    scheduleRender()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [scheduleRender])

  useEffect(() => {
    scheduleRender()
  }, [scheduleRender, viewport])

  const pointFromEvent = useCallback((event) => {
    const rect = canvasRef.current.getBoundingClientRect()

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }, [])

  const handleWheel = useCallback((event) => {
    event.preventDefault()
    const point = pointFromEvent(event)
    const zoomDirection = event.deltaY > 0 ? 0.9 : 1.1

    setViewport(zoomViewport(viewport, point, viewport.scale * zoomDirection))
  }, [pointFromEvent, setViewport, viewport])

  const handlePointerDown = useCallback((event) => {
    if (event.button !== 1) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    panRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      viewport,
    }
    setIsPanning(true)
  }, [viewport])

  const handlePointerMove = useCallback((event) => {
    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      return
    }

    setViewport(translateViewport(pan.viewport, {
      x: event.clientX - pan.x,
      y: event.clientY - pan.y,
    }))
  }, [setViewport])

  const stopPanning = useCallback((event) => {
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null
      setIsPanning(false)
    }
  }, [])

  const resetViewport = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT)
  }, [setViewport])

  return (
    <div className={isPanning ? 'canvas-shell is-panning' : 'canvas-shell'}>
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        aria-label="Infinite whiteboard canvas"
        onDoubleClick={resetViewport}
        onPointerCancel={stopPanning}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onWheel={handleWheel}
      />
    </div>
  )
}

export default WhiteboardCanvas
