import {
  ArrowUpRight,
  Brush,
  Circle,
  Eraser,
  FileDown,
  FileUp,
  Grid3X3,
  Minus,
  MousePointer2,
  MoveUp,
  PenLine,
  Redo2,
  Square,
  StickyNote,
  Type,
  Undo2,
} from 'lucide-react'
import WhiteboardCanvas from './components/WhiteboardCanvas'
import {
  BRUSH_SIZES,
  COLORS,
  TOOL_BY_ID,
  TOOLS,
} from './data/whiteboardConfig'
import { useWhiteboardStore } from './store/useWhiteboardStore'
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

function IconButton({ icon, label, shortcut, active = false, onClick }) {
  const Icon = typeof icon === 'string' ? iconMap[icon] : icon

  return (
    <button
      className={active ? 'icon-button is-active' : 'icon-button'}
      type="button"
      aria-label={`${label}${shortcut ? `, shortcut ${shortcut}` : ''}`}
      aria-pressed={active}
      onClick={onClick}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
      {shortcut ? <span>{shortcut}</span> : null}
    </button>
  )
}

function App() {
  const activeTool = useWhiteboardStore((state) => state.activeTool)
  const elements = useWhiteboardStore((state) => state.elements)
  const showGrid = useWhiteboardStore((state) => state.showGrid)
  const style = useWhiteboardStore((state) => state.style)
  const viewport = useWhiteboardStore((state) => state.viewport)
  const setActiveTool = useWhiteboardStore((state) => state.setActiveTool)
  const toggleGrid = useWhiteboardStore((state) => state.toggleGrid)
  const updateStyle = useWhiteboardStore((state) => state.updateStyle)
  const activeToolLabel = TOOL_BY_ID[activeTool]?.label ?? 'Select'

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
          <IconButton icon={Undo2} label="Undo" />
          <IconButton icon={Redo2} label="Redo" />
          <IconButton icon={FileDown} label="Export PNG" />
          <IconButton icon={FileUp} label="Load JSON" />
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
            <span>Local tab ready</span>
          </div>
        </header>

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
          <button
            className={showGrid ? 'flat-button is-active' : 'flat-button'}
            type="button"
            aria-pressed={showGrid}
            onClick={toggleGrid}
          >
            <Grid3X3 aria-hidden="true" size={16} />
            Grid
          </button>
          <button className="flat-button" type="button">
            <MoveUp aria-hidden="true" size={16} />
            Layer
          </button>
        </div>

        <WhiteboardCanvas />

        <footer className="statusbar" aria-label="Whiteboard status">
          <span>Tool: {activeToolLabel}</span>
          <span>Zoom: {Math.round(viewport.scale * 100)}%</span>
          <span>{elements.length} elements</span>
          <span>Pan: {Math.round(viewport.x)}, {Math.round(viewport.y)}</span>
        </footer>
      </section>
    </main>
  )
}

export default App
