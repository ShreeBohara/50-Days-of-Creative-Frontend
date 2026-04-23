/**
 * Day 22 — 3D Product Configurator
 * Main application shell — Scene + ConfigPanel + full state management
 */
import { useState, useCallback, useRef, Suspense } from 'react'
import Scene from './components/Scene'
import SneakerModel, { DEFAULT_COLORS } from './components/SneakerModel'
import ConfigPanel from './components/ConfigPanel'
import Loader from './components/Loader'

export default function App() {
  const [selectedPart, setSelectedPart] = useState('upper')
  const [partColors, setPartColors] = useState({ ...DEFAULT_COLORS })
  const [partMaterials, setPartMaterials] = useState({})
  const [cameraPreset, setCameraPreset] = useState('quarter')
  const [flashVisible, setFlashVisible] = useState(false)
  const canvasContainerRef = useRef(null)

  const handleColorChange = useCallback((part, color) => {
    setPartColors((prev) => ({ ...prev, [part]: color }))
  }, [])

  const handleMaterialChange = useCallback((part, material) => {
    setPartMaterials((prev) => ({ ...prev, [part]: material }))
  }, [])

  const handlePartClick = useCallback((part) => {
    setSelectedPart(part)
  }, [])

  /** Capture the R3F canvas as a PNG and trigger download */
  const handleScreenshot = useCallback(() => {
    const canvas = canvasContainerRef.current?.querySelector('canvas')
    if (!canvas) return

    // Flash effect
    setFlashVisible(true)
    setTimeout(() => setFlashVisible(false), 300)

    // Capture
    const dataUrl = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `sneaker-config-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }, [])

  return (
    <div className="app-shell" style={{ width: '100vw', height: '100vh', background: 'var(--bg-dark)' }}>
      {/* Canvas container — ref for screenshot access */}
      <div ref={canvasContainerRef} style={{ width: '100%', height: '100%' }}>
        <Scene cameraPreset={cameraPreset}>
          <Suspense fallback={null}>
            <SneakerModel
              partColors={partColors}
              partMaterials={partMaterials}
              selectedPart={selectedPart}
              onPartClick={handlePartClick}
            />
          </Suspense>
        </Scene>
      </div>

      {/* Loading screen overlay */}
      <Loader />

      {/* Camera flash overlay */}
      {flashVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'white',
            opacity: 0.7,
            zIndex: 100,
            pointerEvents: 'none',
            animation: 'flashFade 0.3s ease-out forwards',
          }}
        />
      )}

      <ConfigPanel
        selectedPart={selectedPart}
        onSelectPart={setSelectedPart}
        partColors={partColors}
        onColorChange={handleColorChange}
        partMaterials={partMaterials}
        onMaterialChange={handleMaterialChange}
        cameraPreset={cameraPreset}
        onCameraPreset={setCameraPreset}
        onScreenshot={handleScreenshot}
      />
    </div>
  )
}
