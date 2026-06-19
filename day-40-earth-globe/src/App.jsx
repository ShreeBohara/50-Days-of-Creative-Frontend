import { Canvas } from '@react-three/fiber'
import { Activity, Globe2, RadioTower, Search, SlidersHorizontal, SunMedium } from 'lucide-react'
import { Suspense, useState } from 'react'
import GlobeScene from './components/GlobeScene'
import usePrefersReducedMotion from './hooks/usePrefersReducedMotion'
import './App.css'

const DATASETS = ['Flight Routes', 'Trade Volume', 'Internet Traffic']

function App() {
  const [sceneReady, setSceneReady] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState(18)
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <main className="app-shell">
      <section className="globe-stage" aria-label="Interactive Earth globe viewport">
        <Canvas
          camera={{ position: [0, 0.6, 4.4], fov: 42, near: 0.1, far: 160 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={() => setSceneReady(true)}
        >
          <Suspense fallback={null}>
            <GlobeScene reducedMotion={prefersReducedMotion} timeOfDay={timeOfDay} />
          </Suspense>
        </Canvas>
        <div className={`loading-overlay ${sceneReady ? 'is-hidden' : ''}`} aria-live="polite">
          <Globe2 size={16} strokeWidth={1.8} aria-hidden="true" />
          Initializing orbital dataset
        </div>
      </section>

      <aside className="hud-panel" aria-label="Earth globe controls">
        <header className="hud-header">
          <p>Day 40</p>
          <h1>Earth Globe</h1>
          <span>Global route telemetry live</span>
        </header>

        <form className="search-shell" role="search">
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          <label className="sr-only" htmlFor="city-search">
            Search city
          </label>
          <input id="city-search" type="search" placeholder="Search city" />
        </form>

        <section className="hud-section" aria-labelledby="dataset-label">
          <div className="section-heading">
            <RadioTower size={16} aria-hidden="true" />
            <h2 id="dataset-label">Dataset</h2>
          </div>
          <div className="segmented-control" role="group" aria-label="Dataset">
            {DATASETS.map((dataset, index) => (
              <button className={index === 0 ? 'is-active' : ''} type="button" key={dataset}>
                {dataset}
              </button>
            ))}
          </div>
        </section>

        <section className="hud-section" aria-labelledby="control-label">
          <div className="section-heading">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <h2 id="control-label">Controls</h2>
          </div>
          <label className="toggle-row">
            <span>Heatmap</span>
            <input type="checkbox" />
          </label>
          <label className="slider-row">
            <span>
              <SunMedium size={15} aria-hidden="true" />
              Local Time
            </span>
            <input
              type="range"
              min="0"
              max="24"
              value={timeOfDay}
              onChange={(event) => setTimeOfDay(Number(event.target.value))}
              aria-label="Local Time"
            />
          </label>
        </section>

        <section className="selected-node" aria-labelledby="selected-node-label">
          <div className="section-heading">
            <Activity size={16} aria-hidden="true" />
            <h2 id="selected-node-label">Selected Node</h2>
          </div>
          <strong>New York</strong>
          <span>United States · 40.71, -74.01</span>
          <dl>
            <div>
              <dt>Population</dt>
              <dd>18.8M</dd>
            </div>
            <div>
              <dt>Signal</dt>
              <dd>92%</dd>
            </div>
          </dl>
        </section>
      </aside>

      <footer className="mission-strip" aria-label="Mission telemetry">
        <div>
          <span>Status</span>
          <strong>Orbit stable</strong>
        </div>
        <div>
          <span>Nodes</span>
          <strong>30 cities</strong>
        </div>
        <div>
          <span>Motion</span>
          <strong>{prefersReducedMotion ? 'Reduced' : 'Adaptive'}</strong>
        </div>
      </footer>
    </main>
  )
}

export default App
