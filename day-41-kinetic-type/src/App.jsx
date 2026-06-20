import { useEffect, useRef, useState } from 'react'
import Stage from './components/Stage.jsx'
import { useKineticEngine } from './hooks/useKineticEngine.js'
import { useReducedMotion } from './hooks/useReducedMotion.js'
import { getBehavior } from './lib/behaviors.js'
import './App.css'

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

function Hud({ headline }) {
  return (
    <footer className="hud" aria-hidden="true">
      <span className="hud-cell">
        <i>font</i> Fraunces Variable
      </span>
      <span className="hud-cell">
        <i>axes</i> wght · opsz · SOFT · WONK
      </span>
      <span className="hud-cell">
        <i>glyphs</i> {Array.from(headline).filter((c) => c.trim()).length}
      </span>
      <span className="hud-cell">
        <i>behavior</i> magnet
      </span>
      <span className="hud-cell hud-sig">50 Days of Creative Frontend</span>
    </footer>
  )
}

export default function App() {
  const [headline, setHeadline] = useState('Bend the type')
  const stageRef = useRef(null)
  const reducedMotion = useReducedMotion()

  // Refs the rAF engine reads each frame; UI controls mutate them in place.
  const behaviorRef = useRef(getBehavior('magnet'))
  const paramsRef = useRef({ radius: 300, intensity: 1, baseWeight: 340 })

  const { registerGlyph } = useKineticEngine({
    behaviorRef,
    paramsRef,
    reducedMotion,
  })

  // DEV-only console helper for previewing behaviors before the controls UI.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__forge = {
      setBehavior: (id) => (behaviorRef.current = getBehavior(id)),
      params: paramsRef.current,
    }
  }, [])

  return (
    <div className="studio">
      <Masthead />
      <Stage
        headline={headline}
        onHeadlineChange={setHeadline}
        registerGlyph={registerGlyph}
        stageRef={stageRef}
      />
      <Hud headline={headline} />
    </div>
  )
}
