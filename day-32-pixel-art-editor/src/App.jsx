import {
  Brush,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Grid3X3,
  Layers,
  MousePointer2,
  PaintBucket,
  Palette,
  Pencil,
  Play,
  Plus,
  Redo2,
  Square,
  Undo2,
} from 'lucide-react'

const toolbarItems = [
  { id: 'pencil', label: 'Pencil', key: 'P', icon: Pencil },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser },
  { id: 'fill', label: 'Fill', key: 'F', icon: PaintBucket },
  { id: 'picker', label: 'Picker', key: 'I', icon: MousePointer2 },
  { id: 'line', label: 'Line', key: 'L', icon: Brush },
  { id: 'rectangle', label: 'Rectangle', key: 'R', icon: Square },
]

const palettePreview = [
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
]

const layerPreview = [
  { name: 'Ink', visible: true, opacity: 100 },
  { name: 'Shade', visible: true, opacity: 72 },
  { name: 'Guide', visible: false, opacity: 45 },
]

function App() {
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
                className={item.id === 'pencil' ? 'tool-button active' : 'tool-button'}
                type="button"
                key={item.id}
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
              <h2>32 x 32 sprite</h2>
            </div>
            <div className="stage-controls">
              <button type="button" className="chip active">
                <Grid3X3 size={16} />
                Grid
              </button>
              <button type="button" className="chip">100%</button>
            </div>
          </div>
          <div className="canvas-wrap">
            <div className="mock-canvas" role="img" aria-label="Empty pixel art canvas preview">
              {Array.from({ length: 16 }).map((_, index) => (
                <span key={index} className={index % 5 === 0 ? 'pixel lit' : 'pixel'} />
              ))}
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
              <span style={{ backgroundColor: '#fbf236' }} />
              <strong>#fbf236</strong>
            </div>
            <div className="palette-grid">
              {palettePreview.map((color) => (
                <button
                  type="button"
                  key={color}
                  className="swatch"
                  style={{ backgroundColor: color }}
                  aria-label={`Select ${color}`}
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
              {layerPreview.map((layer) => (
                <div className="layer-row" key={layer.name}>
                  {layer.visible ? <Eye size={17} /> : <EyeOff size={17} />}
                  <span>{layer.name}</span>
                  <small>{layer.opacity}%</small>
                </div>
              ))}
            </div>
            <button type="button" className="secondary-button">
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
        {Array.from({ length: 4 }).map((_, index) => (
          <button type="button" className="frame-thumb" key={index}>
            Frame {index + 1}
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
