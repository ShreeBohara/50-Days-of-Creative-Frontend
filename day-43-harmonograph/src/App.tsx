import AppHeader from './components/AppHeader'
import ControlRail from './components/ControlRail'
import StageView from './components/StageView'
import { getPalette } from './domain/palettes'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useStudioStore } from './store/useStudioStore'
import './App.css'

export default function App() {
  const reducedMotion = useReducedMotion()
  const params = useStudioStore((s) => s.params)
  const palette = getPalette(useStudioStore((s) => s.paletteId))
  const lineWidth = useStudioStore((s) => s.lineWidth)
  const glow = useStudioStore((s) => s.glow)
  const drawKey = useStudioStore((s) => s.drawKey)
  const replay = useStudioStore((s) => s.replay)

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
            <StageView
              params={params}
              palette={palette}
              lineWidth={lineWidth}
              glow={glow}
              drawKey={drawKey}
              reducedMotion={reducedMotion}
              onReplay={replay}
            />
          </div>
        </section>

        <ControlRail />
      </div>

      <footer className="studio__foot">
        <span>PENDULA</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
      </footer>
    </div>
  )
}
