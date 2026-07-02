import { useMemo } from 'react'
import AppHeader from './components/AppHeader'
import ControlRail from './components/ControlRail'
import ExportToolbar from './components/ExportToolbar'
import LiveAnnouncer from './components/LiveAnnouncer'
import ReadoutPanel from './components/ReadoutPanel'
import StageView from './components/StageView'
import { composeWindow } from './domain/compose'
import { useHashFigure } from './hooks/useHashFigure'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useStudioStore } from './store/useStudioStore'
import './App.css'

export default function App() {
  useHashFigure()
  useKeyboardShortcuts()
  const reducedMotion = useReducedMotion()
  const genome = useStudioStore((s) => s.genome)
  const drawKey = useStudioStore((s) => s.drawKey)

  const spec = useMemo(() => composeWindow(genome), [genome])

  return (
    <div className="studio">
      <AppHeader />

      <main className="studio__body">
        <section className="stage-col" aria-label="Window stage">
          <StageView spec={spec} reducedMotion={reducedMotion} drawKey={drawKey} />
          <ExportToolbar spec={spec} />
          <ReadoutPanel spec={spec} />
        </section>

        <ControlRail />
      </main>

      <footer className="studio__foot">
        <span>VITRAIL</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
        <span className="studio__foot-keys" aria-hidden="true">
          Space new seed · R randomize · M mutate
        </span>
      </footer>

      <LiveAnnouncer />
    </div>
  )
}
