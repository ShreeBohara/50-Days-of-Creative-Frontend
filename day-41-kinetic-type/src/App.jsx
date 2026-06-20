import { useEffect, useRef, useState } from 'react'
import Stage from './components/Stage.jsx'
import ControlPanel from './components/ControlPanel.jsx'
import { useKineticEngine } from './hooks/useKineticEngine.js'
import { useReducedMotion } from './hooks/useReducedMotion.js'
import { getBehavior } from './lib/behaviors.js'
import './App.css'

const DEFAULT_PARAMS = { radius: 300, intensity: 1, baseWeight: 340, size: 1 }

function Masthead() {
  return (
    <header className="masthead">
      <div className="wordmark" aria-label="TYPEFORGE">
        <span>TYPE</span>
        <span className="wordmark-mark" aria-hidden="true" />
        <span>FORGE</span>
      </div>
      <p className="masthead-sub">Kinetic Type Studio</p>
      <div className="masthead-meta">
        <span className="status">
          <span className="status-dot" aria-hidden="true" />
          LIVE
        </span>
        <span className="masthead-no">No.41</span>
      </div>
    </header>
  )
}

function Hud({ headline, behaviorId, params }) {
  const behavior = getBehavior(behaviorId)
  const glyphCount = Array.from(headline).filter((c) => c.trim()).length
  return (
    <footer className="hud" aria-hidden="true">
      <span className="hud-cell">
        <i>font</i> Fraunces Variable
      </span>
      <span className="hud-cell">
        <i>behavior</i> {behavior.label}
      </span>
      <span className="hud-cell">
        <i>field</i> {Math.round(params.radius)}px
      </span>
      <span className="hud-cell">
        <i>force</i> {params.intensity.toFixed(2)}×
      </span>
      <span className="hud-cell">
        <i>glyphs</i> {glyphCount}
      </span>
      <span className="hud-cell hud-sig">50 Days of Creative Frontend</span>
    </footer>
  )
}

export default function App() {
  const [headline, setHeadline] = useState('Bend the type')
  const [behaviorId, setBehaviorId] = useState('magnet')
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const stageRef = useRef(null)
  const reducedMotion = useReducedMotion()

  // Refs the rAF engine reads each frame; kept in sync with React state.
  const behaviorRef = useRef(getBehavior(behaviorId))
  const paramsRef = useRef(params)

  const { registerGlyph, requestMeasure } = useKineticEngine({
    behaviorRef,
    paramsRef,
    reducedMotion,
  })

  useEffect(() => {
    behaviorRef.current = getBehavior(behaviorId)
  }, [behaviorId])

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Headline size changes layout — re-measure rest positions.
  useEffect(() => {
    requestMeasure()
  }, [params.size, requestMeasure])

  // DEV-only console helper for previewing behaviors.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__forge = {
      setBehavior: (id) => setBehaviorId(id),
      params: paramsRef.current,
    }
  }, [])

  return (
    <div className="studio" style={{ '--hsize': params.size }}>
      <Masthead />
      <div className="workbench">
        <Stage
          headline={headline}
          onHeadlineChange={setHeadline}
          registerGlyph={registerGlyph}
          stageRef={stageRef}
        />
        <ControlPanel
          behaviorId={behaviorId}
          onBehavior={setBehaviorId}
          params={params}
          onParams={setParams}
        />
      </div>
      <Hud headline={headline} behaviorId={behaviorId} params={params} />
    </div>
  )
}
