import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo, useState } from 'react'
import ControlPanel from './components/ControlPanel'
import PlanetScene from './components/PlanetScene'
import { DEFAULT_PLANET_SETTINGS, randomPlanetSettings } from './data/planetConfig'
import usePrefersReducedMotion from './hooks/usePrefersReducedMotion'
import './App.css'

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_PLANET_SETTINGS)
  const [sceneReady, setSceneReady] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const sceneSettings = useMemo(
    () => ({
      ...settings,
      rotationSpeed: prefersReducedMotion ? 0 : settings.rotationSpeed,
    }),
    [prefersReducedMotion, settings],
  )

  const handleSettingChange = (key, value) => {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }))
  }

  return (
    <main className="app-shell">
      <section className="scene-stage" aria-label="Procedural planet viewport">
        <Canvas
          camera={{ position: [0, 0.45, 5.2], fov: 42, near: 0.1, far: 160 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={() => setSceneReady(true)}
        >
          <Suspense fallback={null}>
            <PlanetScene settings={sceneSettings} />
          </Suspense>
        </Canvas>
        <div className={`loading-overlay ${sceneReady ? 'is-hidden' : ''}`} aria-live="polite">
          <span />
          Initializing shader field
        </div>
      </section>

      <aside className="hud-panel" aria-label="Planet generator controls">
        <div className="hud-header">
          <p>Day 34</p>
          <h1>Procedural Planet</h1>
          <span>Shader terrain lab online</span>
        </div>
        <div className="telemetry-strip" aria-label="Scene telemetry">
          <span>128 sphere</span>
          <span>{prefersReducedMotion ? 'Motion reduced' : 'Orbit live'}</span>
          <span>{Math.round(settings.cloudDensity * 100)}% cloud</span>
        </div>
        <div className="hud-readout" aria-label="Current sun position">
          <span>Sun azimuth</span>
          <strong>{settings.sunAzimuth}°</strong>
          <span>Elevation</span>
          <strong>{settings.sunElevation}°</strong>
        </div>
        <ControlPanel
          settings={settings}
          onSettingChange={handleSettingChange}
          onRandomize={() => setSettings(randomPlanetSettings())}
          onReset={() => setSettings(DEFAULT_PLANET_SETTINGS)}
        />
      </aside>
    </main>
  )
}
