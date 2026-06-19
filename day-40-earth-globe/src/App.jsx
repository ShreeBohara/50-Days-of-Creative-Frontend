import { Canvas } from '@react-three/fiber'
import { Activity, Globe2, RadioTower, Search, SlidersHorizontal, SunMedium } from 'lucide-react'
import { Suspense, useMemo, useState } from 'react'
import GlobeScene from './components/GlobeScene'
import { countryByIso } from './data/countries'
import { datasetLabels, datasetKeys } from './data/routes'
import { findCityMatches, getCityById, getCityRoutes, summarizeDataset } from './utils/data'
import { formatPopulation } from './utils/geo'
import usePrefersReducedMotion from './hooks/usePrefersReducedMotion'
import './App.css'

function App() {
  const [datasetKey, setDatasetKey] = useState('flightRoutes')
  const [focusCityId, setFocusCityId] = useState('new-york')
  const [sceneReady, setSceneReady] = useState(false)
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCityId, setSelectedCityId] = useState('new-york')
  const [selectedCountryIso, setSelectedCountryIso] = useState('USA')
  const [timeOfDay, setTimeOfDay] = useState(18)
  const prefersReducedMotion = usePrefersReducedMotion()
  const datasetSummary = summarizeDataset(datasetKey)
  const focusCity = getCityById(focusCityId)
  const searchMatches = useMemo(() => findCityMatches(searchQuery), [searchQuery])
  const selectedCity = getCityById(selectedCityId)
  const selectedCityRoutes = getCityRoutes(selectedCityId, datasetKey)
  const selectedCountry = countryByIso.get(selectedCountryIso)

  const handleCitySelect = (cityId) => {
    setSelectedCityId(cityId)
    setFocusCityId(cityId)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const firstMatch = searchMatches[0]
    if (!firstMatch) return

    handleCitySelect(firstMatch.id)
  }

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
            <GlobeScene
              datasetKey={datasetKey}
              focusCity={focusCity}
              heatmapEnabled={heatmapEnabled}
              onSelectCountry={setSelectedCountryIso}
              onSelectCity={handleCitySelect}
              reducedMotion={prefersReducedMotion}
              selectedCountryIso={selectedCountryIso}
              selectedCityId={selectedCityId}
              timeOfDay={timeOfDay}
            />
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

        <div className="search-block">
          <form className="search-shell" role="search" onSubmit={handleSearchSubmit}>
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            <label className="sr-only" htmlFor="city-search">
              Search city
            </label>
            <input
              autoComplete="off"
              id="city-search"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search city"
              type="search"
              value={searchQuery}
            />
          </form>
          {searchMatches.length > 0 && (
            <div className="search-results" aria-label="City search results">
              {searchMatches.map((city) => (
                <button key={city.id} onClick={() => handleCitySelect(city.id)} type="button">
                  <span>{city.name}</span>
                  <small>{city.country}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="hud-section" aria-labelledby="dataset-label">
          <div className="section-heading">
            <RadioTower size={16} aria-hidden="true" />
            <h2 id="dataset-label">Dataset</h2>
          </div>
          <div className="segmented-control" role="group" aria-label="Dataset">
            {datasetKeys.map((key) => (
              <button
                className={datasetKey === key ? 'is-active' : ''}
                onClick={() => setDatasetKey(key)}
                type="button"
                key={key}
              >
                {datasetLabels[key]}
              </button>
            ))}
          </div>
          <dl className="route-summary">
            <div>
              <dt>Routes</dt>
              <dd>{datasetSummary.routeCount}</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{datasetSummary.totalVolume}</dd>
            </div>
            <div>
              <dt>Intensity</dt>
              <dd>{Math.round(datasetSummary.avgIntensity * 100)}%</dd>
            </div>
          </dl>
        </section>

        <section className="hud-section" aria-labelledby="control-label">
          <div className="section-heading">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <h2 id="control-label">Controls</h2>
          </div>
          <label className="toggle-row">
            <span>Heatmap</span>
            <input
              checked={heatmapEnabled}
              onChange={(event) => setHeatmapEnabled(event.target.checked)}
              type="checkbox"
            />
          </label>
          <label className="slider-row">
            <span>
              <SunMedium size={15} aria-hidden="true" />
              Local Time - {String(timeOfDay).padStart(2, '0')}:00
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
          <strong>{selectedCity.name}</strong>
          <span>
            {selectedCity.country} - {selectedCity.lat.toFixed(2)}, {selectedCity.lng.toFixed(2)}
          </span>
          <dl>
            <div>
              <dt>Population</dt>
              <dd>{formatPopulation(selectedCity.population)}</dd>
            </div>
            <div>
              <dt>Signal</dt>
              <dd>{selectedCity.stats.signal}%</dd>
            </div>
          </dl>
          {selectedCountry && (
            <div className="country-readout">
              <span>Country Region</span>
              <strong>{selectedCountry.name}</strong>
              <small>
                Heat {selectedCountry.score} - GDP {selectedCountry.gdpIndex} - Population{' '}
                {selectedCountry.populationIndex}
              </small>
            </div>
          )}
          <div className="route-list">
            <span>Linked Routes</span>
            {selectedCityRoutes.length === 0 ? (
              <small>No active links in this dataset</small>
            ) : (
              selectedCityRoutes.slice(0, 3).map((route) => (
                <small key={`${route.from}-${route.to}-${route.label}`}>
                  {getCityById(route.from).name} -&gt; {getCityById(route.to).name} -{' '}
                  {Math.round(route.intensity * 100)}%
                </small>
              ))
            )}
          </div>
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
