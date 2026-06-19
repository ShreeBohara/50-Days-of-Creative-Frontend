import { Activity, Globe2, RadioTower, Search, SlidersHorizontal, SunMedium } from 'lucide-react'
import './App.css'

const DATASETS = ['Flight Routes', 'Trade Volume', 'Internet Traffic']

function App() {
  return (
    <main className="app-shell">
      <section className="globe-stage" aria-label="Interactive Earth globe viewport">
        <div className="starfield" aria-hidden="true" />
        <div className="globe-placeholder" aria-hidden="true">
          <span className="globe-orbit globe-orbit--wide" />
          <span className="globe-orbit globe-orbit--tilt" />
          <Globe2 size={96} strokeWidth={1.1} />
        </div>
        <div className="loading-overlay" aria-live="polite">
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
            <input type="range" min="0" max="24" defaultValue="18" />
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
          <strong>Adaptive</strong>
        </div>
      </footer>
    </main>
  )
}

export default App
