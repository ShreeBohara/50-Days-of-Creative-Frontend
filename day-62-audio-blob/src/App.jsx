import { useEffect, useMemo, useState } from 'react'
import Scene from './scene/Scene.jsx'
import Fallback2D from './Fallback2D.jsx'
import Controls from './ui/Controls.jsx'
import SpectrumStrip from './ui/SpectrumStrip.jsx'
import { enterSynthMode, enterFileMode } from './audio/inputs.js'
import './App.css'

const dragHasFiles = (e) => e.dataTransfer?.types?.includes('Files')

function detectWebGL() {
  // ?force2d=1 lets anyone (and QA) exercise the fallback deliberately
  if (new URLSearchParams(window.location.search).has('force2d')) return false
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [glOk, setGlOk] = useState(detectWebGL)

  // coarse pointer or a small screen → lighter geometry, no reflector
  const tier = useMemo(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const small = Math.min(window.screen.width, window.screen.height) < 768
    return coarse || small ? 'mobile' : 'desktop'
  }, [])

  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const begin = () => {
    // must happen inside the click: browsers gate AudioContext on a gesture
    enterSynthMode()
    setRunning(true)
  }

  // whole-viewport drop target: drag an mp3 anywhere to feed the blob
  useEffect(() => {
    let depth = 0
    const enter = (e) => {
      if (!dragHasFiles(e)) return
      e.preventDefault()
      depth += 1
      setDragging(true)
    }
    const over = (e) => {
      if (dragHasFiles(e)) e.preventDefault()
    }
    const leave = (e) => {
      if (!dragHasFiles(e)) return
      depth -= 1
      if (depth <= 0) setDragging(false)
    }
    const drop = (e) => {
      if (!dragHasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) {
        enterFileMode(file).then((ok) => {
          if (ok) setRunning(true)
        })
      }
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [])

  return (
    <div className="stage">
      {glOk ? (
        <Scene
          tier={tier}
          reducedMotion={reducedMotion}
          onGlLost={() => setGlOk(false)}
        />
      ) : (
        <Fallback2D />
      )}
      <div className="vignette" />
      {!glOk && <span className="fallback-badge">flat mode — webgl unavailable</span>}
      <header className="chrome chrome-top">
        <div>
          <h1 className="wordmark">RESONANCE</h1>
          <p className="tagline">a blob that hears</p>
        </div>
        <span className="day-badge">DAY 62 / 65</span>
      </header>
      {running ? (
        <Controls />
      ) : (
        <button className="start-overlay" onClick={begin}>
          <span className="start-ring">▶</span>
          <span className="start-label">press play — the blob is listening</span>
        </button>
      )}
      <SpectrumStrip />
      {dragging && (
        <div className="dropzone">
          <p className="dropzone-title">drop the track</p>
          <p className="dropzone-hint">mp3 · wav · ogg · m4a — it loops</p>
        </div>
      )}
    </div>
  )
}
