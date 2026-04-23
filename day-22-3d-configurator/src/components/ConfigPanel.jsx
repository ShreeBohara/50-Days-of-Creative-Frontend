/**
 * ConfigPanel.jsx — Glassmorphism configurator for sneaker customization
 * Manages: part selection, color swatches, material toggles, camera presets, screenshot
 */
import { PART_NAMES, DEFAULT_COLORS } from './SneakerModel'
import { CAMERA_PRESETS } from './CameraRig'
import './ConfigPanel.css'

const PRESET_COLORS = [
  { name: 'White', hex: '#f0f0f0' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Fire Red', hex: '#e84545' },
  { name: 'Ocean', hex: '#2d7dd2' },
  { name: 'Forest', hex: '#2a9d5c' },
  { name: 'Gold', hex: '#ffd700' },
  { name: 'Purple', hex: '#7c4dff' },
  { name: 'Coral', hex: '#ff6b6b' },
]

const MATERIALS = ['matte', 'glossy', 'metallic']

export default function ConfigPanel({
  selectedPart,
  onSelectPart,
  partColors,
  onColorChange,
  partMaterials,
  onMaterialChange,
  cameraPreset,
  onCameraPreset,
  onScreenshot,
}) {
  const currentColor = partColors[selectedPart] || DEFAULT_COLORS[selectedPart] || '#ffffff'
  const currentMaterial = partMaterials[selectedPart] || 'matte'

  return (
    <aside className="config-panel" id="config-panel">
      {/* Mobile pull tab */}
      <div className="panel-pull-tab" />

      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">Configure</div>
        <div className="panel-subtitle">
          {selectedPart ? selectedPart.charAt(0).toUpperCase() + selectedPart.slice(1) : 'Select a part'}
        </div>
      </div>

      {/* Parts list */}
      <div className="panel-section">
        <div className="section-label">Parts</div>
        <div className="parts-list">
          {PART_NAMES.map((part) => (
            <button
              key={part}
              className={`part-btn ${selectedPart === part ? 'active' : ''}`}
              onClick={() => onSelectPart(part)}
              id={`part-btn-${part}`}
            >
              <span
                className="part-color-dot"
                style={{ background: partColors[part] || DEFAULT_COLORS[part] }}
              />
              <span className="part-name">{part}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-divider" />

      {/* Color swatches */}
      <div className="panel-section">
        <div className="section-label">Color</div>
        <div className="swatch-grid">
          {PRESET_COLORS.map(({ name, hex }) => (
            <button
              key={hex}
              className={`swatch ${currentColor === hex ? 'active' : ''}`}
              style={{ background: hex }}
              title={name}
              onClick={() => selectedPart && onColorChange(selectedPart, hex)}
              id={`swatch-${name.toLowerCase().replace(/\s/g, '-')}`}
            />
          ))}
        </div>
        <div className="custom-color-row">
          <input
            type="color"
            className="custom-color-input"
            value={currentColor}
            onChange={(e) => selectedPart && onColorChange(selectedPart, e.target.value)}
            id="custom-color-picker"
          />
          <input
            type="text"
            className="custom-hex-input"
            value={currentColor}
            onChange={(e) => {
              const val = e.target.value
              if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                selectedPart && onColorChange(selectedPart, val)
              }
            }}
            placeholder="#000000"
            id="hex-input"
          />
        </div>
      </div>

      <div className="panel-divider" />

      {/* Material toggle */}
      <div className="panel-section">
        <div className="section-label">Material</div>
        <div className="material-toggles">
          {MATERIALS.map((mat) => (
            <button
              key={mat}
              className={`material-btn ${currentMaterial === mat ? 'active' : ''}`}
              onClick={() => selectedPart && onMaterialChange(selectedPart, mat)}
              id={`material-${mat}`}
            >
              <span className="material-icon">
                {mat === 'matte' ? '◉' : mat === 'glossy' ? '◈' : '◆'}
              </span>
              {mat.charAt(0).toUpperCase() + mat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-divider" />

      {/* Camera presets */}
      <div className="panel-section">
        <div className="section-label">Camera Angle</div>
        <div className="camera-presets">
          {Object.entries(CAMERA_PRESETS).map(([key, { label }]) => (
            <button
              key={key}
              className={`camera-btn ${cameraPreset === key ? 'active' : ''}`}
              onClick={() => onCameraPreset(key)}
              id={`camera-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-divider" />

      {/* Actions */}
      <div className="action-row">
        <button className="action-btn" onClick={onScreenshot} id="screenshot-btn">
          📸 Screenshot
        </button>
      </div>
    </aside>
  )
}
