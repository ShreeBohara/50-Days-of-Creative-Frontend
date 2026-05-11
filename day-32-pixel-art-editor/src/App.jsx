import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brush,
  ChevronDown,
  ChevronUp,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Grid3X3,
  Layers,
  LocateFixed,
  MousePointer2,
  Move,
  PaintBucket,
  Palette,
  Pencil,
  Play,
  Plus,
  Redo2,
  Square,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

const RENDER_SIZE = 768
const MIN_ZOOM = 0.5
const MAX_ZOOM = 6

const toolbarItems = [
  { id: 'pencil', label: 'Pencil', key: 'P', icon: Pencil },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser },
  { id: 'fill', label: 'Fill', key: 'F', icon: PaintBucket },
  { id: 'picker', label: 'Picker', key: 'I', icon: MousePointer2 },
  { id: 'line', label: 'Line', key: 'L', icon: Brush },
  { id: 'rectangle', label: 'Rectangle', key: 'R', icon: Square },
]

const DB32_PALETTE = [
  '#000000',
  '#222034',
  '#45283c',
  '#663931',
  '#8f563b',
  '#df7126',
  '#d9a066',
  '#eec39a',
  '#fbf236',
  '#99e550',
  '#6abe30',
  '#37946e',
  '#4b692f',
  '#524b24',
  '#323c39',
  '#3f3f74',
  '#306082',
  '#5b6ee1',
  '#639bff',
  '#5fcde4',
  '#cbdbfc',
  '#ffffff',
  '#9badb7',
  '#847e87',
  '#696a6a',
  '#595652',
  '#76428a',
  '#ac3232',
  '#d95763',
  '#d77bba',
  '#8f974a',
  '#8a6f30',
]

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

function createPixels(gridSize) {
  return Array.from({ length: gridSize * gridSize }, () => null)
}

function createLayer(gridSize, name = 'Ink') {
  return {
    id: crypto.randomUUID(),
    name,
    visible: true,
    opacity: 100,
    pixels: createPixels(gridSize),
  }
}

function paintSampleSprite(gridSize, pixels) {
  const next = [...pixels]
  const center = Math.floor(gridSize / 2)
  const points = [
    [center - 2, center - 3, '#fbf236'],
    [center - 1, center - 3, '#fbf236'],
    [center, center - 3, '#fbf236'],
    [center + 1, center - 3, '#fbf236'],
    [center - 3, center - 2, '#99e550'],
    [center + 2, center - 2, '#99e550'],
    [center - 3, center - 1, '#5fcde4'],
    [center - 1, center - 1, '#ffffff'],
    [center + 1, center - 1, '#ffffff'],
    [center + 2, center - 1, '#5fcde4'],
    [center - 2, center, '#ec4899'],
    [center - 1, center, '#ec4899'],
    [center, center, '#ec4899'],
    [center + 1, center, '#ec4899'],
    [center - 1, center + 1, '#222034'],
    [center, center + 1, '#222034'],
    [center - 2, center + 2, '#5fcde4'],
    [center + 1, center + 2, '#5fcde4'],
  ]

  points.forEach(([x, y, color]) => {
    if (x >= 0 && y >= 0 && x < gridSize && y < gridSize) {
      next[y * gridSize + x] = color
    }
  })

  return next
}

function createFrame(gridSize, name = 'Frame 1') {
  const baseLayer = createLayer(gridSize, 'Ink')

  return {
    id: crypto.randomUUID(),
    name,
    layers: [
      {
        ...baseLayer,
        pixels: paintSampleSprite(gridSize, baseLayer.pixels),
      },
    ],
  }
}

