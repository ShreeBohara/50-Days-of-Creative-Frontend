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
import './App.css'

const tools = [
  { id: 'select', label: 'Select', shortcut: '1', icon: MousePointer2 },
  { id: 'draw', label: 'Draw', shortcut: '2', icon: Brush },
  { id: 'line', label: 'Line', shortcut: '3', icon: Minus },
  { id: 'rectangle', label: 'Rectangle', shortcut: '4', icon: Square },
  { id: 'ellipse', label: 'Ellipse', shortcut: '5', icon: Circle },
  { id: 'arrow', label: 'Arrow', shortcut: '6', icon: ArrowUpRight },
  { id: 'text', label: 'Text', shortcut: '7', icon: Type },
  { id: 'sticky', label: 'Sticky', shortcut: '8', icon: StickyNote },
  { id: 'eraser', label: 'Eraser', shortcut: '9', icon: Eraser },
]

const colors = [
  '#0f766e',
  '#14b8a6',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#2563eb',
  '#0f172a',
  '#64748b',
  '#facc15',
  '#84cc16',
  '#f9a8d4',
  '#ffffff',
]

function IconButton({ icon: Icon, label, shortcut, active = false }) {
  return (
    <button
      className={active ? 'icon-button is-active' : 'icon-button'}
      type="button"
      aria-label={`${label}${shortcut ? `, shortcut ${shortcut}` : ''}`}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
      {shortcut ? <span>{shortcut}</span> : null}
    </button>
  )
}

function App() {
  return (
    <main className="whiteboard-app">
      <aside className="toolbar" aria-label="Whiteboard tools">
        <div className="brand-mark" aria-label="Day 39 Whiteboard">
          <PenLine aria-hidden="true" size={20} />
        </div>

        <div className="tool-group" role="toolbar" aria-label="Drawing tools">
          {tools.map((tool, index) => (
            <IconButton key={tool.id} {...tool} active={index === 0} />
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
            {colors.map((color) => (
              <button
                key={color}
                className={color === colors[0] ? 'swatch is-active' : 'swatch'}
                type="button"
                aria-label={`Use color ${color}`}
                style={{ '--swatch': color }}
              />
            ))}
          </div>
          <div className="segmented-control" aria-label="Stroke width">
            <button type="button" className="is-active">2</button>
            <button type="button">4</button>
            <button type="button">8</button>
            <button type="button">16</button>
          </div>
          <button className="flat-button" type="button">
            <Grid3X3 aria-hidden="true" size={16} />
            Grid
          </button>
          <button className="flat-button" type="button">
            <MoveUp aria-hidden="true" size={16} />
            Layer
          </button>
        </div>

        <div className="canvas-shell">
          <div className="canvas-placeholder" aria-label="Infinite canvas placeholder">
            <div className="placeholder-crosshair"></div>
          </div>
          <div className="minimap-card" aria-label="Minimap preview">
            <span></span>
          </div>
        </div>

        <footer className="statusbar" aria-label="Whiteboard status">
          <span>Tool: Select</span>
          <span>Zoom: 100%</span>
          <span>0 elements</span>
          <span>Broadcast: waiting</span>
        </footer>
      </section>
    </main>
  )
}

export default App
