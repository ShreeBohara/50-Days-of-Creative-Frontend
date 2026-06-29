import { useMemo } from 'react'
import StageView from './components/StageView'
import type { ViewOptions } from './components/MapCanvas'
import { createDefaultParams } from './domain/defaults'
import './App.css'

// The control rail, collection, blend lab and export toolbar are wired in over
// the following commits; for now the studio charts the default world.
export default function App() {
  const params = useMemo(() => createDefaultParams(), [])
  const view: ViewOptions = { contours: true, rivers: true, labels: true, graticule: true }

  return (
    <div className="studio">
      <header className="studio__head">
        <div className="studio__brand">
          <span className="eyebrow">50 Days of Creative Frontend · Day 44</span>
          <h1 className="studio__title">MERIDIAN</h1>
          <p className="studio__tag">Procedural Cartographer</p>
        </div>
      </header>

      <main className="studio__body">
        <section className="stage-col" aria-label="Chart stage">
          <StageView params={params} view={view} reducedMotion={false} drawKey={0} />
        </section>
      </main>

      <footer className="studio__foot">
        <span>MERIDIAN</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
      </footer>
    </div>
  )
}
