import { useMemo } from 'react'
import AppHeader from './components/AppHeader'
import ControlRail from './components/ControlRail'
import ExportToolbar from './components/ExportToolbar'
import ReadoutPanel from './components/ReadoutPanel'
import StageView from './components/StageView'
import { composeWorld } from './domain/compose'
import { useHashFigure } from './hooks/useHashFigure'
import { useStudioStore } from './store/useStudioStore'
import './App.css'

export default function App() {
  useHashFigure()
  const params = useStudioStore((s) => s.params)
  const view = useStudioStore((s) => s.view)
  const drawKey = useStudioStore((s) => s.drawKey)

  const map = useMemo(() => composeWorld(params), [params])

  return (
    <div className="studio">
      <AppHeader />

      <main className="studio__body">
        <section className="stage-col" aria-label="Chart stage">
          <StageView map={map} view={view} reducedMotion={false} drawKey={drawKey} />
          <ExportToolbar params={params} title={map.title} />
          <ReadoutPanel map={map} />
        </section>

        <ControlRail />
      </main>

      <footer className="studio__foot">
        <span>MERIDIAN</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
        <span className="studio__foot-keys" aria-hidden="true">
          Space new seed · R randomize · M mutate
        </span>
      </footer>
    </div>
  )
}
