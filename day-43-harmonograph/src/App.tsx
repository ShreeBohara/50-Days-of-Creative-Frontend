import { useMemo } from 'react'
import AppHeader from './components/AppHeader'
import StageView from './components/StageView'
import { createDefaultParams } from './domain/defaults'
import { DEFAULT_PALETTE } from './domain/palettes'
import './App.css'

export default function App() {
  const params = useMemo(() => createDefaultParams(), [])

  return (
    <div className="studio">
      <AppHeader />

      <div className="studio__body">
        <section className="stage-col" aria-label="Plotting stage">
          <div className="stage-frame">
            <div className="stage-frame__corner stage-frame__corner--tl" />
            <div className="stage-frame__corner stage-frame__corner--tr" />
            <div className="stage-frame__corner stage-frame__corner--bl" />
            <div className="stage-frame__corner stage-frame__corner--br" />
            <StageView params={params} palette={DEFAULT_PALETTE} lineWidth={2.4} glow={1} />
          </div>
        </section>

        <aside className="panel-col" aria-label="Controls">
          <div className="panel">
            <span className="eyebrow">controls</span>
          </div>
        </aside>
      </div>

      <footer className="studio__foot">
        <span>PENDULA</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
      </footer>
    </div>
  )
}
