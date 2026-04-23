/**
 * Day 22 — 3D Product Configurator
 * Main application shell — Scene + ConfigPanel + state
 */
import { useState, useCallback } from 'react'
import Scene from './components/Scene'
import SneakerModel, { DEFAULT_COLORS } from './components/SneakerModel'
import ConfigPanel from './components/ConfigPanel'

export default function App() {
  const [selectedPart, setSelectedPart] = useState('upper')
  const [partColors, setPartColors] = useState({ ...DEFAULT_COLORS })
  const [partMaterials, setPartMaterials] = useState({})
  const [cameraPreset, setCameraPreset] = useState('quarter')

  const handleColorChange = useCallback((part, color) => {
    setPartColors((prev) => ({ ...prev, [part]: color }))
  }, [])

  const handleMaterialChange = useCallback((part, material) => {
    setPartMaterials((prev) => ({ ...prev, [part]: material }))
  }, [])

  const handlePartClick = useCallback((part) => {
    setSelectedPart(part)
  }, [])

  return (
    <div className="app-shell" style={{ width: '100vw', height: '100vh', background: 'var(--bg-dark)' }}>
      <Scene cameraPreset={cameraPreset}>
        <SneakerModel
          partColors={partColors}
          partMaterials={partMaterials}
          selectedPart={selectedPart}
          onPartClick={handlePartClick}
        />
      </Scene>

      <ConfigPanel
        selectedPart={selectedPart}
        onSelectPart={setSelectedPart}
        partColors={partColors}
        onColorChange={handleColorChange}
        partMaterials={partMaterials}
        onMaterialChange={handleMaterialChange}
        cameraPreset={cameraPreset}
        onCameraPreset={setCameraPreset}
      />
    </div>
  )
}