function composeLayers(frame, gridSize) {
  const composite = createPixels(gridSize)

  frame.layers.forEach((layer) => {
    if (!layer.visible) return

    layer.pixels.forEach((color, index) => {
      if (color) composite[index] = blendHex(composite[index], color, layer.opacity / 100)
    })
  })

  return composite
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`
}

function blendHex(baseColor, topColor, alpha) {
  if (!baseColor || alpha >= 1) return topColor

  const base = hexToRgb(baseColor)
  const top = hexToRgb(topColor)
  return rgbToHex({
    r: top.r * alpha + base.r * (1 - alpha),
    g: top.g * alpha + base.g * (1 - alpha),
    b: top.b * alpha + base.b * (1 - alpha),
  })
}

function getLineCells(start, end) {
  const cells = []
  let x = start.x
  let y = start.y
  const dx = Math.abs(end.x - start.x)
  const dy = Math.abs(end.y - start.y)
  const sx = start.x < end.x ? 1 : -1
  const sy = start.y < end.y ? 1 : -1
  let error = dx - dy

  while (true) {
    cells.push({ x, y })
    if (x === end.x && y === end.y) break

    const doubledError = 2 * error
    if (doubledError > -dy) {
      error -= dy
      x += sx
    }
    if (doubledError < dx) {
      error += dx
      y += sy
    }
  }

  return cells
}

function getRectangleCells(start, end, filled) {
  const minX = Math.min(start.x, end.x)
  const maxX = Math.max(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  const maxY = Math.max(start.y, end.y)
  const cells = []

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) {
        cells.push({ x, y })
      }
    }
  }

  return cells
}

function floodFillPixels(pixels, gridSize, start, color) {
  const startIndex = start.y * gridSize + start.x
  const targetColor = pixels[startIndex]

  if (targetColor === color) return pixels

  const next = [...pixels]
  const stack = [start]
  const seen = new Set()

  while (stack.length) {
    const cell = stack.pop()
    const key = `${cell.x}:${cell.y}`
    const index = cell.y * gridSize + cell.x

    if (seen.has(key) || next[index] !== targetColor) continue

    seen.add(key)
    next[index] = color

    if (cell.x > 0) stack.push({ x: cell.x - 1, y: cell.y })
    if (cell.x < gridSize - 1) stack.push({ x: cell.x + 1, y: cell.y })
    if (cell.y > 0) stack.push({ x: cell.x, y: cell.y - 1 })
    if (cell.y < gridSize - 1) stack.push({ x: cell.x, y: cell.y + 1 })
  }

  return next
}

function overlayPreview(pixels, gridSize, cells, color) {
  if (!cells.length) return pixels

  const next = [...pixels]
  cells.forEach((cell) => {
    next[cell.y * gridSize + cell.x] = color
  })
  return next
}

function drawPixelCanvas(canvas, pixels, gridSize, showGrid) {
  const context = canvas.getContext('2d')
  const cellSize = RENDER_SIZE / gridSize

  context.clearRect(0, 0, RENDER_SIZE, RENDER_SIZE)
  context.imageSmoothingEnabled = false

  pixels.forEach((color, index) => {
    if (!color) return

    const x = index % gridSize
    const y = Math.floor(index / gridSize)
    context.fillStyle = color
    context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
  })

  if (showGrid) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.16)'
    context.lineWidth = 1

    for (let index = 0; index <= gridSize; index += 1) {
      const position = Math.round(index * cellSize) + 0.5
      context.beginPath()
      context.moveTo(position, 0)
      context.lineTo(position, RENDER_SIZE)
      context.stroke()
      context.beginPath()
      context.moveTo(0, position)
      context.lineTo(RENDER_SIZE, position)
      context.stroke()
    }
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function App() {
  const canvasRef = useRef(null)
  const panSession = useRef(null)
  const drawSession = useRef(null)
  const [selectedTool, setSelectedTool] = useState('pencil')
  const [currentColor, setCurrentColor] = useState('#fbf236')
  const [customColor, setCustomColor] = useState('#fbf236')
  const [recentColors, setRecentColors] = useState(['#fbf236', '#99e550', '#5fcde4'])
  const [filledRectangle, setFilledRectangle] = useState(false)
  const [shapeStart, setShapeStart] = useState(null)
  const [previewCells, setPreviewCells] = useState([])
  const [gridSize, setGridSize] = useState(32)
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [cursorCell, setCursorCell] = useState(null)
  const [activeFrame, setActiveFrame] = useState(0)
  const [activeLayer, setActiveLayer] = useState(0)
  const [frames, setFrames] = useState(() => [createFrame(32)])

  const currentFrame = frames[activeFrame]
  const currentLayer = currentFrame.layers[activeLayer]
  const compositePixels = useMemo(
    () => composeLayers(currentFrame, gridSize),
    [currentFrame, gridSize],
  )
  const renderPixels = useMemo(
    () => overlayPreview(compositePixels, gridSize, previewCells, currentColor),
    [compositePixels, currentColor, gridSize, previewCells],
  )

  useEffect(() => {
    if (!canvasRef.current) return
    drawPixelCanvas(canvasRef.current, renderPixels, gridSize, showGrid)
  }, [gridSize, renderPixels, showGrid])

  function resetGrid(nextSize) {
    if (nextSize === gridSize) return

    const hasArtwork = frames.some((frame) =>
      frame.layers.some((layer) => layer.pixels.some(Boolean)),
    )

    if (hasArtwork && !window.confirm('Changing grid size starts a new blank document. Continue?')) {
      return
    }

    setGridSize(nextSize)
    setFrames([createFrame(nextSize)])
    setActiveFrame(0)
    setActiveLayer(0)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function chooseColor(color) {
    const normalized = color.startsWith('#') ? color.toLowerCase() : `#${color.toLowerCase()}`
    if (!HEX_PATTERN.test(normalized)) return

    setCurrentColor(normalized)
    setCustomColor(normalized)
    setRecentColors((colors) => [
      normalized,
      ...colors.filter((recentColor) => recentColor !== normalized),
    ].slice(0, 8))
  }

  function getCanvasCell(event) {
    if (!canvasRef.current) return null

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    if (x < 0 || y < 0 || x >= 1 || y >= 1) return null

    return {
      x: clamp(Math.floor(x * gridSize), 0, gridSize - 1),
      y: clamp(Math.floor(y * gridSize), 0, gridSize - 1),
    }
  }

  function updateActiveLayerPixels(updater) {
    setFrames((currentFrames) =>
      currentFrames.map((frame, frameIndex) => {
        if (frameIndex !== activeFrame) return frame

        return {
          ...frame,
          layers: frame.layers.map((layer, layerIndex) => {
            if (layerIndex !== activeLayer) return layer

            return {
              ...layer,
              pixels: updater(layer.pixels),
            }
          }),
        }
      }),
    )
  }

  function setPixel(cell, color) {
    updateActiveLayerPixels((pixels) => {
      const index = cell.y * gridSize + cell.x
      if (pixels[index] === color) return pixels

      const next = [...pixels]
      next[index] = color
      return next
    })
  }

  function setCells(cells, color) {
    if (!cells.length) return

    updateActiveLayerPixels((pixels) => {
      const next = [...pixels]
      cells.forEach((cell) => {
        next[cell.y * gridSize + cell.x] = color
      })
      return next
    })
  }

  function updateActiveFrame(updater) {
    setFrames((currentFrames) =>
      currentFrames.map((frame, frameIndex) =>
        frameIndex === activeFrame ? updater(frame) : frame,
      ),
    )
  }

  function updateLayer(index, updates) {
    updateActiveFrame((frame) => ({
      ...frame,
      layers: frame.layers.map((layer, layerIndex) =>
        layerIndex === index ? { ...layer, ...updates } : layer,
      ),
    }))
  }

  function addLayer() {
    if (currentFrame.layers.length >= 4) return

    updateActiveFrame((frame) => ({
      ...frame,
      layers: [...frame.layers, createLayer(gridSize, `Layer ${frame.layers.length + 1}`)],
    }))
    setActiveLayer(currentFrame.layers.length)
  }

  function deleteLayer(index) {
    if (currentFrame.layers.length === 1) return

    updateActiveFrame((frame) => ({
      ...frame,
      layers: frame.layers.filter((_, layerIndex) => layerIndex !== index),
    }))
    setActiveLayer((value) => clamp(value >= index ? value - 1 : value, 0, currentFrame.layers.length - 2))
  }

  function moveLayer(index, direction) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= currentFrame.layers.length) return

    updateActiveFrame((frame) => {
      const layers = [...frame.layers]
      const [layer] = layers.splice(index, 1)
      layers.splice(targetIndex, 0, layer)
      return { ...frame, layers }
    })
    setActiveLayer(targetIndex)
  }

  function applyToolToCell(cell) {
    if (!cell) return

    if (selectedTool === 'pencil') {
      setPixel(cell, currentColor)
    }

    if (selectedTool === 'eraser') {
      setPixel(cell, null)
    }

    if (selectedTool === 'fill') {
      updateActiveLayerPixels((pixels) => floodFillPixels(pixels, gridSize, cell, currentColor))
    }

    if (selectedTool === 'picker') {
      const sampledColor = compositePixels[cell.y * gridSize + cell.x]
      if (sampledColor) chooseColor(sampledColor)
      setSelectedTool('pencil')
    }
  }

  function handlePointerMove(event) {
    if (panSession.current) {
      const nextPan = {
        x: panSession.current.origin.x + event.clientX - panSession.current.start.x,
        y: panSession.current.origin.y + event.clientY - panSession.current.start.y,
      }
      setPan(nextPan)
      return
    }

    setCursorCell(getCanvasCell(event))

    if (drawSession.current) {
      const cell = getCanvasCell(event)
      if (drawSession.current.mode === 'shape' && shapeStart && cell) {
        const cells =
          selectedTool === 'line'
            ? getLineCells(shapeStart, cell)
            : getRectangleCells(shapeStart, cell, filledRectangle)
        setPreviewCells(cells)
        return
      }

      const cellKey = cell ? `${cell.x}:${cell.y}` : null
      if (cellKey && drawSession.current.lastCell !== cellKey) {
        drawSession.current.lastCell = cellKey
        applyToolToCell(cell)
      }
    }
  }

  function handlePointerDown(event) {
    if (event.button === 1) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      panSession.current = {
        start: { x: event.clientX, y: event.clientY },
        origin: pan,
      }
      return
    }

    if (event.button !== 0) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const cell = getCanvasCell(event)
    if (cell && (selectedTool === 'line' || selectedTool === 'rectangle')) {
      drawSession.current = {
        mode: 'shape',
        lastCell: `${cell.x}:${cell.y}`,
      }
      setShapeStart(cell)
      setPreviewCells([cell])
      return
    }

    drawSession.current = {
      mode: 'paint',
      lastCell: cell ? `${cell.x}:${cell.y}` : null,
    }
    applyToolToCell(cell)
  }

  function handlePointerUp(event) {
    if (drawSession.current?.mode === 'shape' && shapeStart) {
      const cell = getCanvasCell(event) ?? shapeStart
      const cells =
        selectedTool === 'line'
          ? getLineCells(shapeStart, cell)
          : getRectangleCells(shapeStart, cell, filledRectangle)
      setCells(cells, currentColor)
      setShapeStart(null)
      setPreviewCells([])
    }

    if (panSession.current || drawSession.current) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    panSession.current = null
    drawSession.current = null
  }

  function handleWheel(event) {
    if (!event.ctrlKey && !event.metaKey) return

    event.preventDefault()
    setZoom((value) => clamp(value + (event.deltaY > 0 ? -0.15 : 0.15), MIN_ZOOM, MAX_ZOOM))
  }

  function setZoomStep(direction) {
    setZoom((value) => clamp(value + direction * 0.25, MIN_ZOOM, MAX_ZOOM))
  }

  function resetViewport() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  return (
    <main className="editor-shell" aria-label="Pixel art editor">
      <header className="topbar">
        <div>
          <p className="eyebrow">Day 32</p>
          <h1>Pixel Art Editor</h1>
        </div>
        <div className="topbar-actions" aria-label="Editor actions">
          <button type="button" className="icon-button" aria-label="Undo">
            <Undo2 size={18} />
          </button>
          <button type="button" className="icon-button" aria-label="Redo">
            <Redo2 size={18} />
          </button>
          <button type="button" className="primary-button">
            <Download size={18} />
            Export
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="tool-rail" aria-label="Drawing tools">
          {toolbarItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                className={item.id === selectedTool ? 'tool-button active' : 'tool-button'}
                type="button"
                key={item.id}
                onClick={() => setSelectedTool(item.id)}
                title={`${item.label} (${item.key})`}
                aria-label={`${item.label} tool`}
              >
                <Icon size={21} />
                <span>{item.key}</span>
              </button>
            )
          })}
        </aside>

        <section className="stage-panel" aria-label="Canvas workspace">
          <div className="stage-toolbar">
            <div>
              <p className="panel-kicker">Canvas</p>
              <h2>
                {gridSize} x {gridSize} sprite
              </h2>
              <p className="subtle-label">Editing {currentLayer.name}</p>
            </div>
            <div className="stage-controls">
              {[16, 32, 64].map((size) => (
                <button
                  type="button"
                  className={gridSize === size ? 'chip active' : 'chip'}
                  key={size}
                  onClick={() => resetGrid(size)}
                >
                  {size}
                </button>
              ))}
              <button
                type="button"
                className={showGrid ? 'chip active' : 'chip'}
                onClick={() => setShowGrid((value) => !value)}
              >
                <Grid3X3 size={16} />
                Grid
              </button>
              <button type="button" className="icon-button" onClick={() => setZoomStep(-1)} aria-label="Zoom out">
                <ZoomOut size={16} />
              </button>
              <button type="button" className="chip" onClick={resetViewport}>
                <LocateFixed size={16} />
                {Math.round(zoom * 100)}%
              </button>
              <button type="button" className="icon-button" onClick={() => setZoomStep(1)} aria-label="Zoom in">
                <ZoomIn size={16} />
              </button>
              {selectedTool === 'rectangle' ? (
                <button
                  type="button"
                  className={filledRectangle ? 'chip active' : 'chip'}
                  onClick={() => setFilledRectangle((value) => !value)}
                >
                  Filled
                </button>
              ) : null}
            </div>
          </div>
          <div
            className="canvas-wrap"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setCursorCell(null)}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <div
              className="canvas-viewport"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <canvas
                ref={canvasRef}
                className="pixel-canvas"
                width={RENDER_SIZE}
                height={RENDER_SIZE}
                aria-label="Pixel drawing canvas"
              />
            </div>
            <div className="canvas-status">
              <span>
                {cursorCell ? `X ${cursorCell.x + 1} / Y ${cursorCell.y + 1}` : 'Move over canvas'}
              </span>
              <span>
                <Move size={14} /> Middle mouse drag to pan
              </span>
            </div>
          </div>
        </section>

        <aside className="inspector" aria-label="Editor inspector">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Color</p>
                <h2>Palette</h2>
              </div>
              <Palette size={20} />
            </div>
            <div className="current-color">
              <span style={{ backgroundColor: currentColor }} />
              <strong>{currentColor}</strong>
            </div>
            <label className="hex-field">
              <span>Custom hex</span>
              <input
                type="text"
                value={customColor}
                inputMode="text"
                spellCheck="false"
                onChange={(event) => {
                  setCustomColor(event.target.value)
                  chooseColor(event.target.value)
                }}
                aria-label="Custom hex color"
              />
            </label>
            <div className="palette-grid">
              {DB32_PALETTE.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={color.toLowerCase() === currentColor ? 'swatch active' : 'swatch'}
                  style={{ backgroundColor: color }}
                  onClick={() => chooseColor(color)}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
            <div className="recent-row" aria-label="Recent colors">
              {recentColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className="recent-swatch"
                  style={{ backgroundColor: color }}
                  onClick={() => chooseColor(color)}
                  aria-label={`Use recent color ${color}`}
                />
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Stack</p>
                <h2>Layers</h2>
              </div>
              <Layers size={20} />
            </div>
            <div className="layer-list">
              {currentFrame.layers.map((layer, index) => (
                <div
                  className={index === activeLayer ? 'layer-row active' : 'layer-row'}
                  key={layer.id}
                >
                  <button
                    type="button"
                    className="layer-visibility"
                    onClick={() => updateLayer(index, { visible: !layer.visible })}
                    aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  >
                    {layer.visible ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                  <button type="button" className="layer-name" onClick={() => setActiveLayer(index)}>
                    {layer.name}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layer.opacity}
                    onChange={(event) => updateLayer(index, { opacity: Number(event.target.value) })}
                    aria-label={`${layer.name} opacity`}
                  />
                  <span className="layer-opacity">{layer.opacity}%</span>
                  <div className="layer-actions">
                    <button type="button" onClick={() => moveLayer(index, -1)} aria-label={`Move ${layer.name} up`}>
                      <ChevronUp size={15} />
                    </button>
                    <button type="button" onClick={() => moveLayer(index, 1)} aria-label={`Move ${layer.name} down`}>
                      <ChevronDown size={15} />
                    </button>
                    <button type="button" onClick={() => deleteLayer(index)} aria-label={`Delete ${layer.name}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button"
              onClick={addLayer}
              disabled={currentFrame.layers.length >= 4}
            >
              <Plus size={17} />
              Layer
            </button>
          </section>
        </aside>
      </section>

      <footer className="frame-strip" aria-label="Animation frames">
        <button type="button" className="icon-button active" aria-label="Play animation preview">
          <Play size={17} />
        </button>
        {frames.map((frame, index) => (
          <button
            type="button"
            className={index === activeFrame ? 'frame-thumb active' : 'frame-thumb'}
            key={frame.id}
            onClick={() => setActiveFrame(index)}
          >
            {frame.name}
          </button>
        ))}
        <button type="button" className="secondary-button">
          <Plus size={17} />
          Frame
        </button>
      </footer>
    </main>
  )
}

export default App
