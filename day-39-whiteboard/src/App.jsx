import { useEffect, useRef } from 'react'
import {
  ArrowUpRight,
  Brush,
  Circle,
  Eraser,
  FileDown,
  FileUp,
  Grid3X3,
  Minus,
  MoveDown,
  MousePointer2,
  MoveUp,
  PenLine,
  Redo2,
  Save,
  Square,
  StickyNote,
  Type,
  Undo2,
} from 'lucide-react'
import WhiteboardCanvas from './components/WhiteboardCanvas'
import {
  BRUSH_SIZES,
  COLORS,
  STROKE_STYLES,
  TOOL_BY_ID,
  TOOLS,
} from './data/whiteboardConfig'
import { useBroadcastWhiteboard } from './hooks/useBroadcastWhiteboard'
import { useWhiteboardStore } from './store/useWhiteboardStore'
import { exportElementsAsPng } from './utils/exportImage'
import { downloadTextFile, parseProject, serializeProject } from './utils/serialization'
import { DEFAULT_VIEWPORT, clampScale } from './utils/viewport'
import './App.css'

const iconMap = {
  select: MousePointer2,
  draw: Brush,
  line: Minus,
  rectangle: Square,
  ellipse: Circle,
  arrow: ArrowUpRight,
  text: Type,
  sticky: StickyNote,
  eraser: Eraser,
}

