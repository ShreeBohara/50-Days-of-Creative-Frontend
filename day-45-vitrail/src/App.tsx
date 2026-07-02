import { useMemo } from 'react'
import StageView from './components/StageView'
import { composeWindow } from './domain/compose'
import { defaultGenome } from './domain/genome'
import { useReducedMotion } from './hooks/useReducedMotion'
import './App.css'

export default function App() {
  const reducedMotion = useReducedMotion()
  const spec = useMemo(() => composeWindow(defaultGenome()), [])

  return (
    <div className="studio">
      <header className="studio__header">
        <div className="studio__title">
          <span className="studio__day">Day 45 · Atelier</span>
          <h1 className="studio__wordmark">VITRAIL</h1>
          <p className="studio__tagline">Procedural stained glass, grown from a seed</p>
        </div>
      </header>

      <main className="studio__body">
        <section className="stage-col" aria-label="Window stage">
          <StageView spec={spec} reducedMotion={reducedMotion} drawKey={0} />
        </section>
      </main>

      <footer className="studio__foot">
        <span>VITRAIL</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
      </footer>
    </div>
  )
}
