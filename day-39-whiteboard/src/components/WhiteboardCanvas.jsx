import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createFreehandElement,
  createShapeElement,
  createStickyElement,
  createTextElement,
  getNextZIndex,
  updateShapeGeometry,
} from '../utils/elements'
import { drawElements, drawSelection, getSelectionHandles } from '../utils/drawing'
import {
  boundsFromElement,
  normalizeRect,
  pointDistance,
  resizeElementToBounds,
} from '../utils/geometry'
import { findElementAtPoint } from '../utils/hitTest'
import {
  DEFAULT_VIEWPORT,
  screenToWorld,
  translateViewport,
  worldToScreen,
  zoomViewport,
} from '../utils/viewport'
import { useWhiteboardStore } from '../store/useWhiteboardStore'

const GRID_SIZE = 32
const SHAPE_TOOLS = new Set(['line', 'rectangle', 'ellipse', 'arrow'])

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

function unionBounds(boundsList) {
  if (!boundsList.length) {
    return { x: -500, y: -340, width: 1000, height: 680 }
  }

  const minX = Math.min(...boundsList.map((bounds) => bounds.x))
  const minY = Math.min(...boundsList.map((bounds) => bounds.y))
  const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width))
  const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height))

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function WhiteboardCanvas() {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const minimapRef = useRef(null)
  const panRef = useRef(null)
  const draftRef = useRef(null)
  const eraserRef = useRef(null)
  const moveRef = useRef(null)
  const resizeRef = useRef(null)
  const editorRef = useRef(null)
  const pinchRef = useRef(null)
  const touchPointsRef = useRef(new Map())
  const [isPanning, setIsPanning] = useState(false)
  const [draftElement, setDraftElement] = useState(null)
  const [editing, setEditing] = useState(null)
  const activeTool = useWhiteboardStore((state) => state.activeTool)
  const elements = useWhiteboardStore((state) => state.elements)
  const selectedIds = useWhiteboardStore((state) => state.selectedIds)
  const remoteCursors = useWhiteboardStore((state) => state.remoteCursors)
  const style = useWhiteboardStore((state) => state.style)
  const viewport = useWhiteboardStore((state) => state.viewport)
  const showGrid = useWhiteboardStore((state) => state.showGrid)
  const addElement = useWhiteboardStore((state) => state.addElement)
  const broadcastCursor = useWhiteboardStore((state) => state.broadcastCursor)
  const checkpointHistory = useWhiteboardStore((state) => state.checkpointHistory)
  const clearSelection = useWhiteboardStore((state) => state.clearSelection)
  const moveSelected = useWhiteboardStore((state) => state.moveSelected)
  const replaceElement = useWhiteboardStore((state) => state.replaceElement)
  const removeElements = useWhiteboardStore((state) => state.removeElements)
  const setSelectedIds = useWhiteboardStore((state) => state.setSelectedIds)
  const updateElement = useWhiteboardStore((state) => state.updateElement)
  const setViewport = useWhiteboardStore((state) => state.setViewport)

  useEffect(() => {
    if (editing) {
      editorRef.current?.focus()
      editorRef.current?.select()
    }
  }, [editing])

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

    context.save()
    context.translate(viewport.x, viewport.y)
    context.scale(viewport.scale, viewport.scale)
    drawElements(context, elements, draftElement)
    drawSelection(context, elements, selectedIds)
    context.restore()

    context.strokeStyle = 'rgba(249, 115, 22, 0.35)'
    context.lineWidth = 1
    context.strokeRect(
      viewport.x - 80,
      viewport.y - 80,
      160 * viewport.scale,
      160 * viewport.scale,
    )

    const minimap = minimapRef.current
    const minimapContext = minimap?.getContext('2d')

    if (!minimap || !minimapContext) {
      return
    }

    const minimapRect = minimap.getBoundingClientRect()
    const minimapRatio = window.devicePixelRatio || 1
    const minimapWidth = Math.max(1, Math.round(minimapRect.width * minimapRatio))
    const minimapHeight = Math.max(1, Math.round(minimapRect.height * minimapRatio))

    if (minimap.width !== minimapWidth || minimap.height !== minimapHeight) {
      minimap.width = minimapWidth
      minimap.height = minimapHeight
    }

    const viewportWorldBounds = normalizeRect(
      screenToWorld({ x: 0, y: 0 }, viewport),
      screenToWorld({ x: rect.width, y: rect.height }, viewport),
    )
    const worldBounds = unionBounds([
      viewportWorldBounds,
      ...elements.map(boundsFromElement),
    ])
    const padding = 18
    const scale = Math.min(
      (minimapRect.width - (padding * 2)) / Math.max(1, worldBounds.width),
      (minimapRect.height - (padding * 2)) / Math.max(1, worldBounds.height),
    )
    const toMini = (point) => ({
      x: padding + ((point.x - worldBounds.x) * scale),
      y: padding + ((point.y - worldBounds.y) * scale),
    })

    minimapContext.setTransform(minimapRatio, 0, 0, minimapRatio, 0, 0)
    minimapContext.clearRect(0, 0, minimapRect.width, minimapRect.height)
    minimapContext.fillStyle = 'rgba(255, 255, 255, 0.94)'
    minimapContext.fillRect(0, 0, minimapRect.width, minimapRect.height)
    minimapContext.fillStyle = 'rgba(13, 148, 136, 0.25)'

    elements.forEach((element) => {
      const bounds = boundsFromElement(element)
      const topLeft = toMini(bounds)
      minimapContext.fillRect(
        topLeft.x,
        topLeft.y,
        Math.max(2, bounds.width * scale),
        Math.max(2, bounds.height * scale),
      )
    })

    const viewportPoint = toMini(viewportWorldBounds)
    minimapContext.strokeStyle = '#f97316'
    minimapContext.lineWidth = 2
    minimapContext.strokeRect(
      viewportPoint.x,
      viewportPoint.y,
      Math.max(8, viewportWorldBounds.width * scale),
      Math.max(8, viewportWorldBounds.height * scale),
    )
  }, [draftElement, elements, selectedIds, showGrid, viewport])

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

  const worldPointFromEvent = useCallback((event) => {
    return screenToWorld(pointFromEvent(event), viewport)
  }, [pointFromEvent, viewport])

  const handleWheel = useCallback((event) => {
    event.preventDefault()
    const point = pointFromEvent(event)
    const zoomDirection = event.deltaY > 0 ? 0.9 : 1.1

    setViewport(zoomViewport(viewport, point, viewport.scale * zoomDirection))
  }, [pointFromEvent, setViewport, viewport])

  const getResizeHandleAtPoint = useCallback((point) => {
    if (selectedIds.length !== 1) {
      return null
    }

    const element = elements.find((item) => item.id === selectedIds[0])

    if (!element) {
      return null
    }

    const bounds = boundsFromElement(element)
    const tolerance = 9 / viewport.scale

    return getSelectionHandles(bounds).find((handle) => (
      pointDistance(point, handle) <= tolerance
    )) ?? null
  }, [elements, selectedIds, viewport.scale])

  const boundsFromHandleDrag = useCallback((handle, originalBounds, point) => {
    const opposite = {
      nw: { x: originalBounds.x + originalBounds.width, y: originalBounds.y + originalBounds.height },
      ne: { x: originalBounds.x, y: originalBounds.y + originalBounds.height },
      se: { x: originalBounds.x, y: originalBounds.y },
      sw: { x: originalBounds.x + originalBounds.width, y: originalBounds.y },
    }[handle.id]

    return normalizeRect(opposite, point)
  }, [])

  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === 'touch') {
      touchPointsRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      })

      if (touchPointsRef.current.size === 2) {
        const touches = Array.from(touchPointsRef.current.values())
        const distance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY,
        )
        const rect = canvasRef.current.getBoundingClientRect()
        const center = {
          x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
          y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top,
        }

        pinchRef.current = { distance, center, viewport }
        draftRef.current = null
        setDraftElement(null)
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }

    if (event.button === 1) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      panRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        viewport,
      }
      setIsPanning(true)
      return
    }

    if (event.button !== 0 || (activeTool !== 'draw' && !SHAPE_TOOLS.has(activeTool) && activeTool !== 'text' && activeTool !== 'sticky' && activeTool !== 'select' && activeTool !== 'eraser')) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    const point = worldPointFromEvent(event)
    const zIndex = getNextZIndex(elements)

    if (activeTool === 'select') {
      const resizeHandle = getResizeHandleAtPoint(point)

      if (resizeHandle) {
        const selectedElement = elements.find((element) => element.id === selectedIds[0])
        const originalBounds = boundsFromElement(selectedElement)

        resizeRef.current = {
          pointerId: event.pointerId,
          handle: resizeHandle,
          originalElement: selectedElement,
          originalBounds,
        }
        checkpointHistory()
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }

      const hitElement = findElementAtPoint(elements, point, 8 / viewport.scale)

      if (hitElement) {
        setSelectedIds([hitElement.id])
        moveRef.current = {
          pointerId: event.pointerId,
          lastPoint: point,
        }
        checkpointHistory()
        event.currentTarget.setPointerCapture(event.pointerId)
      } else {
        clearSelection()
      }

      return
    }

    if (activeTool === 'eraser') {
      checkpointHistory()
      eraserRef.current = {
        pointerId: event.pointerId,
        erasedIds: new Set(),
      }
      event.currentTarget.setPointerCapture(event.pointerId)

      const hitElement = findElementAtPoint(elements, point, 10 / viewport.scale)

      if (hitElement) {
        eraserRef.current.erasedIds.add(hitElement.id)
        removeElements([hitElement.id], false)
      }

      return
    }

    if (activeTool === 'text' || activeTool === 'sticky') {
      const element = activeTool === 'text'
        ? createTextElement(point, 'Text label', style, zIndex)
        : createStickyElement(point, 'New note', style, zIndex)

      addElement(element)
      setEditing({ elementId: element.id, value: element.text })
      return
    }

    const element = activeTool === 'draw'
      ? createFreehandElement(
          [{ ...point, pressure: event.pressure || 0.5 }],
          style,
          zIndex,
        )
      : createShapeElement(activeTool, point, point, style, zIndex)

    draftRef.current = {
      pointerId: event.pointerId,
      start: point,
      element,
    }
    setDraftElement(element)
  }, [
    activeTool,
    addElement,
    checkpointHistory,
    clearSelection,
    elements,
    getResizeHandleAtPoint,
    removeElements,
    selectedIds,
    setSelectedIds,
    style,
    viewport,
    worldPointFromEvent,
  ])

  const handlePointerMove = useCallback((event) => {
    if (event.pointerType === 'touch' && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      })

      if (pinchRef.current && touchPointsRef.current.size >= 2) {
        const touches = Array.from(touchPointsRef.current.values()).slice(0, 2)
        const distance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY,
        )
        const rect = canvasRef.current.getBoundingClientRect()
        const center = {
          x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left,
          y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top,
        }
        const zoomed = zoomViewport(
          pinchRef.current.viewport,
          pinchRef.current.center,
          pinchRef.current.viewport.scale * (distance / Math.max(1, pinchRef.current.distance)),
        )

        setViewport(translateViewport(zoomed, {
          x: center.x - pinchRef.current.center.x,
          y: center.y - pinchRef.current.center.y,
        }))
        return
      }
    }

    broadcastCursor(worldPointFromEvent(event))

    const pan = panRef.current

    if (!pan || pan.pointerId !== event.pointerId) {
      const resize = resizeRef.current

      if (resize?.pointerId === event.pointerId) {
        const point = worldPointFromEvent(event)
        const nextBounds = boundsFromHandleDrag(resize.handle, resize.originalBounds, point)
        replaceElement(resizeElementToBounds(resize.originalElement, resize.originalBounds, nextBounds))
        return
      }

      const move = moveRef.current

      if (move?.pointerId === event.pointerId) {
        const point = worldPointFromEvent(event)
        moveSelected({
          x: point.x - move.lastPoint.x,
          y: point.y - move.lastPoint.y,
        })
        move.lastPoint = point
        return
      }

      const draft = draftRef.current

      if (!draft || draft.pointerId !== event.pointerId) {
        const eraser = eraserRef.current

        if (eraser?.pointerId === event.pointerId) {
          const point = worldPointFromEvent(event)
          const hitElement = findElementAtPoint(
            useWhiteboardStore.getState().elements,
            point,
            10 / viewport.scale,
          )

          if (hitElement && !eraser.erasedIds.has(hitElement.id)) {
            eraser.erasedIds.add(hitElement.id)
            removeElements([hitElement.id], false)
          }
        }

        return
      }

      const point = worldPointFromEvent(event)

      if (draft.element.type === 'draw') {
        const points = draft.element.points
        const previous = points[points.length - 1]

        if (previous && pointDistance(previous, point) < 1.25 / viewport.scale) {
          return
        }

        draft.element = {
          ...draft.element,
          points: [...points, { ...point, pressure: event.pressure || 0.5 }],
          updatedAt: Date.now(),
        }
      } else {
        draft.element = updateShapeGeometry(draft.element, draft.start, point)
      }

      setDraftElement(draft.element)
      return
    }

    setViewport(translateViewport(pan.viewport, {
      x: event.clientX - pan.x,
      y: event.clientY - pan.y,
    }))
  }, [
    boundsFromHandleDrag,
    broadcastCursor,
    moveSelected,
    replaceElement,
    removeElements,
    setViewport,
    viewport.scale,
    worldPointFromEvent,
  ])

  const stopPanning = useCallback((event) => {
    if (panRef.current?.pointerId === event.pointerId) {
      panRef.current = null
      setIsPanning(false)
    }

    if (draftRef.current?.pointerId === event.pointerId) {
      const element = draftRef.current.element
      const finalElement = element.type === 'draw' && element.points.length <= 1
        ? {
            ...element,
            points: [
              element.points[0],
              {
                x: element.points[0].x + 0.01,
                y: element.points[0].y + 0.01,
                pressure: element.points[0].pressure,
              },
            ],
          }
        : element
      const isTinyShape = !finalElement.points
        && Math.abs((finalElement.x2 ?? finalElement.width ?? 0) - (finalElement.x1 ?? 0)) < 1
        && Math.abs((finalElement.y2 ?? finalElement.height ?? 0) - (finalElement.y1 ?? 0)) < 1

      if (!isTinyShape) {
        addElement(finalElement)
      }

      draftRef.current = null
      setDraftElement(null)
    }

    if (moveRef.current?.pointerId === event.pointerId) {
      moveRef.current = null
    }

    if (resizeRef.current?.pointerId === event.pointerId) {
      resizeRef.current = null
    }

    if (eraserRef.current?.pointerId === event.pointerId) {
      eraserRef.current = null
    }

    if (event.pointerType === 'touch') {
      touchPointsRef.current.delete(event.pointerId)
      if (touchPointsRef.current.size < 2) {
        pinchRef.current = null
      }
    }
  }, [addElement])

  const resetViewport = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT)
  }, [setViewport])

  const handleDoubleClick = useCallback((event) => {
    const point = worldPointFromEvent(event)
    const element = findElementAtPoint(elements, point, 8 / viewport.scale)

    if (element?.type === 'text' || element?.type === 'sticky') {
      setEditing({ elementId: element.id, value: element.text })
      return
    }

    resetViewport()
  }, [elements, resetViewport, viewport.scale, worldPointFromEvent])

  const commitEditing = useCallback(() => {
    if (!editing) {
      return
    }

    const text = editing.value.trim() || ' '
    updateElement(editing.elementId, (element) => ({
      ...element,
      text,
    }))
    setEditing(null)
  }, [editing, updateElement])

  const editingElement = editing
    ? elements.find((element) => element.id === editing.elementId)
    : null
  const editorBounds = editingElement ? boundsFromElement(editingElement) : null
  const editorPoint = editorBounds ? worldToScreen(editorBounds, viewport) : null

  return (
    <div className={isPanning ? 'canvas-shell is-panning' : 'canvas-shell'}>
      <canvas
        ref={canvasRef}
        className={`whiteboard-canvas tool-${activeTool}`}
        aria-label="Infinite whiteboard canvas"
        onDoubleClick={handleDoubleClick}
        onPointerCancel={stopPanning}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onWheel={handleWheel}
      />
      {Object.values(remoteCursors).map((cursor) => {
        const point = worldToScreen(cursor, viewport)

        return (
          <div
            key={cursor.id}
            className="remote-cursor"
            style={{
              left: `${point.x}px`,
              top: `${point.y}px`,
              '--cursor-color': cursor.color,
            }}
          >
            <span>{cursor.name}</span>
          </div>
        )
      })}
      {editingElement && editorBounds && editorPoint ? (
        <textarea
          ref={editorRef}
          className={`text-editor-overlay is-${editingElement.type}`}
          value={editing.value}
          aria-label={`Edit ${editingElement.type}`}
          onBlur={commitEditing}
          onChange={(event) => setEditing((current) => ({
            ...current,
            value: event.target.value,
          }))}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setEditing(null)
            }

            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              commitEditing()
            }
          }}
          style={{
            left: `${editorPoint.x}px`,
            top: `${editorPoint.y}px`,
            width: `${Math.max(120, editorBounds.width * viewport.scale)}px`,
            height: `${Math.max(42, editorBounds.height * viewport.scale)}px`,
            fontSize: `${editingElement.fontSize * viewport.scale}px`,
          }}
        />
      ) : null}
      <canvas
        ref={minimapRef}
        className="minimap-canvas"
        aria-label="Minimap viewport indicator"
      />
    </div>
  )
}

export default WhiteboardCanvas