function IconButton({ icon, label, shortcut, active = false, disabled = false, onClick }) {
  const Icon = typeof icon === 'string' ? iconMap[icon] : icon

  return (
    <button
      className={active ? 'icon-button is-active' : 'icon-button'}
      type="button"
      aria-label={`${label}${shortcut ? `, shortcut ${shortcut}` : ''}`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
      {shortcut ? <span>{shortcut}</span> : null}
    </button>
  )
}

function App() {
  useBroadcastWhiteboard()

  const fileInputRef = useRef(null)
  const activeTool = useWhiteboardStore((state) => state.activeTool)
  const collaborationStatus = useWhiteboardStore((state) => state.collaborationStatus)
  const elements = useWhiteboardStore((state) => state.elements)
  const error = useWhiteboardStore((state) => state.error)
  const historyFuture = useWhiteboardStore((state) => state.historyFuture)
  const historyPast = useWhiteboardStore((state) => state.historyPast)
  const remoteCursors = useWhiteboardStore((state) => state.remoteCursors)
  const selectedIds = useWhiteboardStore((state) => state.selectedIds)
  const showGrid = useWhiteboardStore((state) => state.showGrid)
  const style = useWhiteboardStore((state) => state.style)
  const viewport = useWhiteboardStore((state) => state.viewport)
  const setActiveTool = useWhiteboardStore((state) => state.setActiveTool)
  const bringForward = useWhiteboardStore((state) => state.bringForward)
  const clearSelection = useWhiteboardStore((state) => state.clearSelection)
  const setError = useWhiteboardStore((state) => state.setError)
  const deleteSelected = useWhiteboardStore((state) => state.deleteSelected)
  const loadProject = useWhiteboardStore((state) => state.loadProject)
  const redo = useWhiteboardStore((state) => state.redo)
  const sendBackward = useWhiteboardStore((state) => state.sendBackward)
  const setViewport = useWhiteboardStore((state) => state.setViewport)
  const toggleGrid = useWhiteboardStore((state) => state.toggleGrid)
  const undo = useWhiteboardStore((state) => state.undo)
  const updateStyle = useWhiteboardStore((state) => state.updateStyle)
  const activeToolLabel = TOOL_BY_ID[activeTool]?.label ?? 'Select'
  const remoteCount = Object.keys(remoteCursors).length

  const handleExportPng = () => {
    exportElementsAsPng(elements)
  }

  const handleSaveJson = () => {
    downloadTextFile('day-39-whiteboard.json', serializeProject({ elements, viewport }))
  }

  const handleLoadJson = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      loadProject(parseProject(await file.text()))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      event.target.value = ''
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tagName = event.target?.tagName
      const isTyping = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || event.target?.isContentEditable

      if (isTyping) {
        return
      }

      const matchingTool = TOOLS.find((tool) => tool.shortcut === event.key)

      if (matchingTool) {
        event.preventDefault()
        setActiveTool(matchingTool.id)
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
        return
      }

      if (event.key === 'Escape') {
        clearSelection()
        return
      }

      if (event.key === '+' || event.key === '=') {
        const current = useWhiteboardStore.getState().viewport
        setViewport({ ...current, scale: clampScale(current.scale * 1.12) })
        return
      }

      if (event.key === '-' || event.key === '_') {
        const current = useWhiteboardStore.getState().viewport
        setViewport({ ...current, scale: clampScale(current.scale * 0.88) })
        return
      }

      if (event.key === '0') {
        setViewport(DEFAULT_VIEWPORT)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelection, deleteSelected, redo, setActiveTool, setViewport, undo])

  return (
    <main className="whiteboard-app">
      <aside className="toolbar" aria-label="Whiteboard tools">
        <div className="brand-mark" aria-label="Day 39 Whiteboard">
          <PenLine aria-hidden="true" size={20} />
        </div>

        <div className="tool-group" role="toolbar" aria-label="Drawing tools">
          {TOOLS.map((tool) => (
            <IconButton
              key={tool.id}
              {...tool}
              active={activeTool === tool.id}
              onClick={() => setActiveTool(tool.id)}
            />
          ))}
        </div>

        <div className="tool-group compact" role="toolbar" aria-label="History and file actions">
          <IconButton icon={Undo2} label="Undo" disabled={!historyPast.length} onClick={undo} />
          <IconButton icon={Redo2} label="Redo" disabled={!historyFuture.length} onClick={redo} />
          <IconButton icon={FileDown} label="Export PNG" onClick={handleExportPng} />
          <IconButton icon={Save} label="Save JSON" onClick={handleSaveJson} />
          <IconButton icon={FileUp} label="Load JSON" onClick={() => fileInputRef.current?.click()} />
        </div>
      </aside>

      <section className="workspace" aria-label="Collaborative whiteboard workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Day 39</p>
            <h1>Realtime whiteboard</h1>
          </div>
          <div className="presence-strip" aria-label="Collaboration status">
            <span className="presence-dot"></span>
            <span>
              {collaborationStatus === 'unsupported'
                ? 'Local only'
                : `${remoteCount} remote ${remoteCount === 1 ? 'tab' : 'tabs'}`}
            </span>
          </div>
        </header>
        <div className={error ? 'error-banner' : 'error-banner is-hidden'} role="alert">
          {error}
        </div>

        <div className="stylebar" aria-label="Style controls">
          <div className="swatches" aria-label="Color palette">
            {COLORS.map((color) => (
              <button
                key={color}
                className={color === style.stroke ? 'swatch is-active' : 'swatch'}
                type="button"
                aria-label={`Use color ${color}`}
                onClick={() => updateStyle({ stroke: color })}
                style={{ '--swatch': color }}
              />
            ))}
          </div>
          <div className="segmented-control" aria-label="Stroke width">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={size === style.strokeWidth ? 'is-active' : ''}
                onClick={() => updateStyle({ strokeWidth: size })}
              >
                {size}
              </button>
            ))}
          </div>
          <label className="color-input-label">
            <span>Custom</span>
            <input
              type="color"
              value={style.stroke}
              aria-label="Custom stroke color"
              onChange={(event) => updateStyle({ stroke: event.target.value })}
            />
          </label>
          <button
            className={style.fillEnabled ? 'flat-button is-active' : 'flat-button'}
            type="button"
            aria-pressed={style.fillEnabled}
            onClick={() => updateStyle({ fillEnabled: !style.fillEnabled })}
          >
            Fill
          </button>
          <div className="segmented-control wide" aria-label="Stroke style">
            {STROKE_STYLES.map((strokeStyle) => (
              <button
                key={strokeStyle}
                type="button"
                className={strokeStyle === style.strokeStyle ? 'is-active' : ''}
                onClick={() => updateStyle({ strokeStyle })}
              >
                {strokeStyle}
              </button>
            ))}
          </div>
          <button
            className={showGrid ? 'flat-button is-active' : 'flat-button'}
            type="button"
            aria-pressed={showGrid}
            onClick={toggleGrid}
          >
            <Grid3X3 aria-hidden="true" size={16} />
            Grid
          </button>
          <button
            className="flat-button"
            type="button"
            disabled={!selectedIds.length}
            onClick={bringForward}
          >
            <MoveUp aria-hidden="true" size={16} />
            Forward
          </button>
          <button
            className="flat-button"
            type="button"
            disabled={!selectedIds.length}
            onClick={sendBackward}
          >
            <MoveDown aria-hidden="true" size={16} />
            Back
          </button>
          <button
            className="flat-button danger"
            type="button"
            disabled={!selectedIds.length}
            onClick={deleteSelected}
          >
            Delete
          </button>
        </div>

        <WhiteboardCanvas />

        <footer className="statusbar" aria-label="Whiteboard status">
          <span>Tool: {activeToolLabel}</span>
          <span>Zoom: {Math.round(viewport.scale * 100)}%</span>
          <span>{elements.length} elements</span>
          <span>{selectedIds.length} selected</span>
          <span>Broadcast: {collaborationStatus}</span>
          <span>Pan: {Math.round(viewport.x)}, {Math.round(viewport.y)}</span>
        </footer>
      </section>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={handleLoadJson}
      />
    </main>
  )
}

export default App
